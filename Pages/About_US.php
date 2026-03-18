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

/* GLOBAL */
*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:"Segoe UI",sans-serif;
}

body{
background:linear-gradient(135deg,#e0f2fe,#dcfce7);
min-height:100vh;
overflow-x:hidden;
}

/* HERO */
.hero{
text-align:center;
padding:60px 5% 30px;
}

.hero h1{
font-size:clamp(28px,5vw,42px);
margin-bottom:10px;
}

.hero p{
font-size:clamp(14px,2vw,18px);
color:#555;
}

/* ABOUT SECTION */
.about{
max-width:1000px;
margin:auto;
padding:40px 5%;
text-align:center;
}

.about p{
font-size:16px;
line-height:1.7;
color:#555;
}

/* CARDS */
.about-cards{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
gap:20px;
margin-top:40px;
}

.card{
background:rgba(255,255,255,0.85);
padding:25px;
border-radius:18px;
box-shadow:0 10px 25px rgba(0,0,0,0.08);
transition:0.3s;
text-align:center;
}

.card:hover{
transform:translateY(-6px);
}

.card i{
font-size:32px;
color:#2563eb;
margin-bottom:10px;
}

.card h3{
margin-bottom:10px;
}

/* MISSION SECTION */
.mission{
padding:60px 5%;
text-align:center;
}

.mission-box{
max-width:800px;
margin:auto;
background:white;
padding:30px;
border-radius:20px;
box-shadow:0 10px 30px rgba(0,0,0,0.1);
}

/* FOOTER */
.footer{
background:#111;
color:white;
padding:30px;
text-align:center;
margin-top:40px;
}

/* MOBILE */
@media(max-width:600px){

.about{
padding:30px 5%;
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