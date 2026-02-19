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
        First_Name=?, 
        Last_Name=?, 
        father_name=?,
        mother_name=?,
        Gender=?, 
        DOB=?, 
        Phone_Number=?,
        Mobile_Number=?, 
        Email=?, 
        Original_Native=?, 
        Current_Address=?,
        Gotra_Id=?, 
        Sutra_Id=?, 
        Panchang_Sudhi_Id=?, 
        Vamsha_Id=?,
        Mane_Devru_Id=?, 
        Kula_Devatha_Id=?, 
        Pooja_Vruksha_Id=?
        WHERE Person_Id=?
    ");

    $stmt->bind_param(
        "sssssssssssiiiiiiii",
        $_POST['first'],
        $_POST['last'],
        $_POST['father'],
        $_POST['mother'],
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
        $_POST['pooja_vruksha'],
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
    <link rel="stylesheet" href="../CSS/edit_person.css">
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

            <!-- 🔥 NEW FIELDS -->
            <input name="father" id="father" placeholder="Father Name">
            <input name="mother" id="mother" placeholder="Mother Name">

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

            <select name="gotra" id="gotra">
                <option value="" disabled selected>Select Gotra</option>
                <?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?>
            </select>
            <select name="sutra" id="sutra">
                <option value="" disabled selected>Select Sutra</option>
                <?php loadOptions($conn,"sutra","Sutra_Id","Sutra_Name"); ?>
            </select>
            <select name="panchang" id="panchang">
                <option value="" disabled selected>Select Pancchang</option>
                <?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?>
            </select>
            <select name="vamsha" id="vamsha">
                <option value="" disabled selected>Select Vamsha</option>
                <?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?>
            </select>
            <select name="mane_devru" id="mane_devru">
                <option value="" disabled selected>Select Mane Devaru</option>
                <?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
            </select>
            <select name="kula_devatha" id="kula_devatha">
                <option value="" disabled selected>Select Kula Devatha</option>
                <?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
            </select>
            <select name="pooja_vruksha" id="pooja_vruksha" class="full">
                <option value="" disabled selected>Select Pooja Vruksha</option>
                <?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?>
            </select>

            <button name="update" class="full">Update Details</button>
        </form>
    </div>

    <script src="../JavaScript/Edit_Person_Functions.js"></script>

</body>

</html>