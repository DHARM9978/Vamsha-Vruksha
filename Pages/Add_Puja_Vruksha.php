<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Pooja_Vruksha (Pooja_Vruksha_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Pooja Vruksha added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Pooja_Vruksha ORDER BY Pooja_Vruksha_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Pooja Vruksha Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="Stylesheet" href="../CSS/pooja_vruksha.css">
</head>

<body>

<div class="container">

<h2>Pooja Vruksha Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Pooja Vruksha Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r = $data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Pooja_Vruksha_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
