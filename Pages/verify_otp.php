<?php
include "conn.php";

header('Content-Type: application/json'); // 🔥 IMPORTANT

$data = json_decode(file_get_contents("php://input"), true);

$email = $data['email'] ?? '';
$otp   = $data['otp'] ?? '';


if(empty($email) || empty($otp)){
    echo json_encode(["status"=>"error"]);
    exit();
}


$result = $conn->query("
SELECT * FROM otp_verification 
WHERE user_email='$email' 
AND otp='$otp'
");

if($result && $result->num_rows > 0){

$row = $result->fetch_assoc();

if(strtotime($row['expires_at']) > time()){

$conn->query("UPDATE user_login SET is_verified=1 WHERE user_email='$email'");
$conn->query("DELETE FROM otp_verification WHERE user_email='$email'");

echo json_encode(["status"=>"success"]);

}else{
echo json_encode(["status"=>"expired"]);
}

}else{
echo json_encode(["status"=>"error"]);
}
