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
.form-group{
    display:flex;
    gap:10px;
}
input{
    flex:1;
    padding:10px;
    border-radius:6px;
    border:1px solid #ccc;
    font-size:15px;
}
button{
    padding:10px 18px;
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
.list{
    margin-top:25px;
}
.item{
    background:#f6f8fb;
    padding:10px 14px;
    border-radius:6px;
    margin-bottom:8px;
    display:flex;
    justify-content:space-between;
}
@media(max-width:500px){
    .form-group{flex-direction:column}
}
</style>
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
