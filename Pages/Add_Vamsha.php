<?php
include "conn.php";
require "Navbar.php";

/* ---------- Insert Vamsha ---------- */
$message = "";

if(isset($_POST['save'])){
    $name = trim($_POST['vamsha_name']);

    if($name != ""){
        $stmt = $conn->prepare("INSERT INTO Vamsha (Vamsha_Name) VALUES (?)");
        $stmt->bind_param("s", $name);

        if($stmt->execute()){
            $message = "Vamsha added successfully!";
        } else {
            $message = "Error inserting record!";
        }
    } else {
        $message = "Vamsha name cannot be empty!";
    }
}

/* ---------- Fetch Vamsha Records ---------- */
$result = $conn->query("SELECT * FROM Vamsha ORDER BY Vamsha_Name ASC");
?>
<!DOCTYPE html>
<html>

<head>
    <title>Vamsha Master</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="../CSS/vamsha.css">

</head>

<body>

    <div class="container">

        <h2>Vamsha Master</h2>

        <?php if($message): ?>
        <div class="msg"><?= $message ?></div>
        <?php endif; ?>

        <form method="post">
            <input type="text" name="vamsha_name" placeholder="Enter Vamsha Name" required>
            <button type="submit" name="save">Save Vamsha</button>
        </form>

        <div class="list">
            <?php while($row = $result->fetch_assoc()): ?>
            <div class="item">
                <?= htmlspecialchars($row['Vamsha_Name']) ?>
            </div>
            <?php endwhile; ?>
        </div>


    </div>

</body>

</html>