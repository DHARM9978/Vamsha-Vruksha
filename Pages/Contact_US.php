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
   
   
/* ===== GLOBAL ===== */
body{
    margin:0;
    font-family:'Segoe UI',sans-serif;
    background:linear-gradient(135deg,#e0f2fe,#ecfdf5);
    overflow-x:hidden;
}

/* ===== HERO ===== */
.hero{
    text-align:center;
    padding:clamp(40px,6vw,70px) 5%;
    animation:fadeUp 0.6s ease;
}

.hero h1{
    font-size:clamp(28px,5vw,42px);
    margin-bottom:10px;
}

.hero p{
    color:#555;
    font-size:clamp(14px,2vw,18px);
}

/* ===== MAIN WRAPPER ===== */
.contact-wrapper{
    max-width:1200px;
    margin:auto;
    padding:clamp(30px,5vw,60px) 5%;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:30px;
}

/* ===== LEFT SIDE (INFO CARDS) ===== */
.contact-info{
    display:flex;
    flex-direction:column;
    gap:20px;
}

/* CARD */
.contact-card{
    background:rgba(255,255,255,0.9);
    padding:20px;
    border-radius:20px;
    display:flex;
    gap:15px;
    align-items:center;

    backdrop-filter:blur(12px);
    box-shadow:0 10px 25px rgba(0,0,0,0.08);
    transition:0.3s;
    animation:fadeLeft 0.6s ease;
}

/* ICON */
.contact-card i{
    font-size:22px;
    color:#2563eb;
}

/* TEXT */
.contact-card h3{
    margin:0;
}

.contact-card p{
    margin:2px 0 0;
    color:#555;
}

/* HOVER */
.contact-card:hover{
    transform:translateY(-5px) scale(1.02);
    box-shadow:0 15px 35px rgba(0,0,0,0.15);
}

/* ===== RIGHT SIDE (FORM) ===== */
.contact-form{
    background:rgba(255,255,255,0.95);
    padding:30px;
    border-radius:20px;
    backdrop-filter:blur(14px);

    box-shadow:0 15px 40px rgba(0,0,0,0.1);
    animation:fadeRight 0.6s ease;
}

/* FORM TITLE */
.contact-form h2{
    margin-bottom:20px;
    background:linear-gradient(90deg,#2563eb,#22c55e);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* INPUT GROUP */
.input-group{
    margin-bottom:18px;
}

/* INPUT + TEXTAREA */
.input-group input,
.input-group textarea{
    width:100%;
    padding:12px 14px;
    border-radius:12px;
    border:1px solid #ccc;
    font-size:14px;
    transition:0.3s;
}

/* FOCUS EFFECT */
.input-group input:focus,
.input-group textarea:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,0.2);
    outline:none;
}

/* TEXTAREA */
.input-group textarea{
    resize:none;
    height:100px;
}

/* BUTTON */
.contact-form button{
    width:100%;
    padding:14px;
    border:none;
    border-radius:12px;
    background:linear-gradient(135deg,#2563eb,#22c55e);
    color:white;
    font-weight:600;
    cursor:pointer;
    transition:0.3s;
}

/* BUTTON HOVER */
.contact-form button:hover{
    transform:scale(1.03);
    box-shadow:0 12px 30px rgba(0,0,0,0.2);
}

/* ===== EXTRA SECTION (WHY CONTACT US BOX) ===== */
.extra-box{
    margin-top:20px;
    padding:25px;
    border-radius:20px;
    background:linear-gradient(135deg,#2563eb,#22c55e);
    color:white;
    text-align:center;
}

/* ===== ANIMATIONS ===== */
@keyframes fadeUp{
    from{opacity:0; transform:translateY(30px);}
    to{opacity:1; transform:translateY(0);}
}

@keyframes fadeLeft{
    from{opacity:0; transform:translateX(-40px);}
    to{opacity:1; transform:translateX(0);}
}

@keyframes fadeRight{
    from{opacity:0; transform:translateX(40px);}
    to{opacity:1; transform:translateX(0);}
}

/* ===== RESPONSIVE ===== */

/* TABLET */
@media(max-width:900px){

    .contact-wrapper{
        grid-template-columns:1fr;
    }

    .contact-form{
        margin-top:10px;
    }
}

/* MOBILE */
@media(max-width:600px){

    .hero{
        padding:40px 5%;
    }

    .contact-card{
        flex-direction:column;
        text-align:center;
    }

    .contact-form{
        padding:20px;
    }

    .contact-form button{
        padding:12px;
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