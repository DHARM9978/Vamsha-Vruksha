
<?php
session_start();
include "Pages/conn.php";

/* DATABASE COUNTS */

$families = $conn->query("SELECT COUNT(*) as total FROM family")->fetch_assoc()['total'];
$persons = $conn->query("SELECT COUNT(*) as total FROM person")->fetch_assoc()['total'];
$relations = $conn->query("SELECT COUNT(*) as total FROM family_relation")->fetch_assoc()['total'];
$users = $conn->query("SELECT COUNT(*) as total FROM user_login")->fetch_assoc()['total'];
?>

<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Vamsha Vruksha</title>

<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

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
}

/* NAVBAR */

.navbar{
display:flex;
justify-content:space-between;
align-items:center;
padding:18px 50px;
background:rgba(255,255,255,0.7);
backdrop-filter:blur(10px);
box-shadow:0 5px 20px rgba(0,0,0,0.08);
position:sticky;
top:0;
z-index:1000;
}

.logo{
font-size:22px;
font-weight:700;
color:#2563eb;
}

.nav-links a{
margin-left:20px;
text-decoration:none;
font-weight:600;
color:#111;
}

.btn{
background:linear-gradient(135deg,#3b82f6,#22c55e);
color:white;
padding:10px 20px;
border-radius:30px;
text-decoration:none;
transition:0.3s;
}

.btn:hover{
transform:scale(1.05);
box-shadow:0 6px 20px rgba(0,0,0,0.15);
}

/* HERO */

.hero{
display:flex;
align-items:center;
justify-content:space-between;
padding:90px 80px;
flex-wrap:wrap;
}

.hero-text{
max-width:520px;
}

.hero-text h1{
font-size:45px;
margin-bottom:20px;
}

.hero-text p{
font-size:18px;
color:#555;
margin-bottom:25px;
line-height:1.7;
}

.hero-image{
flex:1;
display:flex;
justify-content:center;
}

.hero-image img{
width:420px;
max-width:100%;
animation:float 4s ease-in-out infinite;
filter:drop-shadow(0 10px 20px rgba(0,0,0,0.15));
}

/* STATS */

.stats{
padding:60px;
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:30px;
}

.card{
background:rgba(255,255,255,0.8);
backdrop-filter:blur(12px);
padding:35px;
border-radius:18px;
text-align:center;
box-shadow:0 10px 30px rgba(0,0,0,0.08);
transition:0.3s;
}

.card:hover{
transform:translateY(-8px) scale(1.02);
}

.card i{
font-size:38px;
color:#2563eb;
margin-bottom:10px;
}

.card h2{
font-size:36px;
}

/* FEATURES */

.features{
padding:70px;
text-align:center;
}

.feature-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
gap:25px;
margin-top:40px;
}

.feature{
background:white;
padding:30px;
border-radius:18px;
box-shadow:0 8px 25px rgba(0,0,0,0.08);
transition:0.3s;
}

.feature:hover{
transform:translateY(-6px);
}

.feature i{
font-size:35px;
color:#2563eb;
margin-bottom:10px;
}

/* ABOUT */

.about{
padding:70px;
background:white;
text-align:center;
}

.about p{
max-width:700px;
margin:auto;
line-height:1.7;
color:#555;
}

/* CONTACT */

.contact{
padding:80px 60px;
background:linear-gradient(135deg,#e0f2fe,#dcfce7);
text-align:center;
}

.contact-container{
display:grid;
grid-template-columns:1fr 1fr;
gap:40px;
margin-top:40px;
align-items:center;
}

.contact-info{
display:flex;
flex-direction:column;
gap:20px;
}

.contact-card{
background:white;
padding:25px;
border-radius:15px;
box-shadow:0 8px 25px rgba(0,0,0,0.08);
transition:0.3s;
}

.contact-card:hover{
transform:translateY(-5px);
}

.contact-card i{
font-size:28px;
color:#2563eb;
margin-bottom:10px;
}

.contact-form form{
background:white;
padding:30px;
border-radius:15px;
box-shadow:0 8px 25px rgba(0,0,0,0.08);
display:flex;
flex-direction:column;
gap:15px;
}

.contact-form input,
.contact-form textarea{
padding:12px;
border-radius:8px;
border:1px solid #ccc;
}

.contact-form button{
background:linear-gradient(135deg,#3b82f6,#22c55e);
border:none;
color:white;
padding:12px;
border-radius:8px;
cursor:pointer;
}

/* FOOTER */

.footer{
background:#111;
color:white;
padding:40px;
text-align:center;
margin-top:50px;
}

.footer-links a{
color:white;
margin:0 10px;
text-decoration:none;
}

/* ANIMATION */

@keyframes float{
0%{transform:translateY(0)}
50%{transform:translateY(-18px)}
100%{transform:translateY(0)}
}

/* RESPONSIVE */

@media(max-width:900px){

.hero{
flex-direction:column;
text-align:center;
}

.hero-image{
margin-top:40px;
}

.contact-container{
grid-template-columns:1fr;
}

.navbar{
flex-direction:column;
gap:10px;
}

}

</style>

</head>

<body>

<!-- NAVBAR -->

<div class="navbar">

<div class="logo">🌿 Vamsha Vruksha</div>

<div class="nav-links">
<a href="#about">About</a>
<a href="#contact">Contact</a>
<a href="Pages/login.php" class="btn">Login</a>
<a href="Pages/signup.php" class="btn">Sign Up</a>
</div>

</div>


<!-- HERO -->

<section class="hero">

<div class="hero-text">

<h1>Discover Your Family Heritage</h1>

<p>

Vamsha Vruksha helps families digitally preserve their lineage,
track relationships, and visualize generations through an
interactive family tree.

</p>

<a href="Pages/login.php" class="btn">Explore Family Tree</a>

</div>

<div class="hero-image">

<!-- <img src="https://cdn-icons-png.flaticon.com/512/4475/4475010.png"> -->
<img src="">

</div>

</section>


<!-- STATISTICS -->

<section class="stats">

<div class="card">
<i class="fa-solid fa-people-group"></i>
<h2><?php echo $families; ?></h2>
<p>Total Families</p>
</div>

<div class="card">
<i class="fa-solid fa-user"></i>
<h2><?php echo $persons; ?></h2>
<p>Total Persons</p>
</div>

<div class="card">
<i class="fa-solid fa-diagram-project"></i>
<h2><?php echo $relations; ?></h2>
<p>Total Relations</p>
</div>

<div class="card">
<i class="fa-solid fa-user-shield"></i>
<h2><?php echo $users; ?></h2>
<p>Total Users</p>
</div>

</section>


<!-- FEATURES -->

<section class="features">

<h2>System Features</h2>

<div class="feature-grid">

<div class="feature">
<i class="fa-solid fa-tree"></i>
<h3>Family Tree Visualization</h3>
<p>Explore your family hierarchy visually.</p>
</div>

<div class="feature">
<i class="fa-solid fa-users"></i>
<h3>Manage Members</h3>
<p>Add and update family members easily.</p>
</div>

<div class="feature">
<i class="fa-solid fa-diagram-project"></i>
<h3>Relationship Mapping</h3>
<p>Maintain accurate family relationships.</p>
</div>

<div class="feature">
<i class="fa-solid fa-shield-halved"></i>
<h3>Secure Access</h3>
<p>Admin and user role-based system.</p>
</div>

</div>

</section>


<!-- ABOUT -->

<section class="about" id="about">

<h2>About Vamsha Vruksha</h2>

<p>

The term Vamsha Vruksha means “Family Tree”.
This system allows families to preserve their heritage digitally
by maintaining records of family members, relationships,
Gothra, Sutra, and Vamsha lineage.

</p>

</section>


<!-- CONTACT -->

<section class="contact" id="contact">

<h2>Contact Us</h2>

<div class="contact-container">

<div class="contact-info">

<div class="contact-card">
<i class="fa-solid fa-location-dot"></i>
<h3>Location</h3>
<p>Bangalore, India</p>
</div>

<div class="contact-card">
<i class="fa-solid fa-envelope"></i>
<h3>Email</h3>
<p>support@vamshavruksha.com</p>
</div>

<div class="contact-card">
<i class="fa-solid fa-phone"></i>
<h3>Phone</h3>
<p>+91 9876543210</p>
</div>

</div>

<div class="contact-form">

<form>

<input type="text" placeholder="Your Name" required>

<input type="email" placeholder="Email Address" required>

<textarea rows="5" placeholder="Your Message"></textarea>

<button type="submit">Send Message</button>

</form>

</div>

</div>

</section>


<!-- FOOTER -->

<div class="footer">

<p>© <?php echo date("Y"); ?> Vamsha Vruksha System</p>

<div class="footer-links">
<a href="#about">About</a>
<a href="#contact">Contact</a>
</div>

</div>

</body>
</html>

