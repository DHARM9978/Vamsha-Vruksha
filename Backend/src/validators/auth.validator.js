
"use strict";

const {
  isValidPassword,
} = require("../utils/password");

// ======================================================
// CONSTANTS
// ======================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

// Matches user_login.user_email VARCHAR(150).
const MAX_EMAIL_LENGTH = 150;

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

const reject = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const validateBody = (req, res) => {
  if (!isPlainObject(req.body)) {
    reject(
      res,
      "Request body must be a valid JSON object"
    );

    return false;
  }

  return true;
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const isValidEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const value = email.trim();

  return (
    value.length > 0 &&
    value.length <= MAX_EMAIL_LENGTH &&
    EMAIL_REGEX.test(value)
  );
};

const isValidOtp = (otp) => {
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
// 1. VALIDATE REGISTRATION
// POST /api/auth/register
// ======================================================

const validateRegister = (req, res, next) => {
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
      `Username must contain between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
    );
  }

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  if (
    typeof phone !== "string" ||
    !INDIAN_MOBILE_REGEX.test(phone.trim())
  ) {
    return reject(
      res,
      "Phone number must be a valid 10-digit Indian mobile number"
    );
  }

  if (!isValidPassword(password)) {
    return reject(
      res,
      "Password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
    );
  }

  // Normalize non-secret values.
  // Passwords are deliberately not trimmed.
  req.body.userName = userName.trim();
  req.body.email = normalizeEmail(email);
  req.body.phone = phone.trim();

  return next();
};

// ======================================================
// 2. VALIDATE LOGIN
// POST /api/auth/login
// ======================================================

const validateLogin = (req, res, next) => {
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
      "Email or mobile number is required"
    );
  }

  const normalizedIdentifier = identifier.trim();

  const isEmail = isValidEmail(
    normalizedIdentifier
  );

  const isIndianMobile = INDIAN_MOBILE_REGEX.test(
    normalizedIdentifier
  );

  if (!isEmail && !isIndianMobile) {
    return reject(
      res,
      "Enter a valid email address or 10-digit Indian mobile number"
    );
  }

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return reject(
      res,
      "A valid password is required"
    );
  }

  req.body.identifier = isEmail
    ? normalizedIdentifier.toLowerCase()
    : normalizedIdentifier;

  return next();
};

// ======================================================
// 3. VALIDATE SIGNUP OTP
// POST /api/auth/verify-otp
// ======================================================

const validateVerifyOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    email,
    otp,
  } = req.body;

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  if (!isValidOtp(otp)) {
    return reject(
      res,
      "OTP must be a six-digit number"
    );
  }

  req.body.email = normalizeEmail(email);
  normalizeOtpInBody(req);

  return next();
};

// ======================================================
// 4. VALIDATE RESEND SIGNUP OTP
// POST /api/auth/resend-otp
// ======================================================

const validateResendOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email } = req.body;

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  req.body.email = normalizeEmail(email);

  return next();
};

// ======================================================
// 5. VALIDATE FORGOT PASSWORD
// POST /api/auth/forgot-password
// ======================================================

const validateForgotPassword = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { email } = req.body;

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  req.body.email = normalizeEmail(email);

  return next();
};

// ======================================================
// 6. VALIDATE PASSWORD RESET OTP
// POST /api/auth/verify-reset-otp
// ======================================================

const validateVerifyResetOtp = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    email,
    otp,
  } = req.body;

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  if (!isValidOtp(otp)) {
    return reject(
      res,
      "OTP must be a six-digit number"
    );
  }

  req.body.email = normalizeEmail(email);
  normalizeOtpInBody(req);

  return next();
};

// ======================================================
// 7. VALIDATE PASSWORD RESET
// POST /api/auth/reset-password
// ======================================================

const validateResetPassword = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    email,
    otp,
    newPassword,
  } = req.body;

  if (!isValidEmail(email)) {
    return reject(
      res,
      "Please provide a valid email address"
    );
  }

  if (!isValidOtp(otp)) {
    return reject(
      res,
      "OTP must be a six-digit number"
    );
  }

  if (!isValidPassword(newPassword)) {
    return reject(
      res,
      "New password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
    );
  }

  req.body.email = normalizeEmail(email);
  normalizeOtpInBody(req);

  return next();
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
