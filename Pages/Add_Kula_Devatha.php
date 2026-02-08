<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Kula_Devatha (Kula_Devatha_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Kula Devatha added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Kula_Devatha ORDER BY Kula_Devatha_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Kula Devatha Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="../CSS/kula_devatha.css">
</head>

<body>

<div class="container">

<h2>Kula Devatha Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Kula Devatha Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r = $data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Kula_Devatha_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
