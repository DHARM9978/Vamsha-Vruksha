<?php
include "auth_check.php";
include "admin_only.php";
include "conn.php";
include "Navbar.php";

function loadOptions($conn,$t,$id,$name){
    $r=$conn->query("SELECT $id,$name FROM $t ORDER BY $name");
    while($x=$r->fetch_assoc())
        echo "<option value='{$x[$id]}'>{$x[$name]}</option>";
}
?>

<!DOCTYPE html>
<html>
<head>
<title>Edit Family</title>
<link rel="stylesheet" href="../CSS/edit_family.css">
</head>

<body>

<div class="wrapper">
<div class="container">

<h2>🔍 Search & Edit Family</h2>

<div class="search-container">
    <input type="text" id="search" placeholder="Search Family Name or Reference ID">
    <button id="searchBtn">Search</button>
</div>

<div id="results"></div>

<form id="form" class="grid hidden">

<input type="hidden" id="family_id">
<input type="hidden" id="person_id">

<input id="family_name" placeholder="Family Name" class="full">
<input id="reference_id" placeholder="Reference ID" class="full">

<input id="first_name" placeholder="First Name">
<input id="last_name" placeholder="Last Name">

<input id="father_name" placeholder="Father Name">
<input id="mother_name" placeholder="Mother Name">

<select id="gender">
    <option>Male</option>
    <option>Female</option>
</select>

<input type="date" id="dob">

<input id="phone" placeholder="Phone">
<input id="mobile" placeholder="Mobile">
<input id="email" placeholder="Email">

<input id="native" placeholder="Native Place">
<input id="address" placeholder="Address" class="full">

<select id="gotra"><?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?></select>
<select id="sutra"><?php loadOptions($conn,"Sutra","Sutra_Id","Sutra_Name"); ?></select>
<select id="panchang"><?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?></select>
<select id="vamsha"><?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?></select>
<select id="mane_devru"><?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?></select>
<select id="kula_devatha"><?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?></select>
<select id="pooja_vruksha"><?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?></select>

<button type="button" onclick="updateFamily()" class="full">✏️ Update Family</button>

</form>

</div>
</div>

<script src="../JavaScript/edit_family.js"></script>

</body>
</html>