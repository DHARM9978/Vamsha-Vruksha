<?php
ob_start();
include "conn.php";

/* ================= AJAX ================= */
if(isset($_GET['action'])){
    header('Content-Type: application/json');

    /* ---------- SEARCH FAMILY ---------- */
    if($_GET['action']=="searchFamily"){
        $q="%".($_GET['q']??"")."%";
        $stmt=$conn->prepare("SELECT Family_Id,Family_Name,Native_Place FROM FAMILY WHERE Family_Name LIKE ? OR Native_Place LIKE ?");
        $stmt->bind_param("ss",$q,$q);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }

    /* ---------- LOAD FAMILY MEMBERS ---------- */
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

    /* ---------- GET SPIRITUAL DETAILS FROM HEAD ---------- */
    if($_GET['action']=="getFamilySpiritualData"){
        $fid=intval($_GET['family']);

        // Assuming first person is head
        $stmt=$conn->prepare("
            SELECT Gotra_Id,Sutra_Id,Panchang_Sudhi_Id,Vamsha_Id,
                   Mane_Devru_Id,Kula_Devatha_Id,Pooja_Vruksha_Id
            FROM PERSON
            WHERE Family_Id=?
            ORDER BY Person_Id ASC
            LIMIT 1
        ");
        $stmt->bind_param("i",$fid);
        $stmt->execute();

        $data=$stmt->get_result()->fetch_assoc();
        echo json_encode($data ?: []);
        exit;
    }
}

require "Navbar.php";

/* ================= SAVE PERSON ================= */
if(isset($_POST['save'])){

    $stmt=$conn->prepare("
        INSERT INTO PERSON
        (Family_Id,First_Name,Last_Name,father_name,mother_name,Gender,DOB,
         Phone_Number,Mobile_Number,Email,Original_Native,Current_Address,
         Gotra_Id,Sutra_Id,Panchang_Sudhi_Id,Vamsha_Id,
         Mane_Devru_Id,Kula_Devatha_Id,Pooja_Vruksha_Id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");

    $stmt->bind_param("issssssssssiiiiiiii",
        $_POST['family_id'],
        $_POST['first'],
        $_POST['last'],
        $_POST['father_name'],
        $_POST['mother_name'],
        $_POST['gender'],
        $_POST['dob'],
        $_POST['phone'],
        $_POST['mobile'],
        $_POST['email'],
        $_POST['native'],
        $_POST['address'],
        $_POST['gotra'],
        $_POST['sutra'],
        $_POST['panchang'],
        $_POST['vamsha'],
        $_POST['mane_devru'],
        $_POST['kula_devatha'],
        $_POST['pooja_vruksha']
    );

    $stmt->execute();
    $newPerson=$conn->insert_id;

    /* ---------- RELATION LOGIC ---------- */
    $mainPerson=intval($_POST['related_person']);
    $relation=$_POST['relation_type'];

    $stmt=$conn->prepare("INSERT INTO FAMILY_RELATION VALUES(NULL,?,?,?,NOW())");
    $stmt->bind_param("iis",$newPerson,$mainPerson,$relation);
    $stmt->execute();

    echo "<script>alert('Person Added Successfully');location='Add_Person.php';</script>";
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

            <select name="gotra" id="gotra">
                <option value="">Select Gotra</option>
                <?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?>
            </select>

            <select name="sutra" id="sutra">
                <option value="">Select Sutra</option>
                <?php loadOptions($conn,"Sutra","Sutra_Id","Sutra_Name"); ?>
            </select>

            <select name="panchang" id="panchang">
                <option value="">Select Panchang</option>
                <?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?>
            </select>

            <select name="vamsha" id="vamsha">
                <option value="">Select Vamsha</option>
                <?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?>
            </select>

            <select name="mane_devru" id="mane_devru">
                <option value="">Select Mane Devru</option>
                <?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
            </select>

            <select name="kula_devatha" id="kula_devatha">
                <option value="">Select Kula Devatha</option>
                <?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
            </select>

            <select name="pooja_vruksha" id="pooja_vruksha">
                <option value="">Select Pooja Vruksha</option>
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
                <option>Husband-Wife</option>
                <option>Wife-Husband</option>
            </select>

            <select name="related_person" id="familyMemberList" class="full" required></select>

            <!-- Female Only Box -->
            <div id="femaleBox" class="full hidden">
                <label>Marital Status</label>
                <select name="married" id="married">
                    <option value="no">Not Married</option>
                    <option value="yes">Married</option>
                </select>
            </div>

            <!-- Husband Selection Box -->
            <div id="marriageBox" class="full hidden">
                <input id="husbandFamilySearch" placeholder="Search Husband's Family">
                <div id="husbandFamilyResults"></div>
                <select name="husband" id="husbandList"></select>
            </div>


            <button name="save" class="full">✨ Save Person</button>

        </form>
    </div>

    <script>
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
            .then(r => r.json())
            .then(d => {
                fr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    x.onclick = () => {
                        fid.value = f.Family_Id;
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        pf.classList.remove("hidden");

                        loadMembers(f.Family_Id);

                        fetch(`Add_Person.php?action=getFamilySpiritualData&family=${f.Family_Id}`)
                            .then(r => r.json())
                            .then(data => {
                                if (!data) return;

                                if (data.Gotra_Id) document.getElementById("gotra").value = data
                                    .Gotra_Id;
                                if (data.Sutra_Id) document.getElementById("sutra").value = data
                                    .Sutra_Id;
                                if (data.Panchang_Sudhi_Id) document.getElementById("panchang")
                                    .value = data.Panchang_Sudhi_Id;
                                if (data.Vamsha_Id) document.getElementById("vamsha").value =
                                    data.Vamsha_Id;
                                if (data.Mane_Devru_Id) document.getElementById("mane_devru")
                                    .value = data.Mane_Devru_Id;
                                if (data.Kula_Devatha_Id) document.getElementById(
                                    "kula_devatha").value = data.Kula_Devatha_Id;
                                if (data.Pooja_Vruksha_Id) document.getElementById(
                                    "pooja_vruksha").value = data.Pooja_Vruksha_Id;
                            });
                    };
                    fr.appendChild(x);
                });
            });
    };

    function loadMembers(id) {
        fetch(`Add_Person.php?action=loadMembers&family=${id}`)
            .then(r => r.json())
            .then(d => {
                const e = document.getElementById("familyMemberList");
                e.innerHTML = "";
                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name;
                    e.appendChild(o);
                });
            });
    }


    /* ================= FEMALE LOGIC ================= */

    const genderSelect = document.getElementById("gender");
    const femaleBox = document.getElementById("femaleBox");
    const marriedSelect = document.getElementById("married");
    const marriageBox = document.getElementById("marriageBox");

    /* Show Married dropdown when Female selected */
    genderSelect.addEventListener("change", function() {
        if (this.value === "Female") {
            femaleBox.classList.remove("hidden");
        } else {
            femaleBox.classList.add("hidden");
            marriageBox.classList.add("hidden");
        }
    });

    /* Show Husband search if Married = Yes */
    marriedSelect.addEventListener("change", function() {
        if (this.value === "yes") {
            marriageBox.classList.remove("hidden");
        } else {
            marriageBox.classList.add("hidden");
        }
    });

    /* ================= HUSBAND SEARCH ================= */

    const hfs = document.getElementById("husbandFamilySearch");
    const hfr = document.getElementById("husbandFamilyResults");

    hfs.oninput = () => {
        const q = hfs.value.trim();
        if (!q) {
            hfr.innerHTML = "";
            return;
        }

        fetch(`Add_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {
                hfr.innerHTML = "";

                d.forEach(f => {
                    let div = document.createElement("div");
                    div.className = "result";
                    div.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    div.onclick = () => {
                        hfr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;

                        fetch(`Add_Person.php?action=loadMembers&family=${f.Family_Id}&gender=Male`)
                            .then(r => r.json())
                            .then(members => {
                                const husbandList = document.getElementById("husbandList");
                                husbandList.innerHTML = "";

                                members.forEach(p => {
                                    let option = document.createElement("option");
                                    option.value = p.Person_Id;
                                    option.textContent = p.First_Name;
                                    husbandList.appendChild(option);
                                });
                            });
                    };

                    hfr.appendChild(div);
                });
            });
    };
    </script>

</body>

</html>