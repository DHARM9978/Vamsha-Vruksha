
const express = require("express");

const familyController = require("../controllers/family.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  validateFamilyPayload,
} = require("../validators/family.validator");

const router = express.Router();

// ======================================================
// AUTHENTICATION
// All family routes require a valid JWT.
// ======================================================

router.use(authenticate);

// ======================================================
// READ ROUTES
// Admin and User can access these.
// ======================================================

// Get all families
router.get(
  "/",
  familyController.getAllFamilies
);

// Get family details by ID
router.get(
  "/:familyId",
  familyController.getFamilyById
);

// ======================================================
// ADMIN-ONLY ROUTES
// Only Admin can modify family records.
// ======================================================

// Create family and initial head person
router.post(
  "/",
  authorizeRoles("Admin"),
  validateFamilyPayload,
  familyController.createFamily
);

// Update family and initial head person
router.put(
  "/:familyId",
  authorizeRoles("Admin"),
  validateFamilyPayload,
  familyController.updateFamily
);

// Delete family and associated records
router.delete(
  "/:familyId",
  authorizeRoles("Admin"),
  familyController.deleteFamily
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
  