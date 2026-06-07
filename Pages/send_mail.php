<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../PHPMailer/src/PHPMailer.php';
require '../PHPMailer/src/SMTP.php';
require '../PHPMailer/src/Exception.php';

/* LOG FILE */
file_put_contents("mail_log.txt", "Script started\n", FILE_APPEND);

/* GET DATA */
$email = $argv[1] ?? '';
$otp   = $argv[2] ?? '';

if (empty($email) || empty($otp)) {
    file_put_contents("mail_log.txt", "Missing data\n", FILE_APPEND);
    exit();
}

$mail = new PHPMailer(true);

try {

    /* SMTP SETTINGS */
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'mcabu08@dscasc.edu.in';
    $mail->Password = 'snqe dwgj tacr qbpf';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    /* SENDER & RECEIVER */
    $mail->setFrom(
        'mcabu08@dscasc.edu.in',
        'Vamsha Vruksha Support'
    );

    $mail->addAddress($email);

    /* EMAIL CONTENT */
    $mail->isHTML(true);

    $mail->Subject = 'Vamsha Vruksha - OTP Verification';

    $mail->Body = "
    <html>
    <body style='font-family: Arial, sans-serif;'>

        <div style='max-width:600px;
                    margin:auto;
                    padding:20px;
                    border:1px solid #ddd;
                    border-radius:10px;'>

            <h2 style='color:#2563eb;'>
                Vamsha Vruksha
            </h2>

            <p>Hello,</p>

            <p>You requested an OTP verification.</p>

            <p>Your OTP is:</p>

            <h1 style='color:#22c55e;'>
                $otp
            </h1>

            <p>This OTP will expire in 5 minutes.</p>

            <p>If you did not request this OTP, please ignore this email.</p>

            <hr>

            <p style='font-size:12px;color:#666;'>
                Vamsha Vruksha Family Management System
            </p>

        </div>

    </body>
    </html>
    ";

    $mail->AltBody = "Your OTP is $otp. This OTP expires in 5 minutes.";

    $mail->send();

   

}catch (Exception $e) {

    echo "error: " . $mail->ErrorInfo;
}