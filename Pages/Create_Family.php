    <?php
    include "conn.php";
    require "Navbar.php";

    if(isset($_POST['create_family'])){

        $conn->begin_transaction();

        try{

            $familyName = $_POST['family_name'];

            $stmt = $conn->prepare("
                INSERT INTO FAMILY (Family_Name, Native_Place, Head_DOB, Gotra_Id)
                VALUES (?,?,?,?)
            ");
            $stmt->bind_param("sssi",
                $familyName,
                $_POST['native'],
                $_POST['dob'],
                $_POST['gotra']
            );
            $stmt->execute();

            $familyId = $conn->insert_id;

            $stmt = $conn->prepare("
                INSERT INTO PERSON
                (Family_Id, First_Name, Last_Name, Gender, DOB, Phone_Number, Mobile_Number, Email,
                Original_Native, Current_Address,
                Gotra_Id, Sutra_Id, Panchang_Sudhi_Id, Vamsha_Id,
                Mane_Devru_Id, Kula_Devatha_Id, Pooja_Vruksha_Id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");

            $stmt->bind_param("issssssssiiiiiiii",
                $familyId,
                $_POST['first_name'], $_POST['last_name'], $_POST['gender'], $_POST['dob'],
                $_POST['phone'], $_POST['mobile'], $_POST['email'],
                $_POST['native'], $_POST['address'],
                $_POST['gotra'], $_POST['sutra'], $_POST['panchang'],
                $_POST['vamsha'], $_POST['mane_devru'], $_POST['kula_devatha'], $_POST['pooja_vruksha']
            );

            $stmt->execute();

            $conn->commit();
            $success = "Family created successfully.";

        } catch(Exception $e){
            $conn->rollback();
            $success = "Error creating family.";
        }
    }

    function loadOptions($conn,$table,$id,$name){
        $r=$conn->query("SELECT $id,$name FROM $table ORDER BY $name");
        while($row=$r->fetch_assoc()){
            echo "<option value='{$row[$id]}'>{$row[$name]}</option>";
        }
    }
    ?>

    <!DOCTYPE html>
    <html>
    <head>
    <title>Create Family</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
/* ===========================================
   🌿 VAMSHA VRUKSHA - CREATE FAMILY (PRO UI)
   =========================================== */

:root{
    --primary-blue:#2563eb;
    --primary-green:#22c55e;
    --light-blue:#e0f2fe;
    --light-green:#ecfdf5;
    --border:#dbeafe;
    --soft-bg:#f8fafc;
}

/* ===== Global Reset ===== */
*{
    box-sizing:border-box;
}

html, body{
    margin:0;
    padding:0;
    width:100%;
    overflow-x:hidden;
    font-family:'Segoe UI',sans-serif;
    background:linear-gradient(135deg,var(--light-blue),var(--light-green));
}

/* Hide scrollbar but allow scroll */
html::-webkit-scrollbar,
body::-webkit-scrollbar{
    display:none;
}
body{
    scrollbar-width:none;
    -ms-overflow-style:none;
}

/* ===== Wrapper ===== */
.wrapper{
    padding:120px 20px 60px;
    display:flex;
    justify-content:center;
}

/* ===== Glass Container ===== */
.container{
    width:100%;
    max-width:1000px;
    background:rgba(255,255,255,0.92);
    backdrop-filter:blur(18px);
    border-radius:24px;
    padding:clamp(25px,4vw,45px);
    box-shadow:0 25px 70px rgba(0,0,0,0.08);
    animation:fadeUp .6s ease;
}

/* ===== Animation ===== */
@keyframes fadeUp{
    from{opacity:0; transform:translateY(20px);}
    to{opacity:1; transform:translateY(0);}
}

/* ===== Heading ===== */
h2{
    text-align:center;
    font-size:clamp(20px,4vw,28px);
    margin-bottom:30px;
    background:linear-gradient(90deg,var(--primary-blue),var(--primary-green));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* ===== Grid ===== */
.grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:18px;
}

/* Full width utility */
.full{
    grid-column:1 / -1;
}

/* ===== Inputs & Selects ===== */
input, select{
    width:100%;
    padding:14px 16px;
    border-radius:14px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    font-size:14px;
    transition:.3s ease;
    min-width:0;
}

input:focus, select:focus{
    border-color:var(--primary-blue);
    box-shadow:0 0 0 3px rgba(37,99,235,0.15);
    outline:none;
    background:white;
}

/* ===== Button ===== */
button{
    width:100%;
    padding:16px;
    border:none;
    border-radius:16px;
    font-weight:600;
    font-size:15px;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    cursor:pointer;
    transition:.3s ease;
}

button:hover{
    transform:translateY(-2px);
    box-shadow:0 12px 30px rgba(37,99,235,0.3);
}

/* ===== Message ===== */
.msg{
    text-align:center;
    padding:14px;
    border-radius:14px;
    margin-bottom:22px;
    background:#dcfce7;
    color:#166534;
    font-weight:600;
}

/* ===== Responsive Breakpoints ===== */

/* Tablet */
@media(max-width:900px){
    .grid{
        grid-template-columns:1fr 1fr;
    }
}

/* Mobile */
@media(max-width:768px){
    .grid{
        grid-template-columns:1fr;
    }

    .full{
        grid-column:1;
    }

    .container{
        padding:22px;
        border-radius:20px;
    }
}

/* Small Mobile */
@media(max-width:480px){
    .wrapper{
        padding:100px 15px 40px;
    }

    h2{
        font-size:18px;
    }

    button{
        font-size:14px;
    }
}

    </style>
    </head>

    <body>

    <div class="wrapper">
    <div class="container">

    <h2>Create Family (with Head Person)</h2>

    <?php if(!empty($success)): ?>
    <div class="msg"><?= $success ?></div>
    <?php endif; ?>

    <form method="post" class="grid">

    <input name="family_name" placeholder="Family Name" required class="full">

    <input name="first_name" placeholder="Head First Name" required>
    <input name="last_name" placeholder="Head Last Name">

    <select name="gender">
    <option value="Male">Male</option>
    <option value="Female">Female</option>
    </select>

    <input type="date" name="dob">

    <input name="phone" placeholder="Phone">
    <input name="mobile" placeholder="Mobile">
    <input name="email" placeholder="Email">

    <input name="native" placeholder="Native Place">
    <input name="address" placeholder="Current Address" class="full">

    <select name="gotra">
    <option value="">Select Gotra</option>
    <?php loadOptions($conn,"Gothra","Gotra_Id","Gotra_Name"); ?>
    </select>

    <select name="sutra">
    <option value="">Select Sutra</option>
    <?php loadOptions($conn,"Sutra","Sutra_Id","Sutra_Name"); ?>
    </select>

    <select name="panchang">
    <option value="">Select Panchang</option>
    <?php loadOptions($conn,"Panchang_Sudhi","Panchang_Sudhi_Id","Panchang_Sudhi_Name"); ?>
    </select>

    <select name="vamsha">
    <option value="">Select Vamsha</option>
    <?php loadOptions($conn,"Vamsha","Vamsha_Id","Vamsha_Name"); ?>
    </select>

    <select name="mane_devru">
    <option value="">Select Mane Devru</option>
    <?php loadOptions($conn,"Mane_Devru","Mane_Devru_Id","Mane_Devru_Name"); ?>
    </select>

    <select name="kula_devatha">
    <option value="">Select Kula Devatha</option>
    <?php loadOptions($conn,"Kula_Devatha","Kula_Devatha_Id","Kula_Devatha_Name"); ?>
    </select>

    <select name="pooja_vruksha" class="full">
    <option value="">Select Pooja Vruksha</option>
    <?php loadOptions($conn,"Pooja_Vruksha","Pooja_Vruksha_Id","Pooja_Vruksha_Name"); ?>
    </select>

    <button name="create_family" class="full">Create Family</button>

    </form>

    </div>
    </div>

    </body>
    </html>
