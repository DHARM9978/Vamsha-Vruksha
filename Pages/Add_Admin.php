<?php

include('Navbar.php');

/* START SESSION SAFELY */
if(session_status() === PHP_SESSION_NONE){
session_start();
}

include "auth_check.php";
include "conn.php";

/* FLASH MESSAGE FUNCTION */

function setFlash($msg){
$_SESSION['flash_message']=$msg;
}

function showFlash(){
if(isset($_SESSION['flash_message'])){
echo '<div class="msg">'.$_SESSION['flash_message'].'</div>';
unset($_SESSION['flash_message']);
}
}

/* CREATE USER */

if(isset($_POST['create_user'])){

$name   = trim($_POST['name']);
$email  = trim($_POST['email']);
$mobile = trim($_POST['mobile']);
$password = $_POST['password'];
$role = $_POST['role'];

$hashedPassword=password_hash($password,PASSWORD_DEFAULT);

/* CHECK DUPLICATE */

$check=$conn->prepare("
SELECT user_email,user_phone_number
FROM user_login
WHERE user_email=? OR user_phone_number=?
");

$check->bind_param("ss",$email,$mobile);
$check->execute();
$result=$check->get_result();

$emailExists=false;
$mobileExists=false;

while($row=$result->fetch_assoc()){

if($row['user_email']==$email){
$emailExists=true;
}

if($row['user_phone_number']==$mobile){
$mobileExists=true;
}

}

if($emailExists || $mobileExists){

$msg="";

if($emailExists){
$msg.="Email already exists. ";
}

if($mobileExists){
$msg.="Mobile number already exists.";
}

setFlash($msg);
header("Location: Add_Admin.php");
exit();

}

/* INSERT USER */

$stmt=$conn->prepare("
INSERT INTO user_login
(user_name,user_email,user_phone_number,password,role)
VALUES (?,?,?,?,?)
");

$stmt->bind_param("sssss",$name,$email,$mobile,$hashedPassword,$role);

if($stmt->execute()){

if($role=="Admin"){
setFlash("Admin created successfully!");
}else{
setFlash("User created successfully!");
}

}else{

setFlash("Error creating account.");

}

header("Location: Add_Admin.php");
exit();

}
?>

<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">
<title>Add Admin/User</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:"Segoe UI",sans-serif;
}

body{
min-height:100vh;
margin-top:30px;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(135deg,#e0f2fe,#dcfce7);
padding:20px;
}

.card{
width:100%;
max-width:420px;
background:white;
border-radius:18px;
padding:35px 30px;
box-shadow:0 10px 30px rgba(0,0,0,0.08);
}

.icon-circle{
width:60px;
height:60px;
background:#e0f2fe;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
margin:0 auto 20px;
}

.icon-circle i{
color:#2563eb;
font-size:22px;
}

h1{
text-align:center;
font-size:24px;
margin-bottom:5px;
}

.subtitle{
text-align:center;
color:#6b7280;
margin-bottom:20px;
}

.form-group{
position:relative;
margin-bottom:18px;
}

.left-icon{
position:absolute;
top:50%;
left:14px;
transform:translateY(-50%);
color:#9ca3af;
}

.form-group input{
width:100%;
padding:14px 45px 14px 42px;
border-radius:10px;
border:1px solid #e5e7eb;
outline:none;
}

.error{
font-size:12px;
color:#ef4444;
display:none;
margin-top:4px;
}

.form-group.invalid input{
border-color:#ef4444;
}

.role-toggle{
display:flex;
justify-content:center;
margin:20px 0;
}

.role-toggle label{
margin:0 10px;
cursor:pointer;
}

.btn{
width:100%;
background:linear-gradient(135deg,#3b82f6,#22c55e);
border:none;
color:white;
padding:14px;
border-radius:12px;
cursor:pointer;
}

.msg{
text-align:center;
margin-bottom:15px;
color:#2563eb;
font-weight:600;
}

</style>

</head>

<body>

<div class="card">

<div class="icon-circle">
<i class="fa-solid fa-user-plus"></i>
</div>

<h1>Add Admin/User</h1>
<p class="subtitle">Create Admin or User Account</p>

<?php showFlash(); ?>

<form method="POST" id="addUserForm">

<div class="form-group">
<i class="fa-solid fa-user left-icon"></i>
<input type="text" id="name" name="name" placeholder="Full Name" required>
<div class="error">Minimum 2 characters required</div>
</div>

<div class="form-group">
<i class="fa-regular fa-envelope left-icon"></i>
<input type="email" id="email" name="email" placeholder="Email Address" required>
<div class="error">Enter valid email</div>
</div>

<div class="form-group">
<i class="fa-solid fa-mobile-screen left-icon"></i>
<input type="text" id="mobile" name="mobile" placeholder="Mobile Number" maxlength="10" required>
<div class="error">Enter valid 10 digit number</div>
</div>

<div class="form-group">
<i class="fa-solid fa-lock left-icon"></i>
<input type="password" id="password" name="password" placeholder="Password" required>
<div class="error">Password must contain uppercase & number</div>
</div>

<div class="role-toggle">

<label>
<input type="radio" name="role" value="User" checked>
User
</label>

<label>
<input type="radio" name="role" value="Admin">
Admin
</label>

</div>

<button type="submit" name="create_user" class="btn">
Create Account
</button>

</form>

</div>

<script>

function validate(id,rule){

const input=document.getElementById(id);
const group=input.parentElement;
const error=group.querySelector(".error");

if(!rule(input.value.trim())){
group.classList.add("invalid");
error.style.display="block";
return false;
}else{
group.classList.remove("invalid");
error.style.display="none";
return true;
}

}

function validateName(){
return validate("name",v=>v.length>=2);
}

function validateEmail(){
return validate("email",v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
}

function validateMobile(){

const input=document.getElementById("mobile");
input.value=input.value.replace(/[^0-9]/g,"");

return validate("mobile",v=>/^[0-9]{10}$/.test(v));

}

function validatePassword(){
return validate("password",v=>/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(v));
}

document.getElementById("addUserForm").addEventListener("submit",function(e){

if(
!validateName() ||
!validateEmail() ||
!validateMobile() ||
!validatePassword()
){
e.preventDefault();
}

});

</script>

</body>
</html>

