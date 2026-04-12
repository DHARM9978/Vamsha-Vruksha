<?php
include "conn.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../PHPMailer/src/PHPMailer.php';
require '../PHPMailer/src/SMTP.php';
require '../PHPMailer/src/Exception.php';

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'];

$otp = rand(100000,999999);
$expiry = date("Y-m-d H:i:s", strtotime("+5 minutes"));

$conn->query("DELETE FROM otp_verification WHERE user_email='$email'");

$conn->query("
INSERT INTO otp_verification (user_email, otp, purpose, expires_at)
VALUES ('$email','$otp','signup','$expiry')
");

/* 🔥 ADD THIS (YOU MISSED THIS) */
$mail = new PHPMailer(true);

$mail->isSMTP();
$mail->Host = 'smtp.gmail.com';
$mail->SMTPAuth = true;
$mail->Username = 'mcabu08@dscasc.edu.in';
$mail->Password = 'snqe dwgj tacr qbpf';
$mail->SMTPSecure = 'tls';
$mail->Port = 587;

$mail->setFrom('mcabu08@dscasc.edu.in','Vamsha Vruksha');
$mail->addAddress($email);

$mail->Subject = "Resent OTP";
$mail->Body = "Your new OTP is: $otp";

$mail->send();

echo json_encode(["status"=>"resent"]);