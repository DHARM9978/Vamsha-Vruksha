
const express = require("express");

const relationController = require("../controllers/relation.controller");

const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

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
// Admin and User can view relationships.
// ======================================================

router.get(
  "/persons/:personId/relations",
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
