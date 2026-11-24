
const express = require("express");

const relationController = require("../controllers/relation.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  loadFamilyAccess,
} = require("../middleware/familyAccess.middleware");

const {
  validateCreateRelation,
  validateUpdateRelation,
} = require("../validators/relation.validator");

const router = express.Router();

// ======================================================
// AUTHENTICATION
// All relationship APIs require authentication.
// ======================================================

router.use(authenticate);

// ======================================================
// 1. GET PERSON RELATIONSHIPS
// GET /api/persons/:personId/relations
//
// Admin:
//   - Can view relationships globally.
//
// Ordinary User:
//   - Must have a family access context.
//   - Can view only relationships where both people are
//     inside the authorized extended-family network.
// ======================================================

router.get(
  "/persons/:personId/relations",
  loadFamilyAccess,
  relationController.getPersonRelations
);

// ======================================================
// 2. ADD RELATIONSHIP
// POST /api/persons/:personId/relations
// Only Admin can add relationships.
// ======================================================

router.post(
  "/persons/:personId/relations",
  authorizeRoles("Admin"),
  validateCreateRelation,
  relationController.addRelation
);

// ======================================================
// 3. UPDATE RELATIONSHIP
// PUT /api/relations/:relationId
// Only Admin can update relationships.
// ======================================================

router.put(
  "/relations/:relationId",
  authorizeRoles("Admin"),
  validateUpdateRelation,
  relationController.updateRelation
);

// ======================================================
// 4. DELETE RELATIONSHIP
// DELETE /api/relations/:relationId
// Only Admin can delete relationships.
// ======================================================

router.delete(
  "/relations/:relationId",
  authorizeRoles("Admin"),
  relationController.deleteRelation
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
