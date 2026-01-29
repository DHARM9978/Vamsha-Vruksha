<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Create Account</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:"Segoe UI",sans-serif;
}

body{
    min-height:100vh;
    background:#f4f6f8;
    display:flex;
    align-items:center;
    justify-content:center;
}

.signup-card{
    width:100%;
    max-width:420px;
    background:#fff;
    border-radius:18px;
    padding:35px 30px;
    box-shadow:0 15px 40px rgba(0,0,0,0.08);
    animation:fadeSlide 0.6s ease;
}

@keyframes fadeSlide{
    from{opacity:0;transform:translateY(25px);}
    to{opacity:1;transform:translateY(0);}
}

.icon-circle{
    width:60px;
    height:60px;
    background:#eef4ff;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    margin:0 auto 20px;
}

.icon-circle i{
    color:#3b82f6;
    font-size:22px;
}

h1{
    text-align:center;
    font-size:26px;
    color:#111827;
}

.subtitle{
    text-align:center;
    font-size:14px;
    color:#6b7280;
    margin:6px 0 25px;
}

.form-group{
    position:relative;
    margin-bottom:18px;
}

.left-icon{
    position:absolute;
    top:50%;
    left:14px;
    transform:translateY(-50%);
    color:#9ca3af;
    font-size:14px;
}

.form-group input{
    width:100%;
    padding:14px 48px 14px 42px;
    border-radius:10px;
    border:1px solid #e5e7eb;
    outline:none;
    font-size:14px;
    transition:0.3s;
}

.form-group input:focus{
    border-color:#3b82f6;
    box-shadow:0 0 0 3px rgba(59,130,246,0.15);
}

.toggle-password{
    position:absolute;
    right:14px;
    top:50%;
    transform:translateY(-50%);
    cursor:pointer;
    color:#9ca3af;
    transition:0.3s;
}

.toggle-password:hover{
    color:#3b82f6;
    transform:translateY(-50%) scale(1.15);
}

.error{
    font-size:12px;
    color:#ef4444;
    margin-top:4px;
    display:none;
}

.form-group.invalid input{
    border-color:#ef4444;
}

.password-hint{
    font-size:12px;
    color:#6b7280;
    margin:-8px 0 14px;
}

.btn{
    width:100%;
    background:#3b82f6;
    border:none;
    color:#fff;
    padding:14px;
    font-size:15px;
    border-radius:12px;
    cursor:pointer;
    transition:0.3s;
    box-shadow:0 8px 20px rgba(59,130,246,0.35);
}

.btn:hover{
    background:#2563eb;
    transform:translateY(-1px);
}

.login-text{
    text-align:center;
    font-size:14px;
    color:#6b7280;
    margin-top:18px;
}

.login-text a{
    color:#3b82f6;
    font-weight:600;
    text-decoration:none;
}
</style>
</head>
<body>

<div class="signup-card">

    <div class="icon-circle">
        <i class="fa-solid fa-heart"></i>
    </div>

    <h1>Create your account</h1>
    <p class="subtitle">Join our family community today</p>

    <form id="signupForm">

        <!-- Full Name -->
        <div class="form-group">
            <i class="fa-regular fa-user left-icon"></i>
            <input type="text" id="name" placeholder="Full Name">
            <div class="error">Minimum 3 characters required</div>
        </div>

        <!-- Email -->
        <div class="form-group">
            <i class="fa-regular fa-envelope left-icon"></i>
            <input type="email" id="email" placeholder="Email Address">
            <div class="error">Enter valid email address</div>
        </div>

        <!-- Mobile Number -->
        <div class="form-group">
            <i class="fa-solid fa-mobile-screen left-icon"></i>
            <input type="text"
                   id="mobile"
                   placeholder="Mobile Number"
                   maxlength="10"
                   oninput="allowOnlyNumbers(this)">
            <div class="error">Enter 10 digit mobile number</div>
        </div>

        <!-- Password -->
        <div class="form-group">
            <i class="fa-solid fa-lock left-icon"></i>
            <input type="password" id="password" placeholder="Password">
            <i class="fa-regular fa-eye toggle-password"
               onclick="togglePassword('password', this)"></i>
            <div class="error">Password must be strong</div>
        </div>

        <div class="password-hint">
            At least 8 characters, 1 uppercase letter, 1 number
        </div>

        <!-- Confirm Password -->
        <div class="form-group">
            <i class="fa-solid fa-lock left-icon"></i>
            <input type="password"
                   id="confirmPassword"
                   placeholder="Confirm Password"
                   onkeyup="liveConfirmPassword()">
            <i class="fa-regular fa-eye toggle-password"
               onclick="togglePassword('confirmPassword', this)"></i>
            <div class="error">Passwords do not match</div>
        </div>

        <button type="submit" class="btn">Sign Up</button>

    </form>

    <div class="login-text">
        Already have an account? <a href="#">Login</a>
    </div>

</div>

<script>
function togglePassword(id, icon){
    const input = document.getElementById(id);
    if(input.type === "password"){
        input.type = "text";
        icon.classList.replace("fa-eye","fa-eye-slash");
    }else{
        input.type = "password";
        icon.classList.replace("fa-eye-slash","fa-eye");
    }
}

/* Allow only digits in mobile input */
function allowOnlyNumbers(input){
    input.value = input.value.replace(/[^0-9]/g,"");
}

/* Live confirm password validation */
function liveConfirmPassword(){
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword");
    const group = confirm.parentElement;
    const error = group.querySelector(".error");

    if(confirm.value === ""){
        group.classList.remove("invalid");
        error.style.display = "none";
        return;
    }

    if(confirm.value !== password){
        group.classList.add("invalid");
        error.style.display = "block";
    }else{
        group.classList.remove("invalid");
        error.style.display = "none";
    }
}

/* Submit validation */
document.getElementById("signupForm").addEventListener("submit", function(e){
    e.preventDefault();
    let valid = true;

    valid &= validate("name", v => v.length >= 3);
    valid &= validate("email", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    valid &= validate("mobile", v => /^[0-9]{10}$/.test(v));
    valid &= validate("password", v => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(v));
    valid &= validate("confirmPassword", v => v === password.value);

    if(valid){
        alert("Form validated successfully!");
    }
});

function validate(id, rule){
    const input = document.getElementById(id);
    const group = input.parentElement;
    const error = group.querySelector(".error");

    if(!rule(input.value.trim())){
        group.classList.add("invalid");
        error.style.display = "block";
        return false;
    }else{
        group.classList.remove("invalid");
        error.style.display = "none";
        return true;
    }
}
</script>

</body>
</html>
