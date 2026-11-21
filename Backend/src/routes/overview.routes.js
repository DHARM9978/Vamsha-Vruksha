
const express = require("express");

const router = express.Router();

const overviewController = require("../controllers/overview.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

// Public overview statistics.
router.get(
  "/public-stats",
  overviewController.getPublicOverview
);

// All routes below require authentication.
router.use(authenticate);

// Admin Overview.
router.get(
  "/admin",
  authorizeRoles("Admin"),
  overviewController.getAdminOverview
);

// User Overview.
router.get(
  "/user",
  authorizeRoles("User"),
  overviewController.getUserOverview
);

module.exports = router;
