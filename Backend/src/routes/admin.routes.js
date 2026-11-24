const express = require("express");
const rateLimit = require("express-rate-limit");

const adminController = require("../controllers/admin.controller");
const adminFamilyLinkController = require("../controllers/adminFamilyLink.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  validateRequestEmailChange,
  validateResendEmailChangeOtp,
  validateVerifyEmailChangeOtp,
} = require("../validators/admin.validator");

const router = express.Router();

// ======================================================
// ADMIN LOGIN RATE LIMIT
// Maximum 10 requests per IP in a 15-minute window.
// ======================================================

const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many Admin login attempts. Please try again later.",
  },
});

// ======================================================
// 1. PUBLIC ADMIN LOGIN
// POST /api/admin/login
// ======================================================

router.post(
  "/login",
  adminLoginRateLimiter,
  adminController.loginAdmin
);

// ======================================================
// 2. AUTHENTICATION AND ADMIN AUTHORIZATION
// ======================================================

router.use(authenticate);
router.use(authorizeRoles("Admin"));

// ======================================================
// 3. ADMIN PROFILE
// ======================================================

router.get(
  "/me",
  adminController.getAdminProfile
);

// ======================================================
// 4. CREATE ANOTHER ADMIN
// ======================================================

router.post(
  "/create",
  adminController.createAdmin
);

// ======================================================
// 5. REQUEST ADMIN EMAIL CHANGE
// ======================================================

router.post(
  "/email-change/request",
  validateRequestEmailChange,
  adminController.requestAdminEmailChange
);

// ======================================================
// 6. RESEND ADMIN EMAIL CHANGE OTP
// ======================================================

router.post(
  "/email-change/resend",
  validateResendEmailChangeOtp,
  adminController.resendAdminEmailChangeOtp
);

// ======================================================
// 7. VERIFY ADMIN EMAIL CHANGE OTP
// ======================================================

router.post(
  "/email-change/verify",
  validateVerifyEmailChangeOtp,
  adminController.verifyAdminEmailChangeOtp
);

// ======================================================
// 8. FAMILY ACCOUNT LINKING — ADMIN ONLY
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