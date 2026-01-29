<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Login</title>
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

.login-card{
    width:100%;
    max-width:420px;
    background:#fff;
    border-radius:18px;
    padding:35px 30px;
    box-shadow:0 15px 40px rgba(0,0,0,0.08);
    animation:fadeUp 0.6s ease;
}

@keyframes fadeUp{
    from{opacity:0;transform:translateY(30px);}
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

.form-group input::placeholder{
    color:#9ca3af;
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

.options{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin:10px 0 20px;
    font-size:14px;
}

.options label{
    display:flex;
    align-items:center;
    gap:8px;
    color:#6b7280;
}

.options a{
    color:#3b82f6;
    text-decoration:none;
    font-weight:500;
}

.options a:hover{
    text-decoration:underline;
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

.login-text a:hover{
    text-decoration:underline;
}
</style>
</head>
<body>

<div class="login-card">

    <div class="icon-circle">
        <i class="fa-solid fa-heart"></i>
    </div>

    <h1>Welcome back</h1>
    <p class="subtitle">Please enter your details to sign in</p>

    <form id="loginForm">

        <!-- Email -->
        <div class="form-group">
            <i class="fa-regular fa-envelope left-icon"></i>
            <input type="email" id="email" placeholder="Email Address">
            <div class="error">Enter a valid email address</div>
        </div>

        <!-- Password -->
        <div class="form-group">
            <i class="fa-solid fa-lock left-icon"></i>
            <input type="password" id="password" placeholder="Password">
            <i class="fa-regular fa-eye toggle-password"
               onclick="togglePassword(this)"></i>
            <div class="error">Password is required (min 6 characters)</div>
        </div>

        <!-- Remember & Forgot -->
        <div class="options">
            <label>
                <input type="checkbox">
                Remember me
            </label>
            <a href="#">Forgot Password?</a>
        </div>

        <button type="submit" class="btn">Login</button>

    </form>

    <div class="login-text">
        Don't have an account?
        <a href="#">Sign Up</a>
    </div>

</div>

<script>
function togglePassword(icon){
    const input = document.getElementById("password");
    if(input.type === "password"){
        input.type = "text";
        icon.classList.replace("fa-eye","fa-eye-slash");
    }else{
        input.type = "password";
        icon.classList.replace("fa-eye-slash","fa-eye");
    }
}

document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    let valid = true;

    valid &= validate("email", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    valid &= validate("password", v => v.length >= 6);

    if(valid){
        alert("Login successful!");
    }
});

function validate(id, rule){
    const input = document.getElementById(id);
    const group = input.parentElement;
    const error = group.querySelector(".error");

    if(!rule(input.value.trim())){
        group.classList.add("invalid");
        error.style.display="block";
        return false;
    }else{
        group.classList.remove("invalid");
        error.style.display="none";
        return true;
    }
}
</script>

</body>
</html>
    