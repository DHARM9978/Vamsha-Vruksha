
"use strict";

const {
  isValidPassword,
  MAX_PASSWORD_BYTES,
} = require("../utils/password");

// ======================================================
// CONSTANTS
// ======================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const OTP_REGEX = /^\d{6}$/;

const MAX_EMAIL_LENGTH = 150;
const MAX_NAME_LENGTH = 100;
const MIN_NAME_LENGTH = 2;

// ======================================================
// COMMON HELPERS
// ======================================================

const isPlainObject = (value) => {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
};

const validateBody = (req, res) => {
  if (!isPlainObject(req.body)) {
    res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object",
    });

    return false;
  }

  return true;
};

const reject = (res, message) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const validateEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.trim();

  return (
    normalizedEmail.length > 0 &&
    normalizedEmail.length <= MAX_EMAIL_LENGTH &&
    EMAIL_REGEX.test(normalizedEmail)
  );
};

const validatePhone = (phone) => {
  return (
    typeof phone === "string" &&
    PHONE_REGEX.test(phone.trim())
  );
};

// Passwords must never be trimmed.
// Whitespace can be part of a user's existing password.
const validateCurrentPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length > 0 &&
    Buffer.byteLength(password, "utf8") <=
      MAX_PASSWORD_BYTES
  );
};

const validateOtp = (otp) => {
  return (
    typeof otp === "string" &&
    OTP_REGEX.test(otp.trim())
  );
};

const normalizeOtpInBody = (req) => {
  if (typeof req.body.otp === "string") {
    req.body.otp = req.body.otp.trim();
  }
};

// ======================================================
// 1. VALIDATE ADMIN LOGIN
// POST /api/admin/login
//
// Body:
// {
//   "identifier": "admin@example.com",
//   "password": "AdminPassword123!"
// }
// ======================================================

const validateAdminLogin = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    identifier,
    password,
  } = req.body;

  if (
    typeof identifier !== "string" ||
    !identifier.trim() ||
    identifier.trim().length > MAX_EMAIL_LENGTH
  ) {
    return reject(
      res,
      "Admin email or mobile number is required"
    );
  }

  const normalizedIdentifier = identifier.trim();

  const isEmail = validateEmail(normalizedIdentifier);
  const isPhone = PHONE_REGEX.test(normalizedIdentifier);

  if (!isEmail && !isPhone) {
    return reject(
      res,
      "Enter a valid Admin email address or 10-digit mobile number"
    );
  }

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return reject(
      res,
      "Password must not exceed 72 UTF-8 bytes"
    );
  }

  req.body.identifier = isEmail
    ? normalizedIdentifier.toLowerCase()
    : normalizedIdentifier;

  return next();
};

// ======================================================
// 2. VALIDATE ADMIN CREATION
// POST /api/admin/create
//
// Body:
// {
//   "userName": "Admin Name",
//   "email": "admin@example.com",
//   "phone": "9876543210",
//   "password": "AdminPassword123!"
// }
// ======================================================

const validateCreateAdmin = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    userName,
    email,
    phone,
    password,
  } = req.body;

  if (
    typeof userName !== "string" ||
    userName.trim().length < MIN_NAME_LENGTH ||
    userName.trim().length > MAX_NAME_LENGTH
  ) {
    return reject(
      res,
      `Admin name must contain between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
    );
  }

  if (!validateEmail(email)) {
    return reject(
      res,
      "Please provide a valid Admin email address (maximum 150 characters)"
    );
  }

  if (!validatePhone(phone)) {
    return reject(
      res,
      "Admin phone number must contain exactly 10 digits"
    );
  }

  if (!isValidPassword(password)) {
    return reject(
      res,
      "Password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
    );
  }

  req.body.userName = userName.trim();
  req.body.email = normalizeEmail(email);
  req.body.phone = phone.trim();

  return next();
};

// ======================================================
// 3. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
//
// Body:
// {
//   "newEmail": "new@example.com",
//   "currentPassword": "CurrentPassword123!"
// }
// ======================================================

const validateRequestEmailChange = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    newEmail,
    currentPassword,
  } = req.body;

  if (!validateEmail(newEmail)) {
    return reject(
      res,
      "Please provide a valid new email address (maximum 150 characters)"
    );
  }

  if (!validateCurrentPassword(currentPassword)) {
    return reject(
      res,
      "Current password is required and must not exceed 72 UTF-8 bytes"
    );
  }

  req.body.newEmail = normalizeEmail(newEmail);

  return next();
};

// ======================================================
// 4. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
//
// No request body required.
// ======================================================

const validateResendEmailChangeOtp = (req, res, next) => {
  if (
    req.body === undefined ||
    req.body === null
  ) {
    return next();
  }

  if (!isPlainObject(req.body)) {
    return reject(
      res,
      "Request body must be a valid JSON object"
    );
  }

  if (Object.keys(req.body).length > 0) {
    return reject(
      res,
      "No request body is required to resend the verification code"
    );
  }

  return next();
};

// ======================================================
// 5. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
//
// Body:
// {
//   "otp": "123456"
// }
// ======================================================

const validateVerifyEmailChangeOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { otp } = req.body;

  if (!validateOtp(otp)) {
    return reject(
      res,
      "OTP must be a six-digit number"
    );
  }

  normalizeOtpInBody(req);

  return next();
};


// ======================================================
// VALIDATE AUTHENTICATED ADMIN PASSWORD CHANGE
// PATCH /api/admin/change-password
// ======================================================

const validateChangeAdminPassword = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!validateCurrentPassword(currentPassword)) {
    return reject(
      res,
      "A valid current password is required (maximum 72 UTF-8 bytes)"
    );
  }

  if (!isValidPassword(newPassword)) {
    return reject(
      res,
      "New password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
    );
  }

  if (!validateCurrentPassword(confirmPassword)) {
    return reject(
      res,
      "A valid confirmation password is required (maximum 72 UTF-8 bytes)"
    );
  }

  if (newPassword !== confirmPassword) {
    return reject(
      res,
      "New password and confirmation password do not match"
    );
  }

  return next();
};

// ======================================================
// EXPORT VALIDATORS
// ======================================================

module.exports = {
  validateAdminLogin,
  validateCreateAdmin,
  validateRequestEmailChange,
  validateResendEmailChangeOtp,
  validateVerifyEmailChangeOtp,
  validateChangeAdminPassword,
};
