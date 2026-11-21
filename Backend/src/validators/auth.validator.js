
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{7,15}$/;

// Check whether the request body is a valid object.
const isObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

// Validate request body.
const validateBody = (req, res) => {
  if (!isObject(req.body)) {
    res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object",
    });

    return false;
  }

  return true;
};

// Validate email.
const validateEmail = (email) => {
  return (
    typeof email === "string" &&
    email.trim().length <= 254 &&
    emailRegex.test(email.trim())
  );
};

// Validate password.
const validatePassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
};

// Validate six-digit OTP.
const validateOtp = (otp) => {
  return (
    typeof otp === "string" &&
    /^\d{6}$/.test(otp.trim())
  );
};

// Send validation error response.
const reject = (res, message) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

// ======================================================
// REGISTER
// ======================================================

const validateRegister = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { userName, email, phone, password } = req.body;

  if (
    typeof userName !== "string" ||
    userName.trim().length < 2 ||
    userName.trim().length > 100
  ) {
    return reject(
      res,
      "Username must contain between 2 and 100 characters"
    );
  }

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  if (
    typeof phone !== "string" ||
    !phoneRegex.test(phone.trim())
  ) {
    return reject(
      res,
      "Phone number must contain 7 to 15 digits"
    );
  }

  if (!validatePassword(password)) {
    return reject(
      res,
      "Password must contain at least 8 characters, one uppercase letter and one number"
    );
  }

  next();
};

// ======================================================
// LOGIN
// ======================================================

const validateLogin = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { identifier, password } = req.body;

  if (
    typeof identifier !== "string" ||
    !identifier.trim() ||
    identifier.trim().length > 254
  ) {
    return reject(
      res,
      "Email or phone number is required"
    );
  }

  if (
    typeof password !== "string" ||
    !password.length ||
    password.length > 128
  ) {
    return reject(res, "Password is required");
  }

  next();
};

// ======================================================
// VERIFY SIGNUP OTP
// ======================================================

const validateVerifyOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email, otp } = req.body;

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  if (!validateOtp(otp)) {
    return reject(res, "OTP must be a six-digit number");
  }

  next();
};

// ======================================================
// RESEND SIGNUP OTP
// ======================================================

const validateResendOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email } = req.body;

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  next();
};

// ======================================================
// FORGOT PASSWORD
// ======================================================

const validateForgotPassword = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email } = req.body;

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  next();
};

// ======================================================
// VERIFY PASSWORD RESET OTP
// ======================================================

const validateVerifyResetOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email, otp } = req.body;

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  if (!validateOtp(otp)) {
    return reject(res, "OTP must be a six-digit number");
  }

  next();
};

// ======================================================
// RESET PASSWORD
// ======================================================

const validateResetPassword = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email, otp, newPassword } = req.body;

  if (!validateEmail(email)) {
    return reject(res, "Please provide a valid email address");
  }

  if (!validateOtp(otp)) {
    return reject(res, "OTP must be a six-digit number");
  }

  if (!validatePassword(newPassword)) {
    return reject(
      res,
      "New password must contain at least 8 characters, one uppercase letter and one number"
    );
  }

  next();
};

// ======================================================
// EXPORT VALIDATORS
// ======================================================

module.exports = {
  validateRegister,
  validateLogin,
  validateVerifyOtp,
  validateResendOtp,
  validateForgotPassword,
  validateVerifyResetOtp,
  validateResetPassword,
};
