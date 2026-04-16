<?php
ob_start();

include "auth_check.php";
include "conn.php";
include "Navbar.php";

$user_id = $_SESSION['user_id'];

/* FETCH USER */
$stmt = $conn->prepare("SELECT * FROM user_login WHERE user_id=?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

/* UPDATE LOGIC */
if(isset($_POST['update'])){
    $stmt = $conn->prepare("
        UPDATE user_login 
        SET user_name=?, user_phone_number=? 
        WHERE user_id=?
    ");

    $stmt->bind_param("ssi",
        $_POST['name'],
        $_POST['mobile'],
        $user_id
    );

    $stmt->execute();

    echo "<script>alert('Profile Updated Successfully');window.location='profile.php';</script>";
    exit;
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Profile</title>
    <link rel="stylesheet" href="../CSS/person_css.css">

    <style>
    body {
        background: linear-gradient(120deg, #e0f2fe, #f0fdf4);
        font-family: 'Segoe UI', sans-serif;
    }

    .profile-container {
        width: 90%;
        max-width: 900px;
        margin: 145px auto;
        background: white;
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }

    .profile-header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
    }

    .profile-img {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        border: 3px solid #e0f2fe;
    }

    .profile-name {
        font-size: 22px;
        font-weight: 600;
        color: #1e293b;
    }

    .profile-role {
        color: #64748b;
        font-size: 14px;
    }

    .section-title {
        margin-top: 25px;
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #334155;
    }

    .profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 15px;
    }

    .card {
        padding: 12px 15px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
    }

    .label {
        font-size: 12px;
        color: #64748b;
    }

    .value {
        font-size: 14px;
        font-weight: 500;
        color: #1e293b;
        margin-top: 3px;
    }

    .btns {
        margin-top: 25px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .btn {
        flex: 1;
        padding: 12px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #3b82f6, #06b6d4);
        color: white;
        font-weight: 600;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
    }

    .logout {
        background: linear-gradient(135deg, #ef4444, #f97316);
    }

    input {
        width: 100%;
        padding: 8px;
        margin-top: 5px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
    }
    </style>
</head>

<body>

<div class="profile-container">

    <div class="profile-header">
        <img src="../Images/no image.webp" class="profile-img">

        <div>
            <div class="profile-name"><?php echo $user['user_name']; ?></div>
            <div class="profile-role"><?php echo $user['role']; ?></div>
        </div>
    </div>

    <div class="section-title">Account Details</div>

    <div class="profile-grid">
        <div class="card">
            <div class="label">Email</div>
            <div class="value"><?php echo $user['user_email']; ?></div>
        </div>

        <div class="card">
            <div class="label">Phone</div>
            <div class="value"><?php echo $user['user_phone_number']; ?></div>
        </div>
    </div>

    <!-- EDIT PANEL -->
    <div id="editPanel" style="display:none; margin-top:20px;">

        <div class="section-title">Edit Profile</div>

        <form method="POST">

            <div class="profile-grid">

                <div class="card">
                    <div class="label">Name</div>
                    <input type="text" name="name" value="<?php echo $user['user_name']; ?>">
                </div>

                <div class="card">
                    <div class="label">Mobile</div>
                    <input type="text" name="mobile" value="<?php echo $user['user_phone_number']; ?>">
                </div>

                <div class="card">
                    <div class="label">Email (Cannot Edit)</div>
                    <input type="text" value="<?php echo $user['user_email']; ?>" disabled>
                </div>

            </div>

            <div class="btns">
                <button type="submit" name="update" class="btn">Save Changes</button>
            </div>

        </form>

    </div>

    <div class="btns">
        <button onclick="toggleEdit()" class="btn">Edit Profile</button>
        <a href="logout.php" class="btn logout">Logout</a>
    </div>

</div>

<script>
function toggleEdit(){
    let panel = document.getElementById("editPanel");
    panel.style.display = (panel.style.display === "none") ? "block" : "none";
}
</script>

</body>
</html>