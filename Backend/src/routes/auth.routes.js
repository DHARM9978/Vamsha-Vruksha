const express = require("express");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");

const {
  validateRegister,
  validateLogin,
  validateVerifyOtp,
  validateResendOtp,
  validateForgotPassword,
  validateVerifyResetOtp,
  validateResetPassword,
} = require("../validators/auth.validator");

const router = express.Router();

// ======================================================
// AUTHENTICATION RATE-LIMITER FACTORY
// ======================================================

const createAuthRateLimiter = ({
  windowMs,
  limit,
  message,
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

// ======================================================
// ROUTE-SPECIFIC LIMITS
// ======================================================

// Registration: 5 attempts per IP per hour.
const registerRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Please try again later.",
});

// Signup OTP verification: 10 attempts per IP per 15 minutes.
const verifySignupOtpRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many OTP verification attempts. Please try again later.",
});

// Signup OTP resend: 3 attempts per IP per 15 minutes.
const resendSignupOtpRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  message: "Too many OTP resend requests. Please try again later.",
});

// Login: 10 attempts per IP per 15 minutes.
const loginRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many login attempts. Please try again later.",
});

// Forgot password: 5 attempts per IP per 15 minutes.
const forgotPasswordRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many password reset requests. Please try again later.",
});

// Password reset OTP verification: 10 attempts per IP per 15 minutes.
const verifyResetOtpRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many password reset OTP attempts. Please try again later.",
});

// Password reset submission: 5 attempts per IP per 15 minutes.
const resetPasswordRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many password reset attempts. Please try again later.",
});

// ======================================================
// 1. REGISTRATION AND SIGNUP OTP
// Base path: /api/auth
// ======================================================

// POST /api/auth/register
router.post(
  "/register",
  registerRateLimiter,
  validateRegister,
  authController.register
);

// POST /api/auth/verify-otp
router.post(
  "/verify-otp",
  verifySignupOtpRateLimiter,
  validateVerifyOtp,
  authController.verifySignupOtp
);

// POST /api/auth/resend-otp
router.post(
  "/resend-otp",
  resendSignupOtpRateLimiter,
  validateResendOtp,
  authController.resendSignupOtp
);

// ======================================================
// 2. LOGIN AND AUTHENTICATED USER
// ======================================================

// POST /api/auth/login
router.post(
  "/login",
  loginRateLimiter,
  validateLogin,
  authController.login
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  authController.getCurrentUser
);

// ======================================================
// 3. FORGOT PASSWORD AND RESET PASSWORD
// ======================================================

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateForgotPassword,
  authController.forgotPassword
);

// POST /api/auth/verify-reset-otp
router.post(
  "/verify-reset-otp",
  verifyResetOtpRateLimiter,
  validateVerifyResetOtp,
  authController.verifyResetOtp
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validateResetPassword,
  authController.resetPassword
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;