function togglePassword(id, icon) {

    const input = document.getElementById(id);

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }

}

function validate(id, rule) {

    const input = document.getElementById(id);
    const group = input.parentElement;
    const error = group.querySelector(".error");

    if (!rule(input.value.trim())) {
        group.classList.add("invalid");
        error.style.display = "block";
        return false;
    }
    else {
        group.classList.remove("invalid");
        error.style.display = "none";
        return true;
    }

}

function validateEmail() {
    return validate("email", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
}

function validatePassword() {
    return validate("password", v => v.length >= 1);
}

document.getElementById("email").addEventListener("keyup", validateEmail);
document.getElementById("password").addEventListener("keyup", validatePassword);

document.getElementById("loginForm").addEventListener("submit", function (e) {

    if (
        !validateEmail() |
        !validatePassword()
    ) {
        e.preventDefault();
    }

});