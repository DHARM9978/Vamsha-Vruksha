<?php
session_start();
include "conn.php";

$message = "";
$showReset = false;

if(isset($_POST['sendOtp'])){

$email = trim($_POST['email']);

$check = $conn->prepare("SELECT * FROM user_login WHERE user_email=?");
$check->bind_param("s",$email);
$check->execute();
$result = $check->get_result();

if($result->num_rows == 0){
$message = "Email not registered!";
}else{

$otp = rand(100000,999999);
$expiry = date("Y-m-d H:i:s", strtotime("+5 minutes"));

$conn->query("DELETE FROM otp_verification WHERE user_email='$email'");

$conn->query("
INSERT INTO otp_verification (user_email, otp, purpose, expires_at)
VALUES ('$email','$otp','forgot','$expiry')
");

$_SESSION['reset_email'] = $email;

/* SEND MAIL */
$emailArg = escapeshellarg($email);
$otpArg   = escapeshellarg($otp);

$cmd = "cmd /c \"C:\\xampp\\php\\php.exe C:\\xampp\\htdocs\\vamsha_vruksha\\Pages\\send_mail.php $emailArg $otpArg\"";
exec($cmd);

$message = "OTP sent to your email!";
$showReset = true;
}
}

/* RESET PASSWORD */
if(isset($_POST['resetPassword'])){

$email = $_SESSION['reset_email'] ?? '';
$otp = $_POST['otp'];
$newPassword = $_POST['new_password'];
$confirmPassword = $_POST['confirm_password'];

if($newPassword !== $confirmPassword){
$message = "Passwords do not match!";
$showReset = true;
}else{

$result = $conn->query("
SELECT * FROM otp_verification 
WHERE user_email='$email' AND otp='$otp'
");

if($result && $result->num_rows > 0){

$row = $result->fetch_assoc();

if(strtotime($row['expires_at']) > time()){

$hashed = password_hash($newPassword, PASSWORD_DEFAULT);

$conn->query("UPDATE user_login SET password='$hashed' WHERE user_email='$email'");
$conn->query("DELETE FROM otp_verification WHERE user_email='$email'");

$message = "Password updated successfully!";
$showReset = false;

}else{
$message = "OTP expired!";
$showReset = true;
}

}else{
$message = "Invalid OTP!";
$showReset = true;
}
}
}
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
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "Segoe UI", sans-serif;
    }

    body {
        background: linear-gradient(135deg, #e0f2fe, #dcfce7);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    /* CONTAINER */
    .container {
        width: 100%;
        max-width: 420px;
    }

    /* CARD */
    .card {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        padding: 35px;
        border-radius: 20px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    /* ICON */
    .icon {
        font-size: 40px;
        color: #2563eb;
        margin-bottom: 15px;
    }

    /* TITLE */
    .card h2 {
        margin-bottom: 10px;
    }

    .card p {
        font-size: 14px;
        color: #555;
        margin-bottom: 25px;
    }

    /* INPUT */
    .input-group {
        text-align: left;
        margin-bottom: 15px;
    }

    .input-group label {
        font-size: 13px;
        color: #333;
    }

    .input-group input {
        width: 100%;
        padding: 12px;
        margin-top: 5px;
        border-radius: 10px;
        border: 1px solid #ccc;
    }

    /* BUTTON */
    .btn {
        width: 100%;
        background: linear-gradient(135deg, #3b82f6, #22c55e);
        border: none;
        color: white;
        padding: 12px;
        border-radius: 10px;
        font-size: 15px;
        cursor: pointer;
        transition: 0.3s;
    }

    .btn:hover {
        transform: scale(1.02);
    }

    /* LINKS */
    .links {
        margin-top: 15px;
        font-size: 14px;
    }

    .links a {
        color: #2563eb;
        text-decoration: none;
    }

    /* RESPONSIVE */
    @media(max-width:500px) {
        .card {
            padding: 25px;
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

            <p>Reset your password using OTP verification</p>

            <?php if($message!=""){ ?>
            <div class="msg"><?php echo $message ?></div>
            <?php } ?>

            <form method="POST">

                <?php if(!$showReset){ ?>

                <!-- STEP 1 -->
                <div class="input-group">
                    <label>Email Address</label>
                    <input type="email" name="email" required>
                </div>

                <button type="submit" name="sendOtp" class="btn">Send OTP</button>

                <?php } else { ?>

                <!-- STEP 2 -->
                <div class="input-group">
                    <label>Enter OTP</label>
                    <input type="text" name="otp" required>
                </div>

                <div class="input-group">
                    <label>New Password</label>
                    <input type="password" name="new_password" required>
                </div>

                <div class="input-group">
                    <label>Confirm Password</label>
                    <input type="password" name="confirm_password" required>
                </div>

                <button type="submit" name="resetPassword" class="btn">Reset Password</button>

                <?php } ?>

            </form>

            <div class="links">
                <p><a href="login.php">← Back to Login</a></p>
            </div>

        </div>
    </div>

</body>

</html>