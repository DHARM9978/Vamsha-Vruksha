<?php
session_start();
include "Pages/conn.php";
include "indexNavbar.php";

/* DATABASE COUNTS */
$families = $conn->query("SELECT COUNT(*) as total FROM family")->fetch_assoc()['total'];
$persons = $conn->query("SELECT COUNT(*) as total FROM person")->fetch_assoc()['total'];
$relations = $conn->query("SELECT COUNT(*) as total FROM family_relation")->fetch_assoc()['total'];
$users = $conn->query("SELECT COUNT(*) as total FROM user_login")->fetch_assoc()['total'];
?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Vamsha Vruksha</title>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <style>
    /* GLOBAL */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "Segoe UI", sans-serif;
    }

    body {
        background: linear-gradient(135deg, #e0f2fe, #dcfce7);
        min-height: 100vh;
        overflow-x: hidden;
    }

    /* HERO */
    .hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 60px 8%;
        gap: 40px;
        flex-wrap: wrap;
    }

    /* TEXT */
    .hero-text {
        flex: 1;
        min-width: 280px;
        max-width: 500px;
    }

    .hero-text h1 {
        font-size: clamp(28px, 4vw, 38px);
        margin-bottom: 15px;
    }

    .hero-text p {
        font-size: clamp(14px, 2vw, 16px);
        color: #555;
        margin-bottom: 20px;
        line-height: 1.6;
    }

    /* BUTTON */
    .btn {
        background: linear-gradient(135deg, #3b82f6, #22c55e);
        color: white;
        padding: 10px 22px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 600;
        display: inline-block;
        transition: 0.3s;
    }

    .btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    /* IMAGE */
    .hero-image {
        flex: 1;
        display: flex;
        justify-content: center;
        position: relative;
        min-width: 280px;
    }

    /* GLOW */
    .hero-image::before {
        content: "";
        position: absolute;
        width: clamp(300px, 40vw, 520px);
        height: clamp(300px, 40vw, 520px);
        background: radial-gradient(circle, rgba(34, 197, 94, 0.25), transparent 70%);
        z-index: 0;
    }

    /* IMAGE */
    .hero-image img {
        width: clamp(280px, 40vw, 460px);
        max-width: 100%;
        position: relative;
        z-index: 1;
        animation: float 4s ease-in-out infinite;
    }

    /* STATS */
    .stats {
        padding: 50px 8%;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .card {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        padding: 25px;
        border-radius: 18px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        transition: 0.3s;
    }

    .card:hover {
        transform: translateY(-6px) scale(1.02);
    }

    .card i {
        font-size: 28px;
        color: #2563eb;
        margin-bottom: 10px;
    }

    .card h2 {
        font-size: 26px;
    }

    /* FEATURES */
    .features {
        padding: 60px 8%;
        text-align: center;
    }

    .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-top: 30px;
    }

    .feature {
        background: white;
        padding: 25px;
        border-radius: 18px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        transition: 0.3s;
    }

    .feature:hover {
        transform: translateY(-5px);
    }

    .feature i {
        font-size: 28px;
        color: #2563eb;
        margin-bottom: 10px;
    }

    /* FOOTER */
    .footer {
        background: #111;
        color: white;
        padding: 30px;
        text-align: center;
        margin-top: 40px;
    }

    .footer-links a {
        color: white;
        margin: 0 10px;
        text-decoration: none;
    }

    /* ANIMATION */
    @keyframes float {
        0% {
            transform: translateY(0)
        }

        50% {
            transform: translateY(-12px)
        }

        100% {
            transform: translateY(0)
        }
    }

    /* 🔥 TABLET */
    @media(max-width:1024px) {
        .hero {
            flex-direction: column;
            text-align: center;
        }

        .hero-text {
            max-width: 100%;
        }

        .hero-image {
            margin-top: 20px;
        }
    }

    /* 🔥 MOBILE */
    @media(max-width:600px) {

        .hero {
            padding: 40px 5%;
        }

        .btn {
            padding: 10px 18px;
            font-size: 14px;
        }

        .stats {
            padding: 40px 5%;
        }

        .features {
            padding: 40px 5%;
        }

    }
    </style>

</head>

<body>

    <!-- HERO -->
    <section class="hero">

        <div class="hero-text">
            <h1>Discover Your Family Heritage</h1>

            <p>
                Vamsha Vruksha helps families digitally preserve their lineage,
                track relationships, and visualize generations through an
                interactive family tree.
            </p>

            <a href="Pages/login.php" class="btn">Explore Family Tree</a>
        </div>

        <div class="hero-image">
            <img src="Images/ChatGPT Image Mar 18, 2026, 11_58_44 AM.png" alt="Family Tree">
        </div>

    </section>

    <!-- STATS -->
    <section class="stats">

        <div class="card">
            <i class="fa-solid fa-people-group"></i>
            <h2><?php echo $families; ?></h2>
            <p>Total Families</p>
        </div>

        <div class="card">
            <i class="fa-solid fa-user"></i>
            <h2><?php echo $persons; ?></h2>
            <p>Total Persons</p>
        </div>

        <div class="card">
            <i class="fa-solid fa-diagram-project"></i>
            <h2><?php echo $relations; ?></h2>
            <p>Total Relations</p>
        </div>

        <div class="card">
            <i class="fa-solid fa-user-shield"></i>
            <h2><?php echo $users; ?></h2>
            <p>Total Users</p>
        </div>

    </section>

    <!-- FEATURES -->
    <section class="features">

        <h2>System Features</h2>

        <div class="feature-grid">

            <div class="feature">
                <i class="fa-solid fa-tree"></i>
                <h3>Family Tree Visualization</h3>
                <p>Explore your family hierarchy visually.</p>
            </div>

            <div class="feature">
                <i class="fa-solid fa-users"></i>
                <h3>Manage Members</h3>
                <p>Add and update family members easily.</p>
            </div>

            <div class="feature">
                <i class="fa-solid fa-diagram-project"></i>
                <h3>Relationship Mapping</h3>
                <p>Maintain accurate family relationships.</p>
            </div>

            <div class="feature">
                <i class="fa-solid fa-shield-halved"></i>
                <h3>Secure Access</h3>
                <p>Admin and user role-based system.</p>
            </div>

        </div>

    </section>

    <!-- FOOTER -->
    <div class="footer">
        <p>© <?php echo date("Y"); ?> Vamsha Vruksha System</p>

        <div class="footer-links">
            <a href="#">About</a>
            <a href="#">Contact</a>
        </div>
    </div>

</body>

</html>