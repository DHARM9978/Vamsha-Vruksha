<?php
if(session_status() === PHP_SESSION_NONE){
    session_start();
}
?>

<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vamsha Vruksha</title>

    <style>
    /* ===== RESET ===== */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: Arial, sans-serif;
    }

    /* ===== NAVBAR ===== */
    .navbar {
        width: 100%;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;

        display: flex;
        justify-content: space-between;
        align-items: center;

        padding: 18px 40px;

        background: linear-gradient(135deg, #e0f2fe, #ecfdf5);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .brand {
        font-size: 22px;
        font-weight: 700;
        color: #2563eb;
    }

    .menu-btn {
        font-size: 28px;
        cursor: pointer;
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
        position: fixed;
        top: 0;
        right: -300px;
        width: 280px;
        height: 100vh;

        background: white;
        box-shadow: -5px 0 20px rgba(0, 0, 0, 0.2);

        padding: 30px 20px;
        transition: 0.4s ease;
        z-index: 1001;

        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .sidebar.active {
        right: 0;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
    }

    .sidebar-header span {
        font-size: 18px;
        font-weight: 600;
    }

    .close-btn {
        font-size: 20px;
        cursor: pointer;
    }

    /* ===== LINKS ===== */
    .sidebar a {
        text-decoration: none;
        padding: 12px;
        margin-bottom: 5px;
        border-radius: 8px;
        color: #111;
        transition: 0.3s;
    }

    .sidebar a:hover {
        background: #2563eb;
        color: white;
    }

    /* ===== DROPDOWN ===== */
    .dropdown-btn {
        padding: 12px;
        cursor: pointer;
        /* font-weight: 600; */
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 8px;
        transition: 0.3s;
    }

    .dropdown-btn:hover {
        background: #2563eb;
        color: white;
    }

    .arrow {
        transition: 0.3s;
    }

    .dropdown-btn.active .arrow {
        transform: rotate(90deg);
    }

    .dropdown-content {
        display: none;
        padding-left: 10px;
    }

    .dropdown-content a {
        display: block;
        padding: 10px 12px;
        margin-bottom: 5px;
        border-radius: 6px;
        color: #111;
    }

    .dropdown-content a:hover {
        background: #2563eb;
        color: white;
    }

    /* ===== OVERLAY ===== */
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transition: 0.3s;
        z-index: 1000;
    }

    .overlay.active {
        opacity: 1;
        visibility: visible;
    }
    </style>
</head>

<body>

    <!-- NAVBAR -->
    <div class="navbar">
        <div class="brand">🌿 Vamsha Vruksha</div>
        <div class="menu-btn" onclick="toggleSidebar()">☰</div>
    </div>

    <!-- SIDEBAR -->
    <div id="sidebar" class="sidebar">

        <div class="sidebar-header">
            <span>Menu</span>
            <span class="close-btn" onclick="toggleSidebar()">✕</span>
        </div>

        <div style="margin-bottom:15px">
            Welcome, <b><?php echo $_SESSION['user_name']; ?></b>
        </div>

        <?php if($_SESSION['role'] == "Admin"){ ?>

        <!-- FAMILY -->
        <div>
            <div class="dropdown-btn" onclick="toggleDropdown(this)">
                Family Management
                <span class="arrow">></span>
            </div>
            <div class="dropdown-content">
                <a href="./Create_Family.php">Create Family</a>
                <a href="./Edit_Family.php">Edit Family</a>
            </div>
        </div>

        <hr style="margin:1px 0;">
        <!-- PERSON -->
        <div>
            <div class="dropdown-btn" onclick="toggleDropdown(this)">
                Person Management
                <span class="arrow">></span>
            </div>
            <div class="dropdown-content">
                <a href="./Add_Person.php">Add Person</a>
                <a href="./edit_person.php">Edit Person</a>
                <a href="./Add_Relation.php">Add Relation</a>
            </div>
        </div>

        <hr style="margin:1px 0;">
        <!-- SPIRITUAL -->
        <div>
            <div class="dropdown-btn" onclick="toggleDropdown(this)">
                Spiritual Data
                <span class="arrow">></span>
            </div>
            <div class="dropdown-content">
                <a href="./Add_Gothara.php">Gotra</a>

                <a href="./Add_Sutra.php">Sutra</a>
                <a href="./Add_Kula_Devatha.php">Kula Devatha</a>
                <a href="./Add_Mane_Devaru.php">Mane Devru</a>
                <a href="./Add_Panchang_Sudhi.php">Panchang</a>
                <a href="./Add_Puja_Vruksha.php">Pooja Vruksha</a>
                <a href="./Add_Vamsha.php">Vamsha</a>
            </div>
        </div>

        <hr style="margin:1px 0;">
        <a href="./Family_Tree.php">Family Tree</a>

        <hr style="margin:1px 0;">
        <a href="./Family_Details.php">Family Details</a>

        <hr style="margin:1px 0;">

        <a href="./Add_Admin.php">Add Admin/User</a>

        <?php } else { ?>

        <a href="./Family_Tree.php">Family Tree</a>

        <hr style="margin:1px 0;">
        <a href="./Family_Details.php">Family Details</a>

        <?php } ?>


        <hr style="margin:1px 0;">

        <a href="./profile.php">Profile</a>
        <hr style="margin:1px 0;">
        <a href="./Change_Password.php">Change Password</a>
        <hr style="margin:1px 0;">
        <a href="./Logout.php">Logout</a>

    </div>

    <!-- OVERLAY -->
    <div id="overlay" class="overlay" onclick="toggleSidebar()"></div>

    <script>
    /* Sidebar Toggle */
    function toggleSidebar() {
        document.getElementById("sidebar").classList.toggle("active");
        document.getElementById("overlay").classList.toggle("active");
    }

    /* Accordion Dropdown */
    function toggleDropdown(el) {

        let content = el.nextElementSibling;
        let isOpen = content.style.display === "block";

        // Close all
        document.querySelectorAll(".dropdown-content").forEach(d => d.style.display = "none");
        document.querySelectorAll(".dropdown-btn").forEach(b => b.classList.remove("active"));

        // If it was NOT open → open it
        if (!isOpen) {
            content.style.display = "block";
            el.classList.add("active");
        }
    }

    /* Fix back button cache */
    window.addEventListener("pageshow", function(event) {
        if (event.persisted) {
            window.location.reload();
        }
    });
    </script>

</body>

</html>