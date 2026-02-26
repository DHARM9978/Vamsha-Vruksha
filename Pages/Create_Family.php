<?php
include "conn.php";
require "Navbar.php";

$success = "";

if (isset($_POST['create_family'])) {

    $conn->begin_transaction();

    try {

        /* ================= VALIDATION ================= */

        if (empty($_POST['family_name'])) {
            throw new Exception("Family Name is required.");
        }

        if (empty($_POST['reference_id']) || !is_numeric($_POST['reference_id'])) {
            throw new Exception("Reference ID must be a valid numeric value.");
        }

        if (empty($_POST['gotra'])) {
            throw new Exception("Please select Gotra.");
        }

        $familyName  = trim($_POST['family_name']);
        $referenceId = intval($_POST['reference_id']);

        /* ================= CHECK DUPLICATE REFERENCE ================= */

        $check = $conn->prepare("SELECT Family_Id FROM family WHERE Reference_Id = ?");
        $check->bind_param("i", $referenceId);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            throw new Exception("Reference ID already exists.");
        }
        $check->close();

        /* ================= INSERT FAMILY ================= */

        $native = !empty($_POST['native']) ? trim($_POST['native']) : NULL;
        $dob    = !empty($_POST['dob']) ? $_POST['dob'] : NULL;
        $gotra  = intval($_POST['gotra']);

        $stmt = $conn->prepare("
            INSERT INTO family 
            (Family_Name, Native_Place, Head_DOB, Gotra_Id, Reference_Id)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->bind_param(
            "sssii",
            $familyName,
            $native,
            $dob,
            $gotra,
            $referenceId
        );

        $stmt->execute();
        $familyId = $conn->insert_id;
        $stmt->close();

        /* ================= INSERT HEAD PERSON ================= */

        $address = !empty($_POST['address']) ? trim($_POST['address']) : NULL;

        $stmt = $conn->prepare("
            INSERT INTO person
            (Family_Id, First_Name, Last_Name, father_name, mother_name,
             Gender, DOB, Phone_Number, Mobile_Number, Email,
             Original_Native, Current_Address,
             Gotra_Id, Sutra_Id, Panchang_Sudhi_Id, Vamsha_Id,
             Mane_Devru_Id, Kula_Devatha_Id, Pooja_Vruksha_Id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

        $stmt->bind_param(
            "isssssssssssiiiiiii",
            $familyId,
            $_POST['first_name'],
            $_POST['last_name'],
            $_POST['father_name'],
            $_POST['mother_name'],
            $_POST['gender'],
            $_POST['dob'],
            $_POST['phone'],
            $_POST['mobile'],
            $_POST['email'],
            $native,
            $address,
            $_POST['gotra'],
            $_POST['sutra'],
            $_POST['panchang'],
            $_POST['vamsha'],
            $_POST['mane_devru'],
            $_POST['kula_devatha'],
            $_POST['pooja_vruksha']
        );

        $stmt->execute();
        $stmt->close();

        /* ================= COMMIT ================= */

        $conn->commit();
        $success = "Family created successfully.";

    } catch (Exception $e) {

        $conn->rollback();
        $success = $e->getMessage();
    }
}

/* ================= LOAD DROPDOWN OPTIONS ================= */

function loadOptions($conn, $table, $id, $name) {
    $result = $conn->query("SELECT $id, $name FROM $table ORDER BY $name");
    while ($row = $result->fetch_assoc()) {
        echo "<option value='{$row[$id]}'>{$row[$name]}</option>";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Create Family</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="../CSS/create_family.css">
</head>
<body>

<div class="wrapper">
    <div class="container">

        <h2>Create Family (with Head Person)</h2>

        <?php if (!empty($success)): ?>
            <div class="msg"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>

        <form method="post" class="grid">

            <input name="family_name" placeholder="Family Name" required class="full">
            <input name="reference_id" placeholder="Reference ID (Manual INT)" required class="full">

            <input name="first_name" placeholder="Head First Name" required>
            <input name="last_name" placeholder="Head Last Name">

            <input name="father_name" placeholder="Father Name">
            <input name="mother_name" placeholder="Mother Name">

            <select name="gender">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>

            <input type="date" name="dob">

            <input name="phone" placeholder="Phone">
            <input name="mobile" placeholder="Mobile">
            <input name="email" placeholder="Email">

            <input name="native" placeholder="Native Place">
            <input name="address" placeholder="Current Address" class="full">

            <select name="gotra" required>
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
                <option value="" disabled selected>Select Mane Devru</option>
                <?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
            </select>

            <select name="kula_devatha">
                <option value="" disabled selected>Select Kula Devatha</option>
                <?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
            </select>

            <select name="pooja_vruksha" class="full">
                <option value="" disabled selected>Select Pooja Vruksha</option>
                <?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?>
            </select>

            <button name="create_family" class="full">Create Family</button>

        </form>

    </div>
</div>

</body>
</html>