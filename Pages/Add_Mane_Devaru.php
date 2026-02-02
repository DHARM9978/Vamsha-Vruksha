<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Mane_Devru (Mane_Devru_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Mane Devru added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Mane_Devru ORDER BY Mane_Devru_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Mane Devru Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="../CSS/mane_devaru.css">

</head>

<body>

<div class="container">

<h2>Mane Devru Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Mane Devru Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r = $data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Mane_Devru_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
