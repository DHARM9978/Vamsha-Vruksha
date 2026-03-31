<?php
session_start();
include "../indexNavbar.php";
?>

<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>About Us - Vamsha Vruksha</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>


/* ===== GLOBAL ===== */
body{
    margin:0;
    font-family:'Segoe UI',sans-serif;
    background:linear-gradient(135deg,#e0f2fe,#ecfdf5);
    overflow-x:hidden;
}

/* ===== HERO SECTION ===== */
.hero{
    text-align:center;
    padding:clamp(40px,6vw,80px) 5%;
    animation:fadeUp 0.6s ease;
}

.hero h1{
    font-size:clamp(28px,5vw,44px);
    margin-bottom:10px;
}

.hero p{
    font-size:clamp(14px,2vw,18px);
    color:#555;
}

/* ===== ABOUT TEXT ===== */
.about{
    max-width:1000px;
    margin:auto;
    padding:clamp(30px,5vw,60px) 5%;
    text-align:center;
    animation:fadeUp 0.7s ease;
}

.about p{
    font-size:16px;
    line-height:1.7;
    color:#555;
}

/* ===== CARDS SECTION ===== */
.about-cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:25px;
    margin-top:40px;
}

/* CARD */
.card{
    background:rgba(255,255,255,0.9);
    padding:25px;
    border-radius:20px;
    text-align:center;

    backdrop-filter:blur(12px);
    box-shadow:0 10px 25px rgba(0,0,0,0.08);
    transition:all 0.3s ease;

    animation:fadeUp 0.6s ease;
}

/* ICON */
.card i{
    font-size:32px;
    color:#2563eb;
    margin-bottom:10px;
}

/* TITLE */
.card h3{
    margin-bottom:10px;
}

/* TEXT */
.card p{
    color:#555;
    font-size:14px;
}

/* HOVER EFFECT */
.card:hover{
    transform:translateY(-8px) scale(1.03);
    box-shadow:0 20px 45px rgba(0,0,0,0.15);
}

/* ===== MISSION SECTION ===== */
.mission{
    padding:clamp(40px,6vw,70px) 5%;
    text-align:center;
}

/* MISSION BOX */
.mission-box{
    max-width:800px;
    margin:auto;
    background:rgba(255,255,255,0.95);
    padding:30px;
    border-radius:20px;

    backdrop-filter:blur(14px);
    box-shadow:0 15px 40px rgba(0,0,0,0.1);

    animation:fadeUp 0.8s ease;
}

.mission-box h2{
    margin-bottom:15px;
    background:linear-gradient(90deg,#2563eb,#22c55e);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

.mission-box p{
    color:#555;
    line-height:1.6;
}

/* ===== ANIMATIONS ===== */
@keyframes fadeUp{
    from{
        opacity:0;
        transform:translateY(30px);
    }
    to{
        opacity:1;
        transform:translateY(0);
    }
}

/* ===== RESPONSIVE DESIGN ===== */

/* TABLET */
@media(max-width:900px){

    .about{
        padding:30px 5%;
    }

    .mission-box{
        padding:25px;
    }
}

/* MOBILE */
@media(max-width:600px){

    .hero{
        padding:40px 5%;
    }

    .hero h1{
        font-size:24px;
    }

    .hero p{
        font-size:14px;
    }

    .card{
        padding:20px;
    }

    .mission-box{
        padding:20px;
    }
}



</style>

</head>

<body>

<!-- HERO -->
<section class="hero">
<h1>About Vamsha Vruksha</h1>
<p>Preserving family heritage through digital innovation</p>
</section>

<!-- ABOUT -->
<section class="about">

<p>
Vamsha Vruksha, meaning "Family Tree", is a digital platform designed to help families
preserve their lineage and heritage. It allows users to store, manage, and visualize
family relationships in an organized and interactive way.
</p>

<div class="about-cards">

<div class="card">
<i class="fa-solid fa-tree"></i>
<h3>Heritage Preservation</h3>
<p>Digitally store your family history for generations.</p>
</div>

<div class="card">
<i class="fa-solid fa-users"></i>
<h3>Family Management</h3>
<p>Manage members and relationships easily.</p>
</div>

<div class="card">
<i class="fa-solid fa-diagram-project"></i>
<h3>Visualization</h3>
<p>Interactive family tree representation.</p>
</div>

<div class="card">
<i class="fa-solid fa-shield-halved"></i>
<h3>Secure System</h3>
<p>Safe and role-based access for users.</p>
</div>

</div>

</section>

<!-- MISSION -->
<section class="mission">

<div class="mission-box">
<h2>Our Mission</h2>

<p>
Our mission is to help families connect with their roots by providing a simple,
secure, and modern platform to manage their lineage. We aim to preserve traditions,
culture, and family history using technology.
</p>

</div>

</section>

<!-- FOOTER -->
<div class="footer">
<p>© <?php echo date("Y"); ?> Vamsha Vruksha System</p>
</div>

</body>
</html>