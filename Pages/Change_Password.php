<?php
session_start();
include "auth_check.php";
include "conn.php";

$message = "";

// SUCCESS MESSAGE
if(isset($_GET['success'])){
    $message = "Password updated successfully!";
}

// HANDLE FORM
if($_SERVER["REQUEST_METHOD"] == "POST"){

    $user_id = $_SESSION['user_id'];

    $old = $_POST['old_password'];
    $new = $_POST['new_password'];
    $confirm = $_POST['confirm_password'];

    $stmt = $conn->prepare("SELECT password FROM user_login WHERE user_id=?");
    $stmt->bind_param("i",$user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if(!$row){
        $message = "User not found!";
    }
    else{

        if(!password_verify($old, $row['password'])){
            $message = "Old password is incorrect!";
        }
        elseif($new !== $confirm){
            $message = "Passwords do not match!";
        }
        elseif(!preg_match('/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/', $new)){
            $message = "Password must be strong!";
        }
        else{

            $hashed = password_hash($new, PASSWORD_DEFAULT);

            $update = $conn->prepare("UPDATE user_login SET password=? WHERE user_id=?");
            $update->bind_param("si",$hashed,$user_id);

            if($update->execute()){
                header("Location: Change_Password.php?success=1");
                exit();
            }else{
                $message = "Error updating password!";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Change Password</title>

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
}

/* CONTAINER */
.container{
max-width:420px;
margin:100px auto;
padding:0 20px;
}

/* CARD */
.card{
background:rgba(255,255,255,0.9);
backdrop-filter:blur(10px);
padding:30px;
border-radius:20px;
box-shadow:0 15px 40px rgba(0,0,0,0.08);
}

/* TITLE */
.card h2{
text-align:center;
margin-bottom:10px;
}

/* MESSAGE */
.message{
text-align:center;
margin-bottom:15px;
font-weight:600;
color:#2563eb;
}

.message.success{
color:#22c55e;
}

/* INPUT GROUP */
.input-group{
margin-bottom:18px;
}

/* INPUT WRAPPER */
.input-wrapper{
position:relative;
}

/* INPUT */
.input-wrapper input{
width:100%;
padding:14px 45px 14px 16px;
border-radius:14px;
border:1px solid #e5e7eb;
background:#f9fafb;
transition:0.3s;
}

.input-wrapper input:focus{
background:white;
border-color:#3b82f6;
box-shadow:0 0 6px rgba(59,130,246,0.2);
outline:none;
}

/* ICON */
.toggle{
position:absolute;
right:15px;
top:50%;
transform:translateY(-50%);
cursor:pointer;
color:#666;
}

/* VALIDATION */
.validation-list{
margin-top:10px;
padding-left:10px;
}

.validation-list p{
display:flex;
align-items:center;
gap:10px;
font-size:13px;
margin:6px 0;
color:#ef4444;
}

.validation-list p.valid{
color:#22c55e;
font-weight:600;
}

/* BUTTON */
.btn{
width:100%;
background:linear-gradient(135deg,#3b82f6,#22c55e);
color:white;
border:none;
padding:14px;
border-radius:14px;
font-weight:600;
cursor:pointer;
transition:0.3s;
margin-top:10px;
}

.btn:hover{
transform:translateY(-2px);
box-shadow:0 10px 25px rgba(0,0,0,0.1);
}

/* RESPONSIVE */
@media(max-width:500px){
.container{
margin:60px auto;
}
}

</style>

</head>

<body>

<?php include "Navbar.php"; ?>

<div class="container">

<div class="card">

<h2>Change Password</h2>

<?php if($message!=""): ?>
<div class="message <?php echo isset($_GET['success']) ? 'success' : '' ?>">
<?php echo $message ?>
</div>
<?php endif; ?>

<form method="POST" onsubmit="return preventDoubleSubmit(this) && checkForm()">

<!-- OLD -->
<div class="input-group">
<div class="input-wrapper">
<input type="password" id="old_password" name="old_password" placeholder="Old Password" required>
<i class="fa-regular fa-eye toggle" onclick="togglePassword('old_password', this)"></i>
</div>
</div>

<!-- NEW -->
<div class="input-group">
<div class="input-wrapper">
<input type="password" id="new_password" name="new_password" placeholder="New Password" required onkeyup="validatePassword()">
<i class="fa-regular fa-eye toggle" onclick="togglePassword('new_password', this)"></i>
</div>

<div class="validation-list">
<p id="length"><span class="icon">❌</span> Minimum 8 characters</p>
<p id="uppercase"><span class="icon">❌</span> 1 uppercase letter</p>
<p id="number"><span class="icon">❌</span> 1 number</p>
<p id="special"><span class="icon">❌</span> 1 special character</p>
</div>
</div>

<!-- CONFIRM -->
<div class="input-group">
<div class="input-wrapper">
<input type="password" id="confirm_password" name="confirm_password" placeholder="Confirm Password" required>
<i class="fa-regular fa-eye toggle" onclick="togglePassword('confirm_password', this)"></i>
</div>
</div>

<button type="submit" class="btn">Update Password</button>

</form>

</div>
</div>

<script>

function preventDoubleSubmit(form){
let btn = form.querySelector("button");
btn.disabled = true;
btn.innerText = "Processing...";
return true;
}

function checkForm(){
let password = document.getElementById("new_password").value;
let regex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;

if(!regex.test(password)){
alert("Password must be strong!");
return false;
}
return true;
}

function togglePassword(id, icon){
let input = document.getElementById(id);

if(input.type === "password"){
input.type = "text";
icon.classList.replace("fa-eye","fa-eye-slash");
}else{
input.type = "password";
icon.classList.replace("fa-eye-slash","fa-eye");
}
}

function validatePassword(){

let password = document.getElementById("new_password").value;

let rules = {
length: password.length >= 8,
uppercase: /[A-Z]/.test(password),
number: /[0-9]/.test(password),
special: /[!@#$%^&*]/.test(password)
};

for(let key in rules){
let element = document.getElementById(key);
let icon = element.querySelector(".icon");

if(rules[key]){
element.classList.add("valid");
icon.textContent = "✔";
}else{
element.classList.remove("valid");
icon.textContent = "❌";
}
}
}

</script>

</body>
</html>