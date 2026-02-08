<?php
$host = "localhost";
$username = "root";        // change if needed
$password = "";            // change if needed
$database = "vamsha_Vruksha";   // your database name

$conn = new mysqli($host, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Optional: set charset for proper Gujarati text support
$conn->set_charset("utf8mb4");
?>
