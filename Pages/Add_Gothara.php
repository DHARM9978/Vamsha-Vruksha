<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Gothra (Gotra_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Gothra added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Gothra ORDER BY Gotra_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Gothra Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="../CSS/Gothara.css">   

</head>

<body>

<div class="container">

<h2>Gothra Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Gothra Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r=$data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Gotra_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
