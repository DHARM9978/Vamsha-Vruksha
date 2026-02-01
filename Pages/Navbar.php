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
    --primary:#2563eb;
    --secondary:#22c55e;
    --accent:#3b82f6;
    --text-dark:#0f172a;
    --text-light:#64748b;
}

/* ===== Navbar ===== */
.navbar{
    width:100%;
    position:sticky;
    top:0;
    z-index:1000;

    display:flex;
    justify-content:space-between;
    align-items:center;

    padding:18px 60px;

    background:linear-gradient(135deg,rgba(224,242,254,0.9),rgba(236,253,245,0.9));
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);

    border-bottom:1px solid rgba(255,255,255,0.5);
    box-shadow:0 8px 30px rgba(0,0,0,0.05);
}

/* ===== Brand ===== */
.brand{
    font-size:20px;
    font-weight:700;
    background:linear-gradient(90deg,var(--primary),var(--secondary));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    letter-spacing:.5px;
}

/* ===== Menu ===== */
.menu{
    display:flex;
    align-items:center;
    gap:28px;
    transition:all .3s ease;
}

.menu a{
    text-decoration:none;
    font-size:14px;
    font-weight:500;
    padding:8px 14px;
    border-radius:12px;
    color:var(--text-dark);
    transition:all .3s ease;
}

/* ===== Hover Effect ===== */
.menu a:hover{
    background:linear-gradient(135deg,var(--primary),var(--secondary));
    color:white;
    box-shadow:0 6px 18px rgba(37,99,235,0.3);
    transform:translateY(-2px);
}

/* ===== Active Link (optional) ===== */
.menu a.active{
    background:linear-gradient(135deg,var(--primary),var(--secondary));
    color:white;
}

/* ===== Hamburger ===== */
.hamburger{
    display:none;
    flex-direction:column;
    cursor:pointer;
}

.hamburger span{
    height:3px;
    width:26px;
    margin:4px 0;
    border-radius:4px;
    background:var(--text-dark);
    transition:.3s;
}

/* ===== Mobile ===== */
@media(max-width:900px){

    .navbar{
        padding:16px 25px;
    }

    .menu{
        position:absolute;
        top:75px;
        right:20px;

        flex-direction:column;
        align-items:flex-start;

        background:rgba(255,255,255,0.95);
        backdrop-filter:blur(20px);

        width:260px;
        padding:22px;
        border-radius:18px;

        box-shadow:0 20px 50px rgba(0,0,0,.12);

        opacity:0;
        visibility:hidden;
        transform:translateY(-10px);
    }

    .menu.active{
        opacity:1;
        visibility:visible;
        transform:translateY(0);
    }

    .menu a{
        width:100%;
        padding:12px 14px;
    }

    .hamburger{
        display:flex;
    }
}

</style>
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
