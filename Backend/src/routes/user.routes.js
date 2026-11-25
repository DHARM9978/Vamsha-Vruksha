
const express = require("express");

const userController = require("../controllers/user.controller");
const authenticate = require("../middleware/auth.middleware");
const { authorizeRole } = require("../middleware/role.middleware");
const {
  updateUserProfileValidator,
  changeUserPasswordValidator
} = require("../validators/user.validator");
const {
  changePasswordLimiter
} = require("../middleware/rateLimiter");

const router = express.Router();

// All routes require authentication and the User role.
router.use(authenticate);
router.use(authorizeRole("User"));

// Get logged-in user's profile
router.get("/me", userController.getUserProfile);

// Update logged-in user's profile
router.put(
  "/me",
  updateUserProfileValidator,
  userController.updateUserProfile
);

// Change logged-in user's password
router.patch(
  "/change-password",
  changePasswordLimiter,
  changeUserPasswordValidator,
  userController.changeUserPassword
);

module.exports = router;
