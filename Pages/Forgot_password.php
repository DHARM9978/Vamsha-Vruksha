    <?php
session_start();
?>

<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Forgot Password - Vamsha Vruksha</title>

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
display:flex;
align-items:center;
justify-content:center;
padding:20px;
}

/* CONTAINER */
.container{
width:100%;
max-width:420px;
}

/* CARD */
.card{
background:rgba(255,255,255,0.85);
backdrop-filter:blur(12px);
padding:35px;
border-radius:20px;
box-shadow:0 12px 30px rgba(0,0,0,0.1);
text-align:center;
}

/* ICON */
.icon{
font-size:40px;
color:#2563eb;
margin-bottom:15px;
}

/* TITLE */
.card h2{
margin-bottom:10px;
}

.card p{
font-size:14px;
color:#555;
margin-bottom:25px;
}

/* INPUT */
.input-group{
text-align:left;
margin-bottom:15px;
}

.input-group label{
font-size:13px;
color:#333;
}

.input-group input{
width:100%;
padding:12px;
margin-top:5px;
border-radius:10px;
border:1px solid #ccc;
}

/* BUTTON */
.btn{
width:100%;
background:linear-gradient(135deg,#3b82f6,#22c55e);
border:none;
color:white;
padding:12px;
border-radius:10px;
font-size:15px;
cursor:pointer;
transition:0.3s;
}

.btn:hover{
transform:scale(1.02);
}

/* LINKS */
.links{
margin-top:15px;
font-size:14px;
}

.links a{
color:#2563eb;
text-decoration:none;
}

/* RESPONSIVE */
@media(max-width:500px){
.card{
padding:25px;
}
}

</style>

</head>

<body>

<div class="container">

<div class="card">

<div class="icon">
<i class="fa-solid fa-key"></i>
</div>

<h2>Forgot Password?</h2>

<p>Enter your email address and we’ll send you a reset link.</p>

<form method="POST">

<div class="input-group">
<label>Email Address</label>
<input type="email" name="email" required>
</div>

<button type="submit" class="btn">Send Reset Link</button>

</form>

<div class="links">
<p><a href="login.php">← Back to Login</a></p>
</div>

</div>

</div>

</body>
</html>