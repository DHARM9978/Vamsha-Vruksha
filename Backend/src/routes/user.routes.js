
const express = require("express");

const userController = require("../controllers/user.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

// All user profile routes require a valid JWT.
router.use(authenticate);

// Get logged-in user's profile
router.get("/me", userController.getUserProfile);

// Update logged-in user's profile
router.put("/me", userController.updateUserProfile);

// Change logged-in user's password
router.patch("/change-password", userController.changeUserPassword);

module.exports = router;
