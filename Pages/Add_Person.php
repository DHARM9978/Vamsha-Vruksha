<?php
ob_start();
include "conn.php";

/* ================= AJAX ================= */
if(isset($_GET['action'])){
    header('Content-Type: application/json');

    if($_GET['action']=="searchFamily"){
        $q="%".($_GET['q']??"")."%";
        $stmt=$conn->prepare("SELECT Family_Id,Family_Name,Native_Place FROM FAMILY WHERE Family_Name LIKE ? OR Native_Place LIKE ?");
        $stmt->bind_param("ss",$q,$q);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }

    if($_GET['action']=="loadMembers"){
        $fid=intval($_GET['family']);
        $gender=$_GET['gender']??"";
        $sql="SELECT Person_Id,First_Name FROM PERSON WHERE Family_Id=?";
        if($gender!="") $sql.=" AND Gender=?";
        $stmt=$conn->prepare($sql);
        $gender!="" ? $stmt->bind_param("is",$fid,$gender) : $stmt->bind_param("i",$fid);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }
}

require "Navbar.php";

/* ================= SAVE PERSON ================= */
if(isset($_POST['save'])){

    $stmt=$conn->prepare("
        INSERT INTO PERSON
        (Family_Id,First_Name,Last_Name,Gender,DOB,Phone_Number,Mobile_Number,Email,
         Original_Native,Current_Address,Gotra_Id,Panchang_Sudhi_Id,Vamsha_Id,
         Mane_Devru_Id,Kula_Devatha_Id,Pooja_Vruksha_Id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");

    $stmt->bind_param("issssssssiiiiiii",
        $_POST['family_id'],$_POST['first'],$_POST['last'],$_POST['gender'],$_POST['dob'],
        $_POST['phone'],$_POST['mobile'],$_POST['email'],$_POST['native'],$_POST['address'],
        $_POST['gotra'],$_POST['panchang'],$_POST['vamsha'],
        $_POST['mane_devru'],$_POST['kula_devatha'],$_POST['pooja_vruksha']
    );
    $stmt->execute();

    $newPerson = $conn->insert_id;
    $mainPerson = intval($_POST['related_person']);
    $relation = $_POST['relation_type'];

    $newGender = $_POST['gender'];
    $g = $conn->query("SELECT Gender FROM PERSON WHERE Person_Id=$mainPerson")->fetch_assoc()['Gender'];

    $reverse=$relation;
    if($relation=="Father"||$relation=="Mother") $reverse=($newGender=="Male")?"Son":"Daughter";
    elseif($relation=="Son"||$relation=="Daughter") $reverse=($g=="Male")?"Father":"Mother";
    elseif($relation=="Brother") $reverse=($newGender=="Male")?"Brother":"Sister";
    elseif($relation=="Sister") $reverse=($newGender=="Male")?"Brother":"Sister";
    elseif($relation=="Husband-Wife") $reverse="Wife-Husband";
    elseif($relation=="Wife-Husband") $reverse="Husband-Wife";

    $stmt=$conn->prepare("INSERT INTO FAMILY_RELATION VALUES(NULL,?,?,?,NOW())");
    $stmt->bind_param("iis",$newPerson,$mainPerson,$relation);
    $stmt->execute();

    $stmt=$conn->prepare("INSERT INTO FAMILY_RELATION VALUES(NULL,?,?,?,NOW())");
    $stmt->bind_param("iis",$mainPerson,$newPerson,$reverse);
    $stmt->execute();

    if($_POST['gender']=="Female" && $_POST['married']=="yes" && !empty($_POST['husband'])){
        $stmt=$conn->prepare("INSERT INTO FAMILY_RELATION VALUES(NULL,?,?, 'Wife-Husband',NOW())");
        $stmt->bind_param("ii",$newPerson,$_POST['husband']);
        $stmt->execute();

        $stmt=$conn->prepare("INSERT INTO FAMILY_RELATION VALUES(NULL,?,?, 'Husband-Wife',NOW())");
        $stmt->bind_param("ii",$_POST['husband'],$newPerson);
        $stmt->execute();
    }

    echo "<script>alert('Person Added Successfully');location='Add_Person.php';</script>";
    exit;
}

function loadOptions($conn,$t,$id,$name){
    $r=$conn->query("SELECT $id,$name FROM $t ORDER BY $name");
    while($x=$r->fetch_assoc()) echo "<option value='{$x[$id]}'>{$x[$name]}</option>";
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Add Person</title>

    <style>
/* ===========================================
   🌿 VAMSHA VRUKSHA - ADD PERSON (PRO RESPONSIVE)
   =========================================== */

*{
    box-sizing:border-box;
}

html, body{
    overflow-x:hidden;
    margin:0;
    scrollbar-width:none;
    -ms-overflow-style:none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar{
    display:none;
}

body{
    background:linear-gradient(135deg,#e0f2fe,#f0f9ff,#ecfdf5);
    font-family:"Segoe UI",system-ui;
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
    box-shadow:0 25px 70px rgba(0,0,0,0.08);
    animation:fadeIn .6s ease;
}

/* Navbar safe spacing */
@media(max-width:768px){
    .container{
        margin-top:100px;
    }
}

@keyframes fadeIn{
    from{opacity:0; transform:translateY(20px);}
    to{opacity:1; transform:translateY(0);}
}

/* ===== Heading ===== */

.container h2{
    text-align:center;
    font-size:clamp(20px,4vw,28px);
    font-weight:600;
    background:linear-gradient(90deg,#2563eb,#16a34a);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    margin-bottom:30px;
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

/* ===== Inputs & Selects ===== */

input, select{
    padding:14px;
    border-radius:14px;
    border:1px solid #e2e8f0;
    width:100%;
    background:#f8fafc;
    transition:.3s;
    font-size:14px;
    min-width:0;
}

input:focus, select:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,0.15);
    background:white;
    outline:none;
}

/* ===== Family Search Results ===== */

.result{
    padding:12px;
    border-radius:12px;
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
    box-shadow:0 6px 18px rgba(37,99,235,.15);
}

.selected-family{
    background:linear-gradient(90deg,#dcfce7,#f0fdf4);
    border:1px solid #22c55e;
    padding:14px;
    border-radius:14px;
    color:#16a34a;
    font-weight:600;
    margin-bottom:18px;
}

/* ===== Female & Marriage Sections ===== */

#femaleBox, #marriageBox{
    background:#f9fafb;
    padding:16px;
    border-radius:14px;
    border:1px solid #e2e8f0;
}

/* ===== Button ===== */

button{
    padding:16px;
    border-radius:16px;
    border:none;
    background:linear-gradient(135deg,#2563eb,#3b82f6,#22c55e);
    color:white;
    font-weight:600;
    font-size:15px;
    cursor:pointer;
    transition:.3s;
}

button:hover{
    transform:translateY(-3px);
    box-shadow:0 14px 30px rgba(37,99,235,0.3);
}

/* ===== Hidden Utility ===== */

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

    .container h2{
        font-size:18px;
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

        <h2>🌿 Search Family & Add Person</h2>

        <input id="familySearch" placeholder="Search family name or native place">
        <div id="familyResults"></div>

        <form method="post" id="personForm" class="grid hidden">

            <input type="hidden" name="family_id" id="family_id">

            <input name="first" placeholder="First Name" required>
            <input name="last" placeholder="Last Name">

            <select name="gender" id="gender">
                <option>Male</option>
                <option>Female</option>
            </select>

            <input type="date" name="dob">
            <input name="phone" placeholder="Phone">
            <input name="mobile" placeholder="Mobile">
            <input name="email" placeholder="Email">
            <input name="native" placeholder="Native">
            <input name="address" placeholder="Address" class="full">

            <select name="gotra"><?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?></select>
            <select
                name="panchang"><?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?></select>
            <select name="vamsha"><?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?></select>
            <select
                name="mane_devru"><?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?></select>
            <select
                name="kula_devatha"><?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?></select>
            <select name="pooja_vruksha"
                class="full"><?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?></select>

            <select name="relation_type" class="full" required>
                <option value="">Relation with selected member</option>
                <option>Father</option>
                <option>Mother</option>
                <option>Son</option>
                <option>Daughter</option>
                <option>Brother</option>
                <option>Sister</option>
                <option value="Husband-Wife">Husband</option>
                <option value="Wife-Husband">Wife</option>
            </select>

            <select name="related_person" id="familyMemberList" class="full" required></select>

            <div id="femaleBox" class="full hidden">
                <select name="married" id="married">
                    <option value="no">Not Married</option>
                    <option value="yes">Married</option>
                </select>
            </div>

            <div id="marriageBox" class="full hidden">
                <input id="husbandFamilySearch" placeholder="Search husband's family">
                <div id="husbandFamilyResults"></div>
                <select name="husband" id="husbandList"></select>
            </div>

            <button name="save" class="full">✨ Save Person</button>
        </form>

    </div>

    <script>
    /* === YOUR JS LOGIC UNCHANGED === */
    const fs = document.getElementById("familySearch");
    const fr = document.getElementById("familyResults");
    const pf = document.getElementById("personForm");
    const fid = document.getElementById("family_id");

    fs.oninput = () => {
        const q = fs.value.trim();
        if (!q) {
            fr.innerHTML = "";
            return;
        }
        fetch(`Add_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json()).then(d => {
                fr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;
                    x.onclick = () => {
                        fid.value = f.Family_Id;
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        pf.classList.remove("hidden");
                        loadMembers(f.Family_Id, "", "familyMemberList");
                    };
                    fr.appendChild(x);
                });
            });
    };

    function loadMembers(id, g, t) {
        fetch(`Add_Person.php?action=loadMembers&family=${id}&gender=${g}`)
            .then(r => r.json()).then(d => {
                let e = document.getElementById(t);
                e.innerHTML = "";
                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name;
                    e.appendChild(o);
                });
            });
    }

    const g = document.getElementById("gender");
    const fb = document.getElementById("femaleBox");
    const m = document.getElementById("married");
    const mb = document.getElementById("marriageBox");

    g.onchange = () => fb.classList.toggle("hidden", g.value !== "Female");
    m.onchange = () => mb.classList.toggle("hidden", m.value !== "yes");

    const hfs = document.getElementById("husbandFamilySearch");
    const hfr = document.getElementById("husbandFamilyResults");

    hfs.oninput = () => {
        const q = hfs.value.trim();
        if (!q) {
            hfr.innerHTML = "";
            return;
        }
        fetch(`Add_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json()).then(d => {
                hfr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;
                    x.onclick = () => {
                        hfr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        loadMembers(f.Family_Id, "Male", "husbandList");
                    };
                    hfr.appendChild(x);
                });
            });
    };
    </script>

</body>

</html>