<?php
session_start();
include "conn.php";

$message="";

if(isset($_POST['login'])){

$email=$_POST['email'];
$password=$_POST['password'];

$stmt=$conn->prepare("
SELECT * FROM user_login 
WHERE user_email=? OR user_phone_number=?
");

$stmt->bind_param("ss",$email,$email);
$stmt->execute();

$result=$stmt->get_result();

if($result->num_rows>0){

$user=$result->fetch_assoc();

if(password_verify($password,$user['password'])){

$_SESSION['user_id']=$user['user_id'];
$_SESSION['user_name']=$user['user_name'];
$_SESSION['role']=$user['role'];

if($user['role']=="Admin"){
header("Location: Add_Person.php");
}else{
header("Location: Family_tree.php");
}
exit();
exit();

}else{
$message="Invalid User ID or Password.";
}

}else{
$message="Invalid User ID or Password.";
}

}
?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">
    <title>Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <link rel="stylesheet" href="../CSS/login.css">

</head>

<body>

    <div class="login-card">


        <a href="../index.php" class="back-dashboard">
            <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
        </a>

        <div class="icon-circle">
            <i class="fa-solid fa-heart"></i>
        </div>

        <h1>Welcome Back</h1>
        <p class="subtitle">Login to continue</p>

        <?php if($message!=""){ ?>
        <div class="msg"><?php echo $message ?></div>
        <?php } ?>

        <form id="loginForm" method="POST">

            <div class="form-group">
                <i class="fa-regular fa-envelope left-icon"></i>
                <input type="email" id="email" name="email" placeholder="Email Address">
                <div class="error">Enter valid email</div>
            </div>

            <div class="form-group">
                <i class="fa-solid fa-lock left-icon"></i>
                <input type="password" id="password" name="password" placeholder="Password">
                <i class="fa-regular fa-eye toggle-password" onclick="togglePassword('password',this)"></i>
                <div class="error">Password required</div>
            </div>

            <div>
                <a href="Forgot_password.php" class="forgot-link">Forgot Password?</a>
            </div>

            <br>
            <button type="submit" name="login" class="btn">Login</button>

        </form>

        <div class="signup-text">
            Don't have an account? <a href="signup.php">Sign Up</a>
        </div>

    </div>

    <script src="../JavaScript/login.js"></script>

</body>

</html>