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
/* ===========================================
   🌿 VAMSHA VRUKSHA - VAMSHA MASTER (PRO RESPONSIVE)
   =========================================== */

:root{
    --primary-blue:#2563eb;
    --primary-green:#16a34a;
    --light-blue:#e0f2fe;
    --light-green:#ecfdf5;
    --soft-bg:#f8fafc;
    --border:#e2e8f0;
    --text-dark:#1e293b;
}

*{
    box-sizing:border-box;
}

body{
    margin:0;
    font-family:"Segoe UI",system-ui;
    background:linear-gradient(135deg,var(--light-blue),#f0f9ff,var(--light-green));
    color:var(--text-dark);
    min-height:100vh;
    padding:20px;
}

/* ===== Container ===== */
.container{
    width:100%;
    max-width:750px;
    margin:120px auto 60px;
    background:rgba(255,255,255,.92);
    backdrop-filter:blur(18px);
    padding:clamp(20px,4vw,40px);
    border-radius:24px;
    box-shadow:0 25px 60px rgba(0,0,0,.08);
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

/* ===== Heading ===== */
h2{
    text-align:center;
    margin-bottom:25px;
    font-size:clamp(20px,4vw,26px);
    background:linear-gradient(90deg,var(--primary-blue),var(--primary-green));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* ===== Form ===== */
form{
    display:flex;
    gap:12px;
    margin-bottom:25px;
}

form input{
    flex:1;
    padding:14px;
    border-radius:14px;
    border:1px solid var(--border);
    font-size:14px;
    background:var(--soft-bg);
    transition:.3s;
}

form input:focus{
    border-color:var(--primary-blue);
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
    outline:none;
    background:white;
}

form button{
    padding:14px 20px;
    border:none;
    border-radius:14px;
    font-weight:600;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    cursor:pointer;
    transition:.3s;
    white-space:nowrap;
}

form button:hover{
    transform:translateY(-2px);
    box-shadow:0 10px 25px rgba(37,99,235,.3);
}

/* ===== Message ===== */
.msg{
    text-align:center;
    margin-bottom:18px;
    padding:12px;
    border-radius:14px;
    background:linear-gradient(90deg,#dcfce7,#f0fdf4);
    border:1px solid #22c55e;
    color:#166534;
    font-weight:600;
}

/* ===== Table Styling ===== */
table{
    width:100%;
    border-collapse:collapse;
    background:white;
    border-radius:16px;
    overflow:hidden;
}

th{
    text-align:left;
    padding:12px;
    background:linear-gradient(90deg,#f0f9ff,#f0fdf4);
    border-bottom:1px solid var(--border);
    font-weight:600;
}

td{
    padding:12px;
    border-bottom:1px solid var(--border);
    font-size:14px;
}

tr:hover{
    background:#f8fafc;
}

/* ===== Responsive ===== */

/* Tablet */
@media(max-width:768px){
    form{
        flex-direction:column;
    }

    form button{
        width:100%;
    }
}

/* Small Mobile */
@media(max-width:500px){

    body{
        padding:15px;
    }

    .container{
        padding:22px;
        border-radius:20px;
    }

    table{
        display:block;
        overflow-x:auto;
        white-space:nowrap;
    }
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
