<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../PHPMailer/src/PHPMailer.php';
require '../PHPMailer/src/SMTP.php';
require '../PHPMailer/src/Exception.php';

/* LOG FILE (FOR DEBUG) */
file_put_contents("mail_log.txt", "Script started\n", FILE_APPEND);

/* GET DATA */
$email = $argv[1] ?? '';
$otp   = $argv[2] ?? '';

if(empty($email) || empty($otp)){
    file_put_contents("mail_log.txt", "Missing data\n", FILE_APPEND);
    exit();
}

$mail = new PHPMailer(true);

try {

    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username ='mcabu08@dscasc.edu.in'; 
    $mail->Password = 'snqe dwgj tacr qbpf';    
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('mcabu08@dscasc.edu.in','Vamsha Vruksha');
    $mail->addAddress($email);

    $mail->Subject = "OTP Verification";
    $mail->Body = "Your OTP is: $otp";

    $mail->send();

    file_put_contents("mail_log.txt", "Mail sent to $email\n", FILE_APPEND);

} catch (Exception $e) {

    file_put_contents("mail_log.txt", "Error: ".$mail->ErrorInfo."\n", FILE_APPEND);
}