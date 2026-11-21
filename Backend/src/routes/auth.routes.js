
const express = require("express");

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
// REGISTRATION AND SIGNUP OTP
// ======================================================

// Register a new user
router.post(
  "/register",
  validateRegister,
  authController.register
);

// Verify signup OTP
router.post(
  "/verify-otp",
  validateVerifyOtp,
  authController.verifySignupOtp
);

// Resend signup OTP
router.post(
  "/resend-otp",
  validateResendOtp,
  authController.resendSignupOtp
);

// ======================================================
// LOGIN AND AUTHENTICATED USER
// ======================================================

// User login
router.post(
  "/login",
  validateLogin,
  authController.login
);

// Get currently authenticated user
router.get(
  "/me",
  authenticate,
  authController.getCurrentUser
);

// ======================================================
// FORGOT PASSWORD AND RESET PASSWORD
// ======================================================

// Request password reset OTP
router.post(
  "/forgot-password",
  validateForgotPassword,
  authController.forgotPassword
);

// Verify password reset OTP
router.post(
  "/verify-reset-otp",
  validateVerifyResetOtp,
  authController.verifyResetOtp
);

// Reset password
router.post(
  "/reset-password",
  validateResetPassword,
  authController.resetPassword
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
