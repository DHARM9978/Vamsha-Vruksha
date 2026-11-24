const express = require("express");

const router = express.Router();

const overviewController = require("../controllers/overview.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const { loadFamilyAccess } = require("../middleware/familyAccess.middleware");

// Public overview statistics.
// Keep this route before router.use(authenticate) so it remains public.
router.get(
  "/public-stats",
  overviewController.getPublicOverview
);

// All routes below require authentication.
router.use(authenticate);

// Admin Overview.
// Admin retains global overview access.
router.get(
  "/admin",
  authorizeRoles("Admin"),
  overviewController.getAdminOverview
);

// User Overview.
// Load the User's authorized family context before the controller.
router.get(
  "/user",
  authorizeRoles("User"),
  loadFamilyAccess,
  overviewController.getUserOverview
);

module.exports = router;