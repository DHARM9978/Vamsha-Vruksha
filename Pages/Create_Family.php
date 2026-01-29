<?php
include "conn.php";
require "Navbar.php";

if(isset($_POST['create_family'])){

    $conn->begin_transaction();

    try{

        $familyName = $_POST['family_name'];

        // Insert FAMILY
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

        // Insert HEAD PERSON
        $stmt = $conn->prepare("
            INSERT INTO PERSON
            (Family_Id, First_Name, Last_Name, Gender, DOB, Phone_Number, Mobile_Number, Email,
             Original_Native, Current_Address,
             Gotra_Id, Sutra_Id, Panchang_Sudhi_Id, Vamsha_Id,
             Mane_Devru_Id, Kula_Devatha_Id, Pooja_Vruksha_Id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

        $stmt->bind_param("issssssssiiiiiiii",
            $familyId,
            $_POST['first_name'], $_POST['last_name'], $_POST['gender'], $_POST['dob'],
            $_POST['phone'], $_POST['mobile'], $_POST['email'],
            $_POST['native'], $_POST['address'],
            $_POST['gotra'], $_POST['sutra'], $_POST['panchang'],
            $_POST['vamsha'], $_POST['mane_devru'], $_POST['kula_devatha'], $_POST['pooja_vruksha']
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

<style>

/* ===== GLOBAL FIX ===== */
html, body {
    margin: 0;
    padding: 0;
    overflow-x: hidden !important;  /* FORCE REMOVE HORIZONTAL SCROLL */
    width: 100%;
    max-width: 100%;
    font-family: 'Segoe UI', sans-serif;
    background: #f2f5f9;
}

* {
    box-sizing: border-box;
    max-width: 100%;
}

/* ===== REMOVE NAVBAR OVERFLOW ISSUES ===== */
nav, .navbar, .sidebar, .wrapper, .main-content {
    max-width: 100% !important;
    overflow-x: hidden !important;
}

/* ===== MAIN CONTAINER ===== */
.container {
    width: 95%;
    max-width: 1000px;
    margin: 110px auto 40px auto;
    background: #ffffff;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,.08);
}

/* ===== HEADING ===== */
h2 {
    text-align: center;
    margin-bottom: 25px;
    color: #1e90ff;
    border-bottom: 2px solid #eee;
    padding-bottom: 8px;
}

/* ===== GRID ===== */
.grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
}

input, select {
    width: 100%;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ccc;
}

button {
    width: 100%;
    padding: 12px;
    background: #1e90ff;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
}

button:hover {
    background: #187bcd;
}

.full {
    grid-column: 1 / -1;
}

.msg {
    text-align: center;
    color: green;
    margin-bottom: 15px;
    font-weight: 600;
}

@media(max-width: 768px) {
    .grid {
        grid-template-columns: 1fr;
    }
    .full {
        grid-column: 1;
    }
}

</style>
</head>

<body>

<div class="container">

<h2>Create Family (with Head Person)</h2>

<?php if(!empty($success)): ?>
<div class="msg"><?= $success ?></div>
<?php endif; ?>

<form method="post" class="grid">

<input name="family_name" placeholder="Family Name" required class="full">

<input name="first_name" placeholder="Head First Name" required>
<input name="last_name" placeholder="Head Last Name">

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
<option value="">Select Gotra</option>
<?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?>
</select>

<select name="sutra">
<option value="">Select Sutra</option>
<?php loadOptions($conn,"Sutra","Sutra_Id","Sutra_Name"); ?>
</select>

<select name="panchang">
<option value="">Select Panchang</option>
<?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?>
</select>

<select name="vamsha">
<option value="">Select Vamsha</option>
<?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?>
</select>

<select name="mane_devru">
<option value="">Select Mane Devru</option>
<?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
</select>

<select name="kula_devatha">
<option value="">Select Kula Devatha</option>
<?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
</select>

<select name="pooja_vruksha" class="full">
<option value="">Select Pooja Vruksha</option>
<?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?>
</select>

<button name="create_family" class="full">Create Family</button>

</form>

</div>

</body>
</html>
