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
/* ===========================================
   🌿 VAMSHA VRUKSHA - EDIT PERSON (PRO UI)
   =========================================== */

:root{
    --primary-blue:#2563eb;
    --primary-green:#16a34a;
    --light-blue:#e0f2fe;
    --light-green:#ecfdf5;
    --soft-bg:#f8fafc;
    --border:#e2e8f0;
    --text-dark:#1e293b;
}

*{
    box-sizing:border-box;
}

body{
    margin:0;
    font-family:"Segoe UI",system-ui;
    background:linear-gradient(135deg,var(--light-blue),#f0f9ff,var(--light-green));
    color:var(--text-dark);
    min-height:100vh;
    padding:20px;
}

/* ===== Container ===== */
.container{
    width:100%;
    max-width:1100px;
    margin:120px auto 60px;
    background:rgba(255,255,255,.95);
    backdrop-filter:blur(18px);
    padding:clamp(25px,4vw,45px);
    border-radius:24px;
    box-shadow:0 25px 70px rgba(0,0,0,.08);
    animation:fadeUp .6s ease;
}

/* Navbar safety */
@media(max-width:768px){
    .container{
        margin-top:100px;
    }
}

@keyframes fadeUp{
    from{opacity:0;transform:translateY(15px);}
    to{opacity:1;transform:translateY(0);}
}

/* ===== Heading ===== */
h2{
    text-align:center;
    margin-bottom:30px;
    font-size:clamp(20px,4vw,28px);
    background:linear-gradient(90deg,var(--primary-blue),var(--primary-green));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* ===== Search Input ===== */
#familySearch{
    width:100%;
    padding:14px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    font-size:14px;
    transition:.3s;
    margin-bottom:10px;
}

#familySearch:focus{
    border-color:var(--primary-blue);
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
    background:white;
    outline:none;
}

/* ===== Search Results ===== */
.result{
    padding:12px;
    border-radius:14px;
    margin:6px 0;
    cursor:pointer;
    background:linear-gradient(90deg,#e0f2fe,#f0f9ff);
    border:1px solid #bae6fd;
    transition:.3s;
    font-size:14px;
}

.result:hover{
    background:linear-gradient(90deg,#dbeafe,#ecfeff);
    transform:translateX(4px);
    box-shadow:0 8px 20px rgba(37,99,235,.15);
}

.selected-family{
    background:linear-gradient(90deg,#dcfce7,#f0fdf4);
    border:1px solid #22c55e;
    padding:14px;
    border-radius:16px;
    color:#16a34a;
    font-weight:600;
    margin:15px 0;
}

/* ===== Member Select ===== */
#memberList{
    width:100%;
    padding:14px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    margin-bottom:20px;
}

/* ===== Grid Layout ===== */
.grid{
    display:grid;
    grid-template-columns:1fr;
    gap:16px;
}

@media(min-width:768px){
    .grid{
        grid-template-columns:1fr 1fr;
    }
    .full{
        grid-column:1/3;
    }
}

/* ===== Inputs ===== */
input, select{
    padding:14px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    font-size:14px;
    width:100%;
    transition:.3s;
    min-width:0;
}

input:focus, select:focus{
    border-color:var(--primary-blue);
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
    outline:none;
    background:white;
}

/* ===== Button ===== */
button{
    padding:16px;
    border:none;
    border-radius:16px;
    font-weight:600;
    font-size:15px;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    cursor:pointer;
    transition:.3s;
}

button:hover{
    transform:translateY(-2px);
    box-shadow:0 12px 30px rgba(37,99,235,.3);
}

/* ===== Utility ===== */
.hidden{
    display:none;
}

/* ===== Mobile Optimization ===== */
@media(max-width:480px){

    body{
        padding:15px;
    }

    .container{
        padding:22px;
        border-radius:20px;
    }

    .grid{
        grid-template-columns:1fr;
    }

    .full{
        grid-column:1;
    }

    button{
        width:100%;
    }

    .result:hover{
        transform:none;
    }
}

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
            <select name="panchang"
                id="panchang"><?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?></select>
            <select name="vamsha" id="vamsha"><?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?></select>
            <select name="mane_devru"
                id="mane_devru"><?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?></select>
            <select name="kula_devatha"
                id="kula_devatha"><?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?></select>
            <select name="pooja_vruksha" id="pooja_vruksha"
                class="full"><?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?></select>

            <button name="update" class="full">Update Details</button>
        </form>
    </div>

    <script>
    const fs = document.getElementById("familySearch");
    const fr = document.getElementById("familyResults");
    const memberList = document.getElementById("memberList");
    const form = document.getElementById("editForm");

    fs.oninput = () => {
        const q = fs.value.trim();
        if (!q) {
            fr.innerHTML = "";
            return;
        }
        fetch(`Edit_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json()).then(d => {
                fr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;
                    x.onclick = () => {
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        loadMembers(f.Family_Id);
                    };
                    fr.appendChild(x);
                });
            });
    };

    function loadMembers(fid) {
        fetch(`Edit_Person.php?action=loadMembers&family=${fid}`)
            .then(r => r.json()).then(d => {
                memberList.innerHTML = "";
                memberList.classList.remove("hidden");
                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name + " " + p.Last_Name;
                    memberList.appendChild(o);
                });
            });
    }

    memberList.onchange = () => {
        fetch(`Edit_Person.php?action=loadPerson&person=${memberList.value}`)
            .then(r => r.json()).then(p => {
                document.getElementById("person_id").value = p.Person_Id;
                document.getElementById("first").value = p.First_Name;
                document.getElementById("last").value = p.Last_Name;
                document.getElementById("gender").value = p.Gender;
                document.getElementById("dob").value = p.DOB;
                document.getElementById("phone").value = p.Phone_Number;
                document.getElementById("mobile").value = p.Mobile_Number;
                document.getElementById("email").value = p.Email;
                document.getElementById("native").value = p.Original_Native;
                document.getElementById("address").value = p.Current_Address;
                document.getElementById("gotra").value = p.Gotra_Id;
                document.getElementById("panchang").value = p.Panchang_Sudhi_Id;
                document.getElementById("vamsha").value = p.Vamsha_Id;
                document.getElementById("mane_devru").value = p.Mane_Devru_Id;
                document.getElementById("kula_devatha").value = p.Kula_Devatha_Id;
                document.getElementById("pooja_vruksha").value = p.Pooja_Vruksha_Id;
                form.classList.remove("hidden");
            });
    };
    </script>

</body>

</html>