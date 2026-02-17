<?php
include "conn.php";
require "Navbar.php";

$msg = "";

/* ================= ADD ================= */
if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Gothra (Gotra_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        header("Location: Add_Gothara.php?success=added");
        exit;
    }
}


/* ================= UPDATE ================= */
if(isset($_POST['update'])){
    $stmt = $conn->prepare("UPDATE Gothra SET Gotra_Name=? WHERE Gotra_Id=?");
    $stmt->bind_param("si", $_POST['edit_name'], $_POST['edit_id']);
    if($stmt->execute()){
        header("Location: Add_Gothara.php?success=updated");
        exit;
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

    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

</head>

<body>

    <div class="container">

        <h2>Gothra Master</h2>

     <?php
if(isset($_GET['success']) && $_GET['success']=="updated"){
    echo '<div class="msg">Gothra updated successfully!</div>';
}
if(isset($_GET['success']) && $_GET['success']=="added"){
    echo '<div class="msg">Gothra added successfully!</div>';
}
?>

        <!-- ADD FORM -->
        <form method="post">
            <div class="form-group">
                <input name="name" placeholder="Enter Gothra Name" required>
                <button name="save">Save</button>
            </div>
        </form>

        <!-- LIST SECTION -->
        <div class="list">

            <?php while($r=$data->fetch_assoc()): ?>

            <div class="item">

                <?php if(isset($_GET['edit']) && $_GET['edit']==$r['Gotra_Id']): ?>

                <!-- EDIT MODE -->
                <form method="post" class="edit-form">
                    <input type="hidden" name="edit_id" value="<?= $r['Gotra_Id'] ?>">
                    <input type="text" name="edit_name" value="<?= htmlspecialchars($r['Gotra_Name']) ?>" required>

                    <button class="icon-btn save" name="update">
                        <i class="fas fa-check"></i>
                    </button>

                    <a href="Gothra.php" class="icon-btn cancel">
                        <i class="fas fa-times"></i>
                    </a>
                </form>

                <?php else: ?>

                <!-- NORMAL DISPLAY -->
                <span><?= htmlspecialchars($r['Gotra_Name']) ?></span>

                <a href="?edit=<?= $r['Gotra_Id'] ?>" class="icon-btn edit">
                    <i class="fas fa-pen"></i>
                </a>

                <?php endif; ?>

            </div>

            <?php endwhile; ?>

        </div>

    </div>

</body>

</html>