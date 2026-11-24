
const express = require("express");

const router = express.Router();

const familyDetailsController = require("../controllers/familyDetails.controller");
const authenticate = require("../middleware/auth.middleware");

const {
  loadFamilyAccess,
  requireFamilyIdAccess,
} = require("../middleware/familyAccess.middleware");

// All family-details endpoints require authentication.
router.use(authenticate);

// GET /api/families/:familyId/details
//
// Access sequence:
// 1. authenticate verifies the JWT.
// 2. loadFamilyAccess resolves the user's database-backed access scope.
// 3. requireFamilyIdAccess verifies the requested family is in that scope.
// 4. The controller loads the requested family details.
//
// Admin accounts retain global access through familyAccess.service.js.
// Ordinary Users can access only the family IDs in their authorized
// bloodline + directly connected spouse-family scopes.

router.get(
  "/families/:familyId/details",
  loadFamilyAccess,
  requireFamilyIdAccess,
  familyDetailsController.getFamilyDetails
);

module.exports = router;
