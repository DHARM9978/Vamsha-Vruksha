<?php
include "conn.php";
require "Navbar.php";

if(isset($_POST['create_family'])){

    $conn->begin_transaction();

    try{

        $familyName = $_POST['family_name'];

        /* ===== INSERT FAMILY ===== */
        $stmt = $conn->prepare("
            INSERT INTO FAMILY (Family_Name, Native_Place, Head_DOB, Gotra_Id)
            VALUES (?,?,?,?)
        ");
        $stmt->bind_param("sssi",
            $familyName,
            $_POST['native'],
            $_POST['dob'],
            $_POST['gotra']
        );
        $stmt->execute();

        $familyId = $conn->insert_id;

        /* ===== INSERT HEAD PERSON ===== */
        $stmt = $conn->prepare("
            INSERT INTO PERSON
            (Family_Id, First_Name, Last_Name, father_name, mother_name,
             Gender, DOB, Phone_Number, Mobile_Number, Email,
             Original_Native, Current_Address,
             Gotra_Id, Sutra_Id, Panchang_Sudhi_Id, Vamsha_Id,
             Mane_Devru_Id, Kula_Devatha_Id, Pooja_Vruksha_Id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

        $address = trim($_POST['address']);
        $address = ($address === "") ? NULL : $address;


        $stmt->bind_param("isssssssssssiiiiiii",
            $familyId,                      // i
            $_POST['first_name'],           // s
            $_POST['last_name'],            // s
            $_POST['father_name'],          // s
            $_POST['mother_name'],          // s
            $_POST['gender'],               // s
            $_POST['dob'],                  // s
            $_POST['phone'],                // s
            $_POST['mobile'],               // s
            $_POST['email'],                // s
            $_POST['native'],               // s
            $address,                       // s
            $_POST['gotra'],                // i
            $_POST['sutra'],                // i
            $_POST['panchang'],             // i
            $_POST['vamsha'],               // i
            $_POST['mane_devru'],           // i
            $_POST['kula_devatha'],         // i
            $_POST['pooja_vruksha']         // i
        );

        $stmt->execute();

        $conn->commit();
        $success = "Family created successfully.";

    } catch(Exception $e){
        $conn->rollback();
        $success = "Error creating family.";
    }
}

function loadOptions($conn,$table,$id,$name){
    $r=$conn->query("SELECT $id,$name FROM $table ORDER BY $name");
    while($row=$r->fetch_assoc()){
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

            <?php if(!empty($success)): ?>
            <div class="msg"><?= $success ?></div>
            <?php endif; ?>

            <form method="post" class="grid">

                <input name="family_name" placeholder="Family Name" required class="full">

                <input name="first_name" placeholder="Head First Name" required>
                <input name="last_name" placeholder="Head Last Name">

                <!-- NEW FIELDS -->
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