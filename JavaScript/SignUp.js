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

function validateMobile() {

    const input = document.getElementById("mobile");
    input.value = input.value.replace(/[^0-9]/g, "");

    return validate("mobile", v => /^[0-9]{10}$/.test(v));

}

function validatePassword() {
    validateConfirmPassword();
    return validate("password", v => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(v));
}

function validateConfirmPassword() {

    const password = document.getElementById("password").value;

    return validate("confirmPassword", v => v === password);

}

document.getElementById("email").addEventListener("keyup", validateEmail);
document.getElementById("mobile").addEventListener("keyup", validateMobile);
document.getElementById("password").addEventListener("keyup", validatePassword);
document.getElementById("confirmPassword").addEventListener("keyup", validateConfirmPassword);

document.getElementById("signupForm").addEventListener("submit", function (e) {

    if (
        !validateEmail() |
        !validateMobile() |
        !validatePassword() |
        !validateConfirmPassword()
    ) {
        e.preventDefault();
    }

});