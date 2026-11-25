
"use strict";

const {
  isValidPassword,
  MAX_PASSWORD_BYTES
} = require("../utils/password");

// ======================================================
// CONSTANTS
// ======================================================

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const PHONE_REGEX = /^\d{7,15}$/;

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
    message
  });
};

const validateBody = (req, res) => {
  if (!isPlainObject(req.body)) {
    reject(res, "Request body must be a valid JSON object");
    return false;
  }

  return true;
};

// ======================================================
// 1. VALIDATE USER PROFILE UPDATE
// PUT /api/users/me
// ======================================================

const updateUserProfileValidator = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { userName, phone } = req.body;

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

  if (
    typeof phone !== "string" ||
    !PHONE_REGEX.test(phone.trim())
  ) {
    return reject(
      res,
      "Phone number must contain between 7 and 15 digits"
    );
  }

  req.body.userName = userName.trim();
  req.body.phone = phone.trim();

  return next();
};

// ======================================================
// 2. VALIDATE USER PASSWORD CHANGE
// PATCH /api/users/change-password
// ======================================================

const changeUserPasswordValidator = (req, res, next) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    currentPassword,
    newPassword,
    confirmPassword
  } = req.body;

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    Buffer.byteLength(currentPassword, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return reject(res, "A valid current password is required");
  }

  if (!isValidPassword(newPassword)) {
    return reject(
      res,
      "New password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
    );
  }

  if (
    typeof confirmPassword !== "string" ||
    Buffer.byteLength(confirmPassword, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return reject(res, "A valid confirmation password is required");
  }

  if (newPassword !== confirmPassword) {
    return reject(
      res,
      "New password and confirmation password do not match"
    );
  }

  // Never trim or normalize passwords.
  return next();
};

// ======================================================
// EXPORT VALIDATORS
// ======================================================

module.exports = {
  updateUserProfileValidator,
  changeUserPasswordValidator
};
