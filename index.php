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
    /* ===== GLOBAL ===== */
    body {
        margin: 0;
        font-family: 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #e0f2fe, #ecfdf5);
        overflow-x: hidden;
    }

    /* ===== HERO SECTION ===== */
    .hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: clamp(40px, 6vw, 80px) 8%;
        gap: 40px;
        flex-wrap: wrap;
        /* prevents overflow */
    }

    /* HERO TEXT */
    .hero-text {
        flex: 1;
        min-width: 280px;
        max-width: 550px;
        animation: fadeLeft 0.8s ease;
    }

    .hero-text h1 {
        font-size: clamp(28px, 5vw, 48px);
        margin-bottom: 15px;
        line-height: 1.2;
    }

    .hero-text p {
        font-size: clamp(14px, 2vw, 18px);
        color: #555;
        line-height: 1.6;
        margin-bottom: 25px;
    }

    /* BUTTON */
    .hero-btn {
        display: inline-block;
        padding: 12px 26px;
        border-radius: 30px;
        background: linear-gradient(135deg, #2563eb, #22c55e);
        color: white;
        font-weight: 600;
        text-decoration: none;
        transition: 0.3s;
    }

    .hero-btn:hover {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    }

    /* HERO IMAGE */
    .hero-image {
        flex: 1;
        display: flex;
        justify-content: center;
        animation: fadeRight 0.8s ease;
    }

    .hero-image img {
        width: 100%;
        max-width: 420px;
        height: auto;
    }

    /* ===== STATS SECTION ===== */
    .stats {
        padding: clamp(40px, 6vw, 70px) 8%;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 25px;
    }

    /* CARD */
    .card {
        background: rgba(255, 255, 255, 0.9);
        padding: 25px;
        border-radius: 18px;
        text-align: center;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        transition: 0.3s;
        animation: fadeUp 0.6s ease;
    }

    .card i {
        font-size: 28px;
        margin-bottom: 10px;
        color: #2563eb;
    }

    .card h2 {
        margin: 10px 0;
    }

    .card:hover {
        transform: translateY(-6px) scale(1.03);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    /* ===== FEATURES ===== */
    .features {
        padding: clamp(40px, 6vw, 70px) 8%;
        text-align: center;
    }

    .features h2 {
        font-size: clamp(22px, 4vw, 32px);
        margin-bottom: 20px;
    }

    /* GRID */
    .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 25px;
    }

    /* FEATURE CARD */
    .feature {
        background: rgba(255, 255, 255, 0.9);
        padding: 25px;
        border-radius: 20px;
        backdrop-filter: blur(12px);
        transition: 0.3s;
        animation: fadeUp 0.6s ease;
    }

    .feature i {
        font-size: 28px;
        color: #22c55e;
        margin-bottom: 10px;
    }

    .feature:hover {
        transform: translateY(-8px) scale(1.03);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
    }

    /* ===== FOOTER ===== */
    .footer {
        margin-top: 40px;
        background: #111;
        color: white;
        padding: 30px;
        text-align: center;
    }

    .footer-links {
        margin-top: 10px;
    }

    .footer-links a {
        color: #ccc;
        margin: 0 10px;
        text-decoration: none;
    }

    .footer-links a:hover {
        color: white;
    }

    /* ===== ANIMATIONS ===== */
    @keyframes fadeLeft {
        from {
            opacity: 0;
            transform: translateX(-40px);
        }

        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeRight {
        from {
            opacity: 0;
            transform: translateX(40px);
        }

        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* ===== RESPONSIVE ===== */

    /* TABLET */
    @media(max-width:900px) {

        .hero {
            flex-direction: column;
            text-align: center;
        }

        .hero-image img {
            max-width: 300px;
        }
    }

    /* MOBILE */
    @media(max-width:600px) {

        .hero {
            padding: 40px 5%;
        }

        .hero-text h1 {
            font-size: 24px;
        }

        .hero-text p {
            font-size: 14px;
        }

        .hero-btn {
            padding: 10px 20px;
            font-size: 14px;
        }

        .card {
            padding: 20px;
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

            <a href="Pages/login.php" class="hero-btn">Explore Family Tree</a>
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