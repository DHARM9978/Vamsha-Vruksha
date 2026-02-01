<?php
include "conn.php";
require "Navbar.php";

$msg = "";

if(isset($_POST['save'])){
    $stmt = $conn->prepare("INSERT INTO Sutra (Sutra_Name) VALUES (?)");
    $stmt->bind_param("s", $_POST['name']);
    if($stmt->execute()){
        $msg = "Sutra added successfully!";
    }
}

$data = $conn->query("SELECT * FROM Sutra ORDER BY Sutra_Name");
?>
<!DOCTYPE html>
<html>
<head>
<title>Sutra Master</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
/* ===========================================
   🌿 VAMSHA VRUKSHA - ADD RELATION (PRO RESPONSIVE)
   =========================================== */

*{
    box-sizing:border-box;
}

body{
    margin:0;
    font-family:"Segoe UI",system-ui;
    background:linear-gradient(135deg,#e0f2fe,#f0f9ff,#ecfdf5);
    color:#1e293b;
    min-height:100vh;
    padding:20px;
}

/* ===== Main Container ===== */
.container{
    width:100%;
    max-width:950px;
    margin:120px auto 60px;
    background:rgba(255,255,255,.95);
    backdrop-filter:blur(18px);
    padding:clamp(25px,4vw,45px);
    border-radius:24px;
    box-shadow:0 25px 70px rgba(0,0,0,.08);
    animation:fadeUp .6s ease;
}

/* Navbar spacing safety */
@media(max-width:768px){
    .container{
        margin-top:100px;
    }
}

@keyframes fadeUp{
    from{opacity:0;transform:translateY(15px);}
    to{opacity:1;transform:translateY(0);}
}

h2{
    text-align:center;
    margin-bottom:30px;
    font-size:clamp(20px,4vw,26px);
    background:linear-gradient(90deg,#2563eb,#16a34a);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* ===== Sections ===== */
.section{
    margin-bottom:30px;
    padding:20px;
    background:linear-gradient(90deg,#f0f9ff,#f0fdf4);
    border-radius:20px;
    border:1px solid #e2e8f0;
}

/* ===== Responsive Row Layout ===== */
.row{
    display:flex;
    gap:15px;
    flex-wrap:wrap;
    align-items:center;
}

/* Make elements responsive */
.row > *{
    flex:1 1 180px;
}

/* ===== Inputs & Select ===== */
input, select{
    padding:14px;
    border-radius:14px;
    border:1px solid #e2e8f0;
    background:#f8fafc;
    font-size:14px;
    width:100%;
    transition:.3s;
    min-width:0;
}

input:focus, select:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
    outline:none;
    background:white;
}

/* ===== Button ===== */
button{
    padding:14px 20px;
    border:none;
    border-radius:16px;
    font-weight:600;
    font-size:14px;
    background:linear-gradient(135deg,#2563eb,#16a34a);
    color:white;
    cursor:pointer;
    transition:.3s;
    white-space:nowrap;
}

button:hover{
    transform:translateY(-2px);
    box-shadow:0 12px 25px rgba(37,99,235,.3);
}

/* ===== Mobile Optimization ===== */
@media(max-width:600px){

    body{
        padding:15px;
    }

    .container{
        padding:22px;
        border-radius:20px;
    }

    .row{
        flex-direction:column;
        align-items:stretch;
    }

    button{
        width:100%;
    }
}


</style>

</head>

<body>

<div class="container">

<h2>Sutra Master</h2>

<?php if($msg): ?>
<div class="msg"><?= $msg ?></div>
<?php endif; ?>

<form method="post">
<div class="form-group">
    <input name="name" placeholder="Enter Sutra Name" required>
    <button name="save">Save</button>
</div>
</form>

<div class="list">
<?php while($r = $data->fetch_assoc()): ?>
<div class="item"><?= htmlspecialchars($r['Sutra_Name']) ?></div>
<?php endwhile; ?>
</div>

</div>

</body>
</html>
