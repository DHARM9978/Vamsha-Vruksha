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

<style>
body{
    background:#f2f5f9;
    font-family:Segoe UI, Arial;
}
.container{
    max-width:600px;
    margin:60px auto;
    background:#fff;
    padding:25px 30px;
    border-radius:12px;
    box-shadow:0 10px 25px rgba(0,0,0,.12);
}
h2{
    text-align:center;
    color:#333;
    margin-bottom:20px;
}
input{
    width:100%;
    padding:10px;
    border-radius:6px;
    border:1px solid #ccc;
    font-size:15px;
    margin-bottom:12px;
}
input:focus{
    outline:none;
    border-color:#1e90ff;
}
button{
    width:100%;
    padding:10px;
    background:#1e90ff;
    border:none;
    border-radius:6px;
    color:white;
    font-weight:600;
    cursor:pointer;
}
button:hover{
    background:#0f6fdc;
}
.msg{
    text-align:center;
    margin-bottom:15px;
    color:#0a8f08;
}
table{
    width:100%;
    border-collapse:collapse;
    margin-top:20px;
}
th,td{
    padding:10px;
    border-bottom:1px solid #ddd;
    text-align:left;
    color:#333;
}
th{
    background:#f6f8fb;
}
</style>
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

<table>
<tr>
    <th>#</th>
    <th>Vamsha Name</th>
</tr>
<?php $i=1; while($row = $result->fetch_assoc()): ?>
<tr>
    <td><?= $i++ ?></td>
    <td><?= htmlspecialchars($row['Vamsha_Name']) ?></td>
</tr>
<?php endwhile; ?>
</table>

</div>

</body>
</html>
