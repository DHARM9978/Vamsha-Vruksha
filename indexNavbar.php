<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>

<style>

    *{
        box-sizing: border-box;
    }

body{
    margin:0;
    font-family:'Segoe UI',sans-serif;
    padding-top:75px;
    overflow-x:hidden;
}

/* NAVBAR */
.navbar{
    height:75px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 40px;

    position:fixed;
    top:0;
    width:100%;
    z-index:1000;

    background:rgba(255,255,255,0.75);
    backdrop-filter:blur(14px);
    box-shadow:0 5px 20px rgba(0,0,0,0.05);

    animation:fadeDown 0.6s ease;
}

@keyframes fadeDown{
    from{opacity:0; transform:translateY(-20px);}
    to{opacity:1; transform:translateY(0);}
}

/* LOGO */
.logo{
    font-size:22px;
    font-weight:700;
    background:linear-gradient(90deg,#2563eb,#22c55e);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* LINKS */
.nav-links{
    display:flex;
    align-items:center;
    gap:25px;
}

.nav-links a{
    text-decoration:none;
    font-weight:600;
    color:#222;
    position:relative;
}

/* hover underline */
.nav-links a::after{
    content:"";
    position:absolute;
    width:0;
    height:2px;
    left:0;
    bottom:-4px;
    background:linear-gradient(90deg,#2563eb,#22c55e);
    transition:0.3s;
}

.nav-links a:hover::after{
    width:100%;
}

/* BUTTON */
.nav-btn{
    padding:9px 20px;
    border-radius:30px;
    background:linear-gradient(135deg,#2563eb,#22c55e);
    color:white;
    transition:0.3s;
}

.nav-btn:hover{
    transform:translateY(-2px) scale(1.05);
    box-shadow:0 10px 25px rgba(0,0,0,0.2);
}

/* MOBILE */
.menu-toggle{display:none;}

@media(max-width:900px){

    .menu-toggle{
        display:block;
        font-size:26px;
        cursor:pointer;
    }

    .nav-links{
        position:absolute;
        top:75px;
        left:0;
        width:100%;
        background:white;

        flex-direction:column;
        align-items:center;

        max-height:0;
        overflow:hidden;
        transition:0.4s ease;
    }

    .nav-links.active{
        max-height:400px;
        padding:20px 0;
    }
}


</style>

<div class="navbar">

    <div class="logo">🌿 Vamsha Vruksha</div>

    <!-- HAMBURGER -->
    <div class="menu-toggle" onclick="toggleMenu()">
        <i class="fa fa-bars"></i>
    </div>

    <div class="nav-links" id="navLinks">

        <a href="/vamsha_vruksha/index.php">Home</a>
        <a href="/vamsha_vruksha/Pages/About_US.php">About</a>
        <a href="/vamsha_vruksha/Pages/Contact_US.php">Contact</a>

        <?php if(isset($_SESSION['user'])): ?>
        <a href="/vamsha_vruksha/Pages/dashboard.php" class="nav-btn">Dashboard</a>
        <a href="/vamsha_vruksha/Pages/logout.php" class="nav-btn">Logout</a>
        <?php else: ?>
        <a href="/vamsha_vruksha/Pages/login.php" class="nav-btn">Login</a>
        <a href="/vamsha_vruksha/Pages/signup.php" class="nav-btn">Sign Up</a>
        <?php endif; ?>

    </div>

</div>

<script>
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("active");
}
</script>