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
    <script src="../Javascript/Add_Person_Functions.js"></script>
</head>

<body>
    <div class="container">

        <h2> Search Family & Add Person</h2>

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
</body>

</html>