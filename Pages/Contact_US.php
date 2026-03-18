<?php
session_start();
require "../indexNavbar.php";
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - Vamsha Vruksha</title>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "Segoe UI", sans-serif;
    }

    body {
        background: linear-gradient(135deg, #e0f2fe, #dcfce7);
        min-height: 100vh;
    }

    /* HERO */
    .hero {
        text-align: center;
        padding: 60px 5% 30px;
    }

    .hero h1 {
        font-size: clamp(28px, 5vw, 42px);
        margin-bottom: 10px;
    }

    .hero p {
        color: #555;
        font-size: clamp(14px, 2vw, 18px);
    }

    /* MAIN SECTION */
    .contact-wrapper {
        max-width: 1200px;
        margin: auto;
        padding: 40px 5%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
    }

    /* LEFT SIDE */
    .contact-info {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .contact-card {
        background: rgba(255, 255, 255, 0.85);
        padding: 20px;
        border-radius: 18px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        transition: 0.3s;
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .contact-card:hover {
        transform: translateY(-5px);
    }

    .contact-card i {
        font-size: 24px;
        color: #2563eb;
    }

    /* FORM */
    .contact-form {
        background: rgba(255, 255, 255, 0.9);
        padding: 25px;
        border-radius: 20px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
    }

    .contact-form h2 {
        margin-bottom: 15px;
        color: #2563eb;
    }

    .input-group {
        margin-bottom: 15px;
    }

    .input-group label {
        font-size: 14px;
        color: #333;
    }

    .input-group input,
    .input-group textarea {
        width: 100%;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid #ccc;
        margin-top: 5px;
        font-size: 14px;
    }

    .contact-form button {
        width: 100%;
        background: linear-gradient(135deg, #3b82f6, #22c55e);
        border: none;
        color: white;
        padding: 12px;
        border-radius: 10px;
        font-size: 15px;
        cursor: pointer;
        transition: 0.3s;
    }

    .contact-form button:hover {
        transform: scale(1.02);
    }

    /* EXTRA */
    .extra {
        margin-top: 20px;
        padding: 20px;
        background: linear-gradient(135deg, #3b82f6, #22c55e);
        border-radius: 15px;
        color: white;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }

    /* FOOTER */
    .footer {
        background: #111;
        color: white;
        padding: 30px;
        text-align: center;
        margin-top: 30px;
    }

    /* 🔥 TABLET */
    @media(max-width:1024px) {
        .contact-wrapper {
            grid-template-columns: 1fr;
        }
    }

    /* 🔥 MOBILE */
    @media(max-width:600px) {

        .navbar {
            flex-direction: column;
            gap: 10px;
        }

        .nav-links {
            justify-content: center;
        }

        .contact-card {
            flex-direction: column;
            text-align: center;
        }

        .contact-form {
            padding: 20px;
        }

    }
    </style>
</head>

<body>


    <!-- HERO -->
    <section class="hero">
        <h1>Get In Touch</h1>
        <p>Start building your family tree with us today</p>
    </section>

    <!-- CONTACT SECTION -->
    <div class="contact-wrapper">

        <!-- LEFT -->
        <div class="contact-info">

            <div class="contact-card">
                <i class="fa-solid fa-location-dot"></i>
                <div>
                    <h3>Location</h3>
                    <p>Bangalore, India</p>
                </div>
            </div>

            <div class="contact-card">
                <i class="fa-solid fa-envelope"></i>
                <div>
                    <h3>Email</h3>
                    <p>support@vamshavruksha.com</p>
                </div>
            </div>

            <div class="contact-card">
                <i class="fa-solid fa-phone"></i>
                <div>
                    <h3>Phone</h3>
                    <p>+91 9876543210</p>
                </div>
            </div>

            <div class="extra">
                <h3>Why Contact Us?</h3>
                <p>We help you digitize your family heritage with ease.</p>
            </div>

        </div>

        <!-- RIGHT FORM -->
        <div class="contact-form">
            <h2>Send Request</h2>
            <form method="POST">

                <div class="input-group">
                    <label>Full Name</label>
                    <input type="text" name="name" required>
                </div>

                <div class="input-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>

                <div class="input-group">
                    <label>Family / Gothra</label>
                    <input type="text" name="family">
                </div>

                <div class="input-group">
                    <label>Message</label>
                    <textarea name="message" rows="5"></textarea>
                </div>

                <button type="submit">Submit Request</button>

            </form>
        </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
        <p>© <?php echo date("Y"); ?> Vamsha Vruksha System</p>
    </div>

</body>

</html>