<?php
ob_start();
include "conn.php";

/* ================= AJAX ================= */

if(isset($_GET['action'])){
    header('Content-Type: application/json');

    // Search Family
    if($_GET['action']=="searchFamily"){
        $q="%".($_GET['q']??"")."%";
        $stmt=$conn->prepare("SELECT Family_Id,Family_Name,Native_Place FROM FAMILY WHERE Family_Name LIKE ? OR Native_Place LIKE ?");
        $stmt->bind_param("ss",$q,$q);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }

    // Load Members
    if($_GET['action']=="loadMembers"){
        $fid=intval($_GET['family']);
        $stmt=$conn->prepare("SELECT Person_Id,First_Name,Last_Name FROM PERSON WHERE Family_Id=?");
        $stmt->bind_param("i",$fid);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }

    // Load Person Details
    if($_GET['action']=="loadPerson"){
        $pid=intval($_GET['person']);
        $stmt=$conn->prepare("SELECT * FROM PERSON WHERE Person_Id=?");
        $stmt->bind_param("i",$pid);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_assoc());
        exit;
    }
}

require "Navbar.php";

/* ================= UPDATE PERSON ================= */

if(isset($_POST['update'])){

    $stmt=$conn->prepare("
        UPDATE PERSON SET
        First_Name=?, Last_Name=?, Gender=?, DOB=?, Phone_Number=?,
        Mobile_Number=?, Email=?, Original_Native=?, Current_Address=?,
        Gotra_Id=?, Panchang_Sudhi_Id=?, Vamsha_Id=?,
        Mane_Devru_Id=?, Kula_Devatha_Id=?, Pooja_Vruksha_Id=?
        WHERE Person_Id=?
    ");

    $stmt->bind_param("sssssssssiiiiiii",
        $_POST['first'],$_POST['last'],$_POST['gender'],$_POST['dob'],
        $_POST['phone'],$_POST['mobile'],$_POST['email'],
        $_POST['native'],$_POST['address'],
        $_POST['gotra'],$_POST['panchang'],$_POST['vamsha'],
        $_POST['mane_devru'],$_POST['kula_devatha'],$_POST['pooja_vruksha'],
        $_POST['person_id']
    );

    $stmt->execute();

    echo "<script>alert('Details Updated Successfully');location='Edit_Person.php';</script>";
    exit;
}

function loadOptions($conn,$t,$id,$name){
    $r=$conn->query("SELECT $id,$name FROM $t ORDER BY $name");
    while($x=$r->fetch_assoc())
        echo "<option value='{$x[$id]}'>{$x[$name]}</option>";
}
?>

<!DOCTYPE html>
<html>
<head>
<title>Edit Person</title>

<style>
body{background:#f4f7fb;font-family:Segoe UI}
.container{max-width:1000px;margin:40px auto;background:#fff;padding:30px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.12)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.full{grid-column:1/3}
input,select,button{padding:10px;border-radius:6px;border:1px solid #ccc;width:100%;margin:6px 0}
button{background:#1e90ff;color:white;font-weight:600;border:none;cursor:pointer}
.hidden{display:none}
.result{padding:8px;border:1px solid #ddd;border-radius:6px;margin:5px 0;cursor:pointer}
.selected-family{background:#e8f4ff;border:1px solid #1e90ff;padding:10px;border-radius:8px;color:#1e90ff;font-weight:600}
</style>
</head>

<body>

<div class="container">
<h2>Search Family and Edit Person Details</h2>

<input id="familySearch" placeholder="Search family name or native place">
<div id="familyResults"></div>

<select id="memberList" class="hidden"></select>

<form method="post" id="editForm" class="grid hidden">
<input type="hidden" name="person_id" id="person_id">

<input name="first" id="first" placeholder="First Name" required>
<input name="last" id="last" placeholder="Last Name">

<select name="gender" id="gender">
<option>Male</option>
<option>Female</option>
</select>

<input type="date" name="dob" id="dob">
<input name="phone" id="phone" placeholder="Phone">
<input name="mobile" id="mobile" placeholder="Mobile">
<input name="email" id="email" placeholder="Email">
<input name="native" id="native" placeholder="Native">
<input name="address" id="address" placeholder="Address" class="full">

<select name="gotra" id="gotra"><?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?></select>
<select name="panchang" id="panchang"><?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?></select>
<select name="vamsha" id="vamsha"><?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?></select>
<select name="mane_devru" id="mane_devru"><?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?></select>
<select name="kula_devatha" id="kula_devatha"><?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?></select>
<select name="pooja_vruksha" id="pooja_vruksha" class="full"><?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?></select>

<button name="update" class="full">Update Details</button>
</form>
</div>

<script>
const fs=document.getElementById("familySearch");
const fr=document.getElementById("familyResults");
const memberList=document.getElementById("memberList");
const form=document.getElementById("editForm");

fs.oninput=()=>{
 const q=fs.value.trim();
 if(!q){fr.innerHTML="";return;}
 fetch(`Edit_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
 .then(r=>r.json()).then(d=>{
   fr.innerHTML="";
   d.forEach(f=>{
     let x=document.createElement("div");
     x.className="result";
     x.textContent=`${f.Family_Name} (${f.Native_Place})`;
     x.onclick=()=>{
       fr.innerHTML=`<div class="selected-family">✔ ${f.Family_Name}</div>`;
       loadMembers(f.Family_Id);
     };
     fr.appendChild(x);
   });
 });
};

function loadMembers(fid){
 fetch(`Edit_Person.php?action=loadMembers&family=${fid}`)
 .then(r=>r.json()).then(d=>{
   memberList.innerHTML="";
   memberList.classList.remove("hidden");
   d.forEach(p=>{
     let o=document.createElement("option");
     o.value=p.Person_Id;
     o.textContent=p.First_Name+" "+p.Last_Name;
     memberList.appendChild(o);
   });
 });
}

memberList.onchange=()=>{
 fetch(`Edit_Person.php?action=loadPerson&person=${memberList.value}`)
 .then(r=>r.json()).then(p=>{
   document.getElementById("person_id").value=p.Person_Id;
   document.getElementById("first").value=p.First_Name;
   document.getElementById("last").value=p.Last_Name;
   document.getElementById("gender").value=p.Gender;
   document.getElementById("dob").value=p.DOB;
   document.getElementById("phone").value=p.Phone_Number;
   document.getElementById("mobile").value=p.Mobile_Number;
   document.getElementById("email").value=p.Email;
   document.getElementById("native").value=p.Original_Native;
   document.getElementById("address").value=p.Current_Address;
   document.getElementById("gotra").value=p.Gotra_Id;
   document.getElementById("panchang").value=p.Panchang_Sudhi_Id;
   document.getElementById("vamsha").value=p.Vamsha_Id;
   document.getElementById("mane_devru").value=p.Mane_Devru_Id;
   document.getElementById("kula_devatha").value=p.Kula_Devatha_Id;
   document.getElementById("pooja_vruksha").value=p.Pooja_Vruksha_Id;
   form.classList.remove("hidden");
 });
};
</script>

</body>
</html>
