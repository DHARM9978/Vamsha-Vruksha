
"use strict";

// Shared password policy for User and Admin authentication flows.
// bcryptjs processes at most 72 UTF-8 bytes of a password.

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const PASSWORD_POLICY_MESSAGE =
  "Password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes";

/**
 * Check whether a new password satisfies the application policy.
 * Passwords are deliberately not trimmed because whitespace may be meaningful.
 *
 * @param {unknown} password
 * @returns {boolean}
 */
const isValidPassword = (password) => {
  if (typeof password !== "string") {
    return false;
  }

  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

/**
 * Validate a new password and throw a service-layer error if invalid.
 *
 * @param {unknown} password
 * @throws {Error} with statusCode 400 when invalid
 * @returns {true}
 */
const validatePassword = (password) => {
  if (!isValidPassword(password)) {
    const error = new Error(PASSWORD_POLICY_MESSAGE);
    error.statusCode = 400;
    throw error;
  }

  return true;
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
  PASSWORD_POLICY_MESSAGE,
  isValidPassword,
  validatePassword,
};
