<?php
// Navbar.php
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>

/* ===== Reset ===== */
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

/* ===== Theme Variables ===== */
:root{
    --glass-bg:rgba(255,255,255,0.65);
    --glass-border:rgba(255,255,255,0.4);
    --primary:#2563eb;
    --primary-soft:rgba(37,99,235,0.08);
    --text-dark:#0f172a;
    --text-light:#64748b;
}

/* ===== Body Background (Soft Gradient Layer) ===== */
body{
    font-family:"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    background:linear-gradient(135deg,#eaf4ff,#f8fbff);
}

/* ===== Glass Navbar ===== */
.navbar{
    width:100%;
    position:sticky;
    top:0;
    z-index:1000;

    display:flex;
    justify-content:space-between;
    align-items:center;

    padding:18px 60px;

    background:var(--glass-bg);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);

    border-bottom:1px solid var(--glass-border);
    box-shadow:0 8px 30px rgba(0,0,0,0.06);
}

/* ===== Brand ===== */
.navbar .brand{
    font-size:21px;
    font-weight:600;
    color:var(--text-dark);
    letter-spacing:.4px;
}

/* ===== Menu ===== */
.navbar .menu{
    display:flex;
    align-items:center;
    gap:30px;
}

/* Menu Links */
.navbar .menu a{
    text-decoration:none;
    color:var(--text-light);
    font-size:14px;
    font-weight:500;
    padding:8px 10px;
    border-radius:8px;
    transition:all .25s ease;
}

/* Hover Effect (Glass Highlight) */
.navbar .menu a:hover{
    color:var(--primary);
    background:var(--primary-soft);
}

/* ===== Hamburger ===== */
.navbar .hamburger{
    display:none;
    flex-direction:column;
    cursor:pointer;
}

.navbar .hamburger span{
    height:3px;
    width:26px;
    background:var(--text-dark);
    margin:4px 0;
    border-radius:4px;
    transition:.3s;
}

/* ===== Responsive ===== */
@media(max-width:900px){

    .navbar{
        padding:18px 25px;
    }

    .navbar .menu{
        position:absolute;
        top:75px;
        right:15px;
        flex-direction:column;
        align-items:flex-start;

        background:rgba(255,255,255,0.85);
        backdrop-filter:blur(20px);

        width:260px;
        padding:22px;
        display:none;

        border-radius:16px;
        box-shadow:0 20px 40px rgba(0,0,0,.12);
    }

    .navbar .menu a{
        width:100%;
        padding:12px 14px;
    }

    .navbar .menu.active{
        display:flex;
    }

    .navbar .hamburger{
        display:flex;
    }
}

</style>
</head>

<body>

<div class="navbar">

    <div class="brand">Vamsha System</div>

    <div class="menu" id="menu">
        <a href="Add_Person.php">Add Person</a>
        <a href="Create_Family.php">Create Family</a>
        <a href="Family_Tree.php">Family Tree</a>
        <a href="Family_Details.php">Family Details</a>
        <a href="edit_person.php">Edit Person Details</a>
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
