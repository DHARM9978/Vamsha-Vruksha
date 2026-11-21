const express = require("express");

const personController = require("../controllers/person.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const {
  validatePersonPayload,
} = require("../validators/person.validator");

const router = express.Router();

// All person APIs require authentication.
router.use(authenticate);

// Admin and User can view people.
router.get(
  "/families/:familyId/persons",
  personController.getPeopleByFamilyId
);

router.get(
  "/persons/:personId",
  personController.getPersonById
);

// Only Admin can add, update or delete people.
router.post(
  "/families/:familyId/persons",
  authorizeRoles("Admin"),
  validatePersonPayload,
  personController.addPersonToFamily
);

router.put(
  "/persons/:personId",
  authorizeRoles("Admin"),
  validatePersonPayload,
  personController.updatePerson
);

router.delete(
  "/persons/:personId",
  authorizeRoles("Admin"),
  personController.deletePerson
);

module.exports = router;