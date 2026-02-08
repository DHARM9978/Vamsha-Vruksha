<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Panchang_Sudhi (Panchang_Sudhi_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Panchang Sudhi added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Panchang_Sudhi ORDER BY Panchang_Sudhi_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Panchang Sudhi Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="../CSS/panchang_sudhi.css">
</head>

<body>

<div class="container">

<h2>Panchang Sudhi Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Panchang Sudhi Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r = $data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Panchang_Sudhi_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
