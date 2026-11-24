
const express = require("express");

const router = express.Router();

const familyTreeController = require("../controllers/familyTree.controller");
const authenticate = require("../middleware/auth.middleware");

const {
  loadFamilyAccess,
} = require("../middleware/familyAccess.middleware");

// ======================================================
// AUTHENTICATION
// All family-tree requests require a valid JWT.
// ======================================================

router.use(authenticate);

// ======================================================
// FAMILY TREE
// GET /api/families/:familyId/tree
//
// Admin:
//   - May request any family's tree.
//
// Ordinary User:
//   - Family access context is loaded from the database.
//   - The service verifies that the requested family
//     belongs to the user's bloodline-family scope.
//   - Spouses appear beside bloodline members.
//   - Spouse-side parents and siblings are not expanded.
// ======================================================

router.get(
  "/families/:familyId/tree",
  loadFamilyAccess,
  familyTreeController.getFamilyTree
);

module.exports = router;
