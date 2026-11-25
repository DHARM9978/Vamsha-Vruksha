
"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");

const adminController = require("../controllers/admin.controller");
const adminFamilyLinkController = require("../controllers/adminFamilyLink.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  validateAdminLogin,
  validateCreateAdmin,
  validateRequestEmailChange,
  validateResendEmailChangeOtp,
  validateVerifyEmailChangeOtp,
  validateChangeAdminPassword,
} = require("../validators/admin.validator");

const router = express.Router();

// ======================================================
// COMMON RATE LIMIT CONFIGURATION
// ======================================================

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  limit,
  message,
}) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
};

// ======================================================
// 1. ADMIN LOGIN RATE LIMIT
// Maximum 10 requests per IP per 15 minutes.
// ======================================================

const adminLoginRateLimiter = createRateLimiter({
  limit: 10,
  message: "Too many Admin login attempts. Please try again later.",
});

// ======================================================
// 2. ADMIN CREATION RATE LIMIT
// Maximum 3 requests per IP per 15 minutes.
// ======================================================

const adminCreateRateLimiter = createRateLimiter({
  limit: 3,
  message: "Too many Admin creation requests. Please try again later.",
});

// ======================================================
// 3. ADMIN EMAIL CHANGE REQUEST RATE LIMIT
// Maximum 3 requests per IP per 15 minutes.
// ======================================================

const adminEmailChangeRequestLimiter = createRateLimiter({
  limit: 3,
  message:
    "Too many email change requests. Please try again later.",
});

// ======================================================
// 4. ADMIN EMAIL CHANGE OTP RESEND RATE LIMIT
// Maximum 3 requests per IP per 15 minutes.
// ======================================================

const adminEmailChangeResendLimiter = createRateLimiter({
  limit: 3,
  message:
    "Too many OTP resend requests. Please try again later.",
});

// ======================================================
// 5. ADMIN EMAIL CHANGE OTP VERIFICATION RATE LIMIT
// Maximum 5 requests per IP per 15 minutes.
// ======================================================

const adminEmailChangeVerifyLimiter = createRateLimiter({
  limit: 5,
  message:
    "Too many OTP verification attempts. Please try again later.",
});

// 6. ADMIN PASSWORD CHANGE RATE LIMIT
// Maximum 5 requests per Admin IP per 15 minutes.
const adminChangePasswordLimiter = createRateLimiter({
  limit: 5,
  message: "Too many password change attempts. Please try again later.",
});

// ======================================================
// 7. PUBLIC ADMIN LOGIN
// POST /api/admin/login
// ======================================================

router.post(
  "/login",
  adminLoginRateLimiter,
  validateAdminLogin,
  adminController.loginAdmin
);

// ======================================================
// 8. AUTHENTICATION AND ADMIN AUTHORIZATION
// All routes below require an authenticated Admin.
// ======================================================

router.use(authenticate);
router.use(authorizeRoles("Admin"));

// ======================================================
// 9. ADMIN PROFILE
// GET /api/admin/me
// ======================================================

router.get(
  "/me",
  adminController.getAdminProfile
);

// ======================================================
// 10. CHANGE ADMIN PASSWORD
// PATCH /api/admin/change-password
// ======================================================

router.patch(
  "/change-password",
  adminChangePasswordLimiter,
  validateChangeAdminPassword,
  adminController.changeAdminPassword
);

// ======================================================
// 11. CREATE ANOTHER ADMIN
// POST /api/admin/create
// ======================================================

router.post(
  "/create",
  adminCreateRateLimiter,
  validateCreateAdmin,
  adminController.createAdmin
);

// ======================================================
// 12. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
// ======================================================

router.post(
  "/email-change/request",
  adminEmailChangeRequestLimiter,
  validateRequestEmailChange,
  adminController.requestAdminEmailChange
);

// ======================================================
// 13. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
// ======================================================

router.post(
  "/email-change/resend",
  adminEmailChangeResendLimiter,
  validateResendEmailChangeOtp,
  adminController.resendAdminEmailChangeOtp
);

// ======================================================
// 14. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
// ======================================================

router.post(
  "/email-change/verify",
  adminEmailChangeVerifyLimiter,
  validateVerifyEmailChangeOtp,
  adminController.verifyAdminEmailChangeOtp
);

// ======================================================
// 15. FAMILY ACCOUNT LINKING — ADMIN ONLY
// ======================================================

router.get(
  "/family-links/unlinked-users",
  adminFamilyLinkController.listUnlinkedUserAccounts
);

router.get(
  "/family-links/people",
  adminFamilyLinkController.searchPeopleForLinking
);

router.post(
  "/family-links/link",
  adminFamilyLinkController.linkUserToPerson
);

router.get(
  "/family-links/users/:userId",
  adminFamilyLinkController.getUserPersonLink
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;