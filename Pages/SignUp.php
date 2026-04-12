<?php
session_start();
include "conn.php";

$showOtp = isset($_GET['otp']);
$message = "";

if(isset($_POST['signup'])){

    $name   = trim($_POST['name']);
    $email  = trim($_POST['email']);
    $mobile = trim($_POST['mobile']);
    $password = $_POST['password'];

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    /* CHECK EXISTING */
    $check = $conn->prepare("
        SELECT user_email, user_phone_number 
        FROM user_login 
        WHERE user_email=? OR user_phone_number=?
    ");

    $check->bind_param("ss",$email,$mobile);
    $check->execute();
    $result = $check->get_result();

    $emailExists = false;
    $mobileExists = false;

    while($row = $result->fetch_assoc()){
        if($row['user_email'] == $email) $emailExists = true;
        if($row['user_phone_number'] == $mobile) $mobileExists = true;
    }

    if($emailExists || $mobileExists){

        if($emailExists) $message .= "Email already registered.<br>";
        if($mobileExists) $message .= "Mobile number already registered.";

    } else {

        $stmt = $conn->prepare("
            INSERT INTO user_login
            (user_name,user_email,user_phone_number,password,role,is_verified)
            VALUES (?,?,?,?,'User',0)
        ");

        $stmt->bind_param("ssss",$name,$email,$mobile,$hashedPassword);

        if($stmt->execute()){

            /* OTP */
            $otp = rand(100000,999999);
            $expiry = date("Y-m-d H:i:s", strtotime("+5 minutes"));

            $conn->query("DELETE FROM otp_verification WHERE user_email='$email'");

            $conn->query("
                INSERT INTO otp_verification (user_email, otp, purpose, expires_at)
                VALUES ('$email','$otp','signup','$expiry')
            ");

            $_SESSION['otp_email'] = $email;

            /* 🚀 FAST MAIL (BACKGROUND) */
            $emailArg = escapeshellarg($email);
            $otpArg   = escapeshellarg($otp);

            $cmd = "cmd /c \"C:\\xampp\\php\\php.exe C:\\xampp\\htdocs\\vamsha_vruksha\\Pages\\send_mail.php $emailArg $otpArg\"";
            exec($cmd);

            /* REDIRECT */
            header("Location: signup.php?otp=1");
            exit();

        } else {
            $message = "Error creating account.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">
    <title>Create Account</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <link rel="stylesheet" href="../CSS/SignUp.css">

</head>

<body>

    <div class="signup-card">

        <div class="icon-circle">
            <i class="fa-solid fa-user-plus"></i>
        </div>

        <h1>Create Account</h1>
        <p class="subtitle">Join our family community</p>

        <?php if($message!=""){ ?>
        <div class="msg">
            <?php echo $message ?>
        </div>
        <?php } ?>

        <?php if($showOtp){ ?>
        <div class="msg" style="color: green;">
            OTP has been sent to your email.
        </div>
        <?php } ?>

        <form id="signupForm" method="POST">

            <!-- NAME -->

            <div class="form-group">
                <i class="fa-solid fa-user left-icon"></i>
                <input type="text" id="name" name="name" placeholder="Full Name" required>
                <div class="error">Enter your name</div>
            </div>

            <!-- EMAIL -->

            <div class="form-group">
                <i class="fa-regular fa-envelope left-icon"></i>
                <input type="email" id="email" name="email" placeholder="Email Address" required>
                <div class="error">Enter valid email address</div>
            </div>

            <!-- MOBILE -->

            <div class="form-group">
                <i class="fa-solid fa-mobile-screen left-icon"></i>
                <input type="text" id="mobile" name="mobile" placeholder="Mobile Number" maxlength="10" required>
                <div class="error">Enter 10 digit mobile number</div>
            </div>

            <!-- PASSWORD -->

            <div class="form-group">
                <i class="fa-solid fa-lock left-icon"></i>

                <input type="password" id="password" name="password" placeholder="Password" required>

                <i class="fa-regular fa-eye toggle-password" onclick="togglePassword('password',this)"></i>

                <div class="error">
                    Password must contain uppercase and number
                </div>

            </div>

            <div class="password-hint">
                At least 8 characters, 1 uppercase letter, 1 number
            </div>

            <!-- CONFIRM PASSWORD -->

            <div class="form-group">

                <i class="fa-solid fa-lock left-icon"></i>

                <input type="password" id="confirmPassword" placeholder="Confirm Password" required>

                <i class="fa-regular fa-eye toggle-password" onclick="togglePassword('confirmPassword',this)"></i>

                <div class="error">
                    Passwords do not match
                </div>

            </div>

            <button type="submit" name="signup" class="btn">
                Sign Up
            </button>

        </form>

        <div class="login-text">
            Already have an account?
            <a href="login.php">Login</a>
        </div>

    </div>

    <div id="otpModal" class="otp-modal">
        <div class="otp-box">

            <h2>Verify OTP</h2>
            <p>Enter the OTP sent to your email</p>

            <input type="text" id="otp" maxlength="6" placeholder="Enter OTP">

            <p id="otpMsg"></p>

            <button class="verify-btn" onclick="verifyOtp()">Verify OTP</button>
            <button class="resend-btn" onclick="resendOtp()">Resend OTP</button>

            <!-- Hide the otp_email session  -->
            <input type="hidden" id="hiddenEmail" value="<?php echo $_SESSION['otp_email'] ?? ''; ?>">

        </div>
    </div>

    <script>
    let userEmail = document.getElementById("hiddenEmail").value;
    window.onload = function() {

        let showOtp = "<?php echo $showOtp ? 'true' : 'false'; ?>";

        if (showOtp === "true") {
            document.getElementById("otpModal").style.display = "flex";
        }

    };
    </script>


    <script src="../JavaScript/SignUp.js"></script>

</body>

</html>