
const express = require("express");

const familyController = require("../controllers/family.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  loadFamilyAccess,
  requireFamilyIdAccess,
} = require("../middleware/familyAccess.middleware");

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
// Admin: global family access.
// User: only families in the relationship-based access scope.
// ======================================================

// GET /api/families
router.get(
  "/",
  loadFamilyAccess,
  familyController.getAllFamilies
);

// GET /api/families/:familyId
router.get(
  "/:familyId",
  loadFamilyAccess,
  requireFamilyIdAccess,
  familyController.getFamilyById
);

// ======================================================
// ADMIN-ONLY ROUTES
// Only Admin can create, update, or delete family records.
// ======================================================

// POST /api/families
router.post(
  "/",
  authorizeRoles("Admin"),
  validateFamilyPayload,
  familyController.createFamily
);

// PUT /api/families/:familyId
router.put(
  "/:familyId",
  authorizeRoles("Admin"),
  validateFamilyPayload,
  familyController.updateFamily
);

// DELETE /api/families/:familyId
router.delete(
  "/:familyId",
  authorizeRoles("Admin"),
  familyController.deleteFamily
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
