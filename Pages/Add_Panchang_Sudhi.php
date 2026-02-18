<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include "conn.php";

/* ================= ADD ================= */
if(isset($_POST['save'])){

    $name = strtolower(trim($_POST['name']));

    if($name == ""){
        header("Location: Add_Panchang_Sudhi.php?error=empty");
        exit;
    }

    // 🔍 Duplicate Check (case-insensitive)
    $check = $conn->prepare("SELECT Panchang_Sudhi_Id FROM Panchang_Sudhi WHERE LOWER(Panchang_Sudhi_Name)=?");
    $check->bind_param("s", $name);
    $check->execute();
    $check->store_result();

    if($check->num_rows > 0){
        header("Location: Add_Panchang_Sudhi.php?error=duplicate");
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO Panchang_Sudhi (Panchang_Sudhi_Name) VALUES (?)");
    $stmt->bind_param("s", $name);

    if($stmt->execute()){
        header("Location: Add_Panchang_Sudhi.php?success=added");
        exit;
    } else {
        header("Location: Add_Panchang_Sudhi.php?error=general");
        exit;
    }
}


/* ================= UPDATE ================= */
if(isset($_POST['update'])){

    $id   = intval($_POST['edit_id']);
    $name = strtolower(trim($_POST['edit_name']));

    if($name == ""){
        header("Location: Add_Panchang_Sudhi.php?error=empty");
        exit;
    }

    // 🔍 Duplicate check excluding current record
    $check = $conn->prepare("SELECT Panchang_Sudhi_Id FROM Panchang_Sudhi 
                             WHERE LOWER(Panchang_Sudhi_Name)=? AND Panchang_Sudhi_Id!=?");
    $check->bind_param("si", $name, $id);
    $check->execute();
    $check->store_result();

    if($check->num_rows > 0){
        header("Location: Add_Panchang_Sudhi.php?error=duplicate");
        exit;
    }

    $stmt = $conn->prepare("UPDATE Panchang_Sudhi 
                            SET Panchang_Sudhi_Name=? 
                            WHERE Panchang_Sudhi_Id=?");
    $stmt->bind_param("si", $name, $id);

    if($stmt->execute()){
        header("Location: Add_Panchang_Sudhi.php?success=updated");
        exit;
    } else {
        header("Location: Add_Panchang_Sudhi.php?error=general");
        exit;
    }
}


/* ================= DELETE ================= */
if(isset($_GET['delete']) && is_numeric($_GET['delete'])){

    $deleteId = intval($_GET['delete']);

    // 🔍 Check FK usage in PERSON table
    $check = $conn->prepare("SELECT COUNT(*) as total FROM PERSON WHERE Panchang_Sudhi_Id=?");
    $check->bind_param("i", $deleteId);
    $check->execute();
    $result = $check->get_result()->fetch_assoc();

    if($result['total'] > 0){
        header("Location: Add_Panchang_Sudhi.php?error=inuse");
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM Panchang_Sudhi WHERE Panchang_Sudhi_Id=?");
    $stmt->bind_param("i", $deleteId);

    if($stmt->execute()){
        header("Location: Add_Panchang_Sudhi.php?success=deleted");
        exit;
    } else {
        header("Location: Add_Panchang_Sudhi.php?error=general");
        exit;
    }
}

$data = $conn->query("SELECT * FROM Panchang_Sudhi ORDER BY Panchang_Sudhi_Name ASC");
?>

<!DOCTYPE html>
<html>
<head>
<title>Panchang Sudhi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="../CSS/Gothara.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

</head>
<body>

<?php require "Navbar.php"; ?>

<div class="container">

<h2>Panchang Sudhi</h2>

<?php
if(isset($_GET['success'])){
    if($_GET['success']=="added")
        echo '<div class="msg success">Panchang Sudhi added successfully!</div>';
    if($_GET['success']=="updated")
        echo '<div class="msg success">Panchang Sudhi updated successfully!</div>';
    if($_GET['success']=="deleted")
        echo '<div class="msg success">Panchang Sudhi deleted successfully!</div>';
}

if(isset($_GET['error'])){
    if($_GET['error']=="duplicate")
        echo '<div class="msg error">This Panchang Sudhi already exists.</div>';
    if($_GET['error']=="empty")
        echo '<div class="msg error">Panchang Sudhi name cannot be empty.</div>';
    if($_GET['error']=="inuse")
        echo '<div class="msg error">Cannot delete. Panchang Sudhi is used in Person records.</div>';
    if($_GET['error']=="general")
        echo '<div class="msg error">Something went wrong.</div>';
}
?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Panchang Sudhi Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">

<?php while($r=$data->fetch_assoc()): ?>

<div class="item">

<?php if(isset($_GET['edit']) && $_GET['edit']==$r['Panchang_Sudhi_Id']): ?>

<form method="post" class="edit-form">
    <input type="hidden" name="edit_id" value="<?= $r['Panchang_Sudhi_Id'] ?>">
    <input type="text" name="edit_name"
           value="<?= htmlspecialchars($r['Panchang_Sudhi_Name']) ?>" required>

    <button class="icon-btn save" name="update">
        <i class="fas fa-check"></i>
    </button>

    <a href="Add_Panchang_Sudhi.php" class="icon-btn cancel">
        <i class="fas fa-times"></i>
    </a>
</form>

<?php else: ?>

<span><?= htmlspecialchars($r['Panchang_Sudhi_Name']) ?></span>

<div class="action-buttons">
    <a href="?edit=<?= $r['Panchang_Sudhi_Id'] ?>" class="icon-btn edit">
        <i class="fas fa-pen"></i>
    </a>

    <a href="?delete=<?= $r['Panchang_Sudhi_Id'] ?>"
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
