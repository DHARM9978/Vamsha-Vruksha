
const express = require("express");

const adminController = require("../controllers/admin.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  validateRequestEmailChange,
  validateResendEmailChangeOtp,
  validateVerifyEmailChangeOtp,
} = require("../validators/admin.validator");

const router = express.Router();

// ======================================================
// 1. PUBLIC ADMIN LOGIN
// POST /api/admin/login
// ======================================================

router.post(
  "/login",
  adminController.loginAdmin
);

// ======================================================
// 2. AUTHENTICATION AND ADMIN AUTHORIZATION
// All routes below require a valid Admin JWT.
// ======================================================

router.use(authenticate);
router.use(authorizeRoles("Admin"));

// ======================================================
// 3. ADMIN PROFILE
// GET /api/admin/me
// ======================================================

router.get(
  "/me",
  adminController.getAdminProfile
);

// ======================================================
// 4. CREATE ANOTHER ADMIN
// POST /api/admin/create
// ======================================================

router.post(
  "/create",
  adminController.createAdmin
);

// ======================================================
// 5. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
// ======================================================

router.post(
  "/email-change/request",
  validateRequestEmailChange,
  adminController.requestAdminEmailChange
);

// ======================================================
// 6. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
// ======================================================

router.post(
  "/email-change/resend",
  validateResendEmailChangeOtp,
  adminController.resendAdminEmailChangeOtp
);

// ======================================================
// 7. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
// ======================================================

router.post(
  "/email-change/verify",
  validateVerifyEmailChangeOtp,
  adminController.verifyAdminEmailChangeOtp
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
