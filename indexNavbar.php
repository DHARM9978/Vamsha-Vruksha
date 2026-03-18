<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>

<style>
.navbar{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:15px 8%;
    background:rgba(255,255,255,0.7);
    backdrop-filter:blur(10px);
    box-shadow:0 5px 20px rgba(0,0,0,0.08);
    position:sticky;
    top:0;
    z-index:1000;
}

/* LOGO */
.logo{
    font-size:22px;
    font-weight:700;
    color:#2563eb;
}

/* LINKS */
.nav-links{
    display:flex;
    align-items:center;
}

.nav-links a{
    margin-left:20px;
    text-decoration:none;
    font-weight:600;
    color:#111;
}

/* BUTTON */
.btn{
    background:linear-gradient(135deg,#3b82f6,#22c55e);
    color:white;
    padding:8px 18px;
    border-radius:30px;
    text-decoration:none;
    transition:0.3s;
}

.btn:hover{
    transform:scale(1.05);
    box-shadow:0 6px 20px rgba(0,0,0,0.15);
}

/* HAMBURGER */
.menu-toggle{
    display:none;
    font-size:24px;
    cursor:pointer;
}

/* MOBILE */
@media(max-width:900px){

    .menu-toggle{
        display:block;
    }

    .nav-links{
        position:absolute;
        top:100%;
        left:0;
        width:100%;
        background:white;
        flex-direction:column;
        align-items:center;
        max-height:0;
        overflow:hidden;
        transition:0.3s ease;
        box-shadow:0 10px 20px rgba(0,0,0,0.1);
    }

    .nav-links.active{
        max-height:400px;
        padding:15px 0;
    }

    .nav-links a{
        margin:10px 0;
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
            <a href="/vamsha_vruksha/Pages/dashboard.php" class="btn">Dashboard</a>
            <a href="/vamsha_vruksha/Pages/logout.php" class="btn">Logout</a>
        <?php else: ?>
            <a href="/vamsha_vruksha/Pages/login.php" class="btn">Login</a>
            <a href="/vamsha_vruksha/Pages/signup.php" class="btn">Sign Up</a>
        <?php endif; ?>

    </div>

</div>

<script>
function toggleMenu(){
    document.getElementById("navLinks").classList.toggle("active");
}
</script>