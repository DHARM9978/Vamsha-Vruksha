<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include "conn.php";

/* ================= ADD ================= */
if(isset($_POST['save'])){

    $name = strtolower(trim($_POST['name']));

    if($name == ""){
        header("Location: Add_Sutra.php?error=empty");
        exit;
    }

    // 🔍 Duplicate Check (case insensitive)
    $check = $conn->prepare("SELECT Sutra_Id FROM Sutra WHERE LOWER(Sutra_Name)=?");
    $check->bind_param("s", $name);
    $check->execute();
    $check->store_result();

    if($check->num_rows > 0){
        header("Location: Add_Sutra.php?error=duplicate");
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO Sutra (Sutra_Name) VALUES (?)");
    $stmt->bind_param("s", $name);

    if($stmt->execute()){
        header("Location: Add_Sutra.php?success=added");
        exit;
    } else {
        header("Location: Add_Sutra.php?error=general");
        exit;
    }
}


/* ================= UPDATE ================= */
if(isset($_POST['update'])){

    $id   = intval($_POST['edit_id']);
    $name = strtolower(trim($_POST['edit_name']));

    if($name == ""){
        header("Location: Add_Sutra.php?error=empty");
        exit;
    }

    // 🔍 Duplicate check excluding current ID
    $check = $conn->prepare("SELECT Sutra_Id FROM Sutra WHERE LOWER(Sutra_Name)=? AND Sutra_Id!=?");
    $check->bind_param("si", $name, $id);
    $check->execute();
    $check->store_result();

    if($check->num_rows > 0){
        header("Location: Add_Sutra.php?error=duplicate");
        exit;
    }

    $stmt = $conn->prepare("UPDATE Sutra SET Sutra_Name=? WHERE Sutra_Id=?");
    $stmt->bind_param("si", $name, $id);

    if($stmt->execute()){
        header("Location: Add_Sutra.php?success=updated");
        exit;
    } else {
        header("Location: Add_Sutra.php?error=general");
        exit;
    }
}


/* ================= DELETE ================= */
if(isset($_GET['delete']) && is_numeric($_GET['delete'])){

    $deleteId = intval($_GET['delete']);

    // 🔍 Check if Sutra is used in PERSON table
    $check = $conn->prepare("SELECT COUNT(*) as total FROM PERSON WHERE Sutra_Id=?");
    $check->bind_param("i", $deleteId);
    $check->execute();
    $result = $check->get_result()->fetch_assoc();

    if($result['total'] > 0){
        header("Location: Add_Sutra.php?error=inuse");
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM Sutra WHERE Sutra_Id=?");
    $stmt->bind_param("i", $deleteId);

    if($stmt->execute()){
        header("Location: Add_Sutra.php?success=deleted");
        exit;
    } else {
        header("Location: Add_Sutra.php?error=general");
        exit;
    }
}

$data = $conn->query("SELECT * FROM Sutra ORDER BY Sutra_Name ASC");
?>

<!DOCTYPE html>
<html>
<head>
    <title>Sutra </title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="../CSS/Common.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>

<body>

<?php require "Navbar.php"; ?>

<div class="container">

<h2>Sutra </h2>

<?php
if(isset($_GET['success'])){
    if($_GET['success']=="added")
        echo '<div class="msg success">Sutra added successfully!</div>';
    if($_GET['success']=="updated")
        echo '<div class="msg success">Sutra updated successfully!</div>';
    if($_GET['success']=="deleted")
        echo '<div class="msg success">Sutra deleted successfully!</div>';
}

if(isset($_GET['error'])){
    if($_GET['error']=="duplicate")
        echo '<div class="msg error">This Sutra already exists.</div>';
    if($_GET['error']=="empty")
        echo '<div class="msg error">Sutra name cannot be empty.</div>';
    if($_GET['error']=="inuse")
        echo '<div class="msg error">Cannot delete. Sutra is used in Person records.</div>';
    if($_GET['error']=="general")
        echo '<div class="msg error">Something went wrong.</div>';
}
?>

<!-- ADD FORM -->
<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Sutra Name" >
    <button name="save">Save</button>
</div>
</form>

<!-- LIST -->
<div class="list">

<?php while($r=$data->fetch_assoc()): ?>

<div class="item">

<?php if(isset($_GET['edit']) && $_GET['edit']==$r['Sutra_Id']): ?>

    <form method="post" class="edit-form">
        <input type="hidden" name="edit_id" value="<?= $r['Sutra_Id'] ?>">
        <input type="text" name="edit_name"
               value="<?= htmlspecialchars($r['Sutra_Name']) ?>" required>

        <button class="icon-btn save" name="update">
            <i class="fas fa-check"></i>
        </button>

        <a href="Add_Sutra.php" class="icon-btn cancel">
            <i class="fas fa-times"></i>
        </a>
    </form>

<?php else: ?>

    <span><?= htmlspecialchars($r['Sutra_Name']) ?></span>

    <div class="action-buttons">
        <a href="?edit=<?= $r['Sutra_Id'] ?>" class="icon-btn edit">
            <i class="fas fa-pen"></i>
        </a>

        <a href="?delete=<?= $r['Sutra_Id'] ?>"
           class="icon-btn delete"
           onclick="return confirm('Are you sure?');">
            <i class="fas fa-trash"></i>
        </a>
    </div>

<?php endif; ?>

</div>

<?php endwhile; ?>

</div>
</div>
</body>
</html>
