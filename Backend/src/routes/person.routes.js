
const express = require("express");

const personController = require("../controllers/person.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
  loadFamilyAccess,
  requireFamilyIdAccess,
  requirePersonIdAccess,
} = require("../middleware/familyAccess.middleware");

const {
  validatePersonPayload,
} = require("../validators/person.validator");

const router = express.Router();

// ======================================================
// AUTHENTICATION
// Every person endpoint requires a valid JWT.
// ======================================================

router.use(authenticate);

// ======================================================
// READ ROUTES
// Admin: global access.
// User: only people/families in the authorized network.
// ======================================================

// GET /api/families/:familyId/persons
router.get(
  "/families/:familyId/persons",
  loadFamilyAccess,
  requireFamilyIdAccess,
  personController.getPeopleByFamilyId
);

// GET /api/persons/:personId
router.get(
  "/persons/:personId",
  loadFamilyAccess,
  requirePersonIdAccess,
  personController.getPersonById
);

// ======================================================
// ADMIN-ONLY WRITE ROUTES
// ======================================================

// POST /api/families/:familyId/persons
router.post(
  "/families/:familyId/persons",
  authorizeRoles("Admin"),
  validatePersonPayload,
  personController.addPersonToFamily
);

// PUT /api/persons/:personId
router.put(
  "/persons/:personId",
  authorizeRoles("Admin"),
  validatePersonPayload,
  personController.updatePerson
);

// DELETE /api/persons/:personId
router.delete(
  "/persons/:personId",
  authorizeRoles("Admin"),
  personController.deletePerson
);

module.exports = router;
