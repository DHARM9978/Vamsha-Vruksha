const express = require("express");

const router = express.Router();

const familyDetailsController = require("../controllers/familyDetails.controller");
const authenticate = require("../middleware/auth.middleware");

// All family-details endpoints require authentication.
router.use(authenticate);

// GET /api/families/:familyId/details
router.get(
  "/families/:familyId/details",
  familyDetailsController.getFamilyDetails
);

module.exports = router;