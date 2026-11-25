
"use strict";

const rateLimit = require("express-rate-limit");

// ======================================================
// CHANGE PASSWORD RATE LIMITER
// PATCH /api/users/change-password
// ======================================================

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,                 // Maximum 5 attempts
  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many password change attempts. Please try again after 15 minutes."
  }
});

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  changePasswordLimiter
};
