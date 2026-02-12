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
        (Family_Id,First_Name,Last_Name,father_name,mother_name,Gender,DOB,Phone_Number,Mobile_Number,Email,
         Original_Native,Current_Address,Gotra_Id,Sutra_Id,Panchang_Sudhi_Id,Vamsha_Id,
         Mane_Devru_Id,Kula_Devatha_Id,Pooja_Vruksha_Id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

    $stmt->bind_param("issssssssssiiiiiiii",
            $_POST['family_id'],    //i
            $_POST['first'],        //s
            $_POST['last'],         //s
            $_POST['father_name'],  //s
            $_POST['mother_name'],  //s
            $_POST['gender'],       //s
            $_POST['dob'],          //s
            $_POST['phone'],        //s
            $_POST['mobile'],       //s
            $_POST['email'],        //s
            $_POST['native'],       //s
            $_POST['address'],      //s
            $_POST['gotra'],        //i
            $_POST['sutra'],        //i
            $_POST['panchang'],     //i
            $_POST['vamsha'],       //i
            $_POST['mane_devru'],   //i
            $_POST['kula_devatha'], //i
            $_POST['pooja_vruksha'] //i
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
    <link rel="stylesheet" href="../CSS/person_css.css">

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

            <input name="father_name" placeholder="Father Name">
            <input name="mother_name" placeholder="Mother Name">

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

            <select name="gotra">
                <option value="" disabled selected>Select Gotra</option>
                <?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?>
            </select>

            <select name="sutra">
                <option value="" disabled selected>Select Sutra</option>
                <?php loadOptions($conn,"Sutra","Sutra_Id","Sutra_Name"); ?>
            </select>
            <select name="panchang">
                <option value="" disabled selected>Select Panchang</option>
                <?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?>
            </select>
            <select name="vamsha">
                <option value="" disabled selected>Select Vamsha</option>
                <?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?>
            </select>
            <select name="mane_devru">
                <option value="" disabled selected>Select Mane_Devaru</option>
                <?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
            </select>
            <select name="kula_devatha">
                <option value="" disabled selected>Select Kula_Devatha</option>
                <?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
            </select>
            <select name="pooja_vruksha" class="full">
                <option value="" disabled selected>Select Pooja_Vruksha</option>
                <?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?>
            </select>

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