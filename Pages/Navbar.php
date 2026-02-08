<?php
// Navbar.php
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet" href="../CSS/Navbar.css">
</head>

<body>

<div class="navbar">

    <div class="brand">🌿 Vamsha Vruksha</div>

    <div class="menu" id="menu">
        <a href="Add_Person.php">Add Person</a>
        <a href="Create_Family.php">Create Family</a>
        <a href="Family_Tree.php">Family Tree</a>
        <a href="Family_Details.php">Family Details</a>
        <a href="edit_person.php">Edit Person</a>
        <a href="Add_Relation.php">Add Relation</a>
    </div>

    <div class="hamburger" onclick="toggleMenu()">
        <span></span>
        <span></span>
        <span></span>
    </div>

</div>

<script>
function toggleMenu(){
    document.getElementById("menu").classList.toggle("active");
}
</script>

</body>
</html>
