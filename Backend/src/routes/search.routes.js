
const express = require("express");

const router = express.Router();

const searchController = require("../controllers/search.controller");
const authenticate = require("../middleware/auth.middleware");

const {
  loadFamilyAccess,
} = require("../middleware/familyAccess.middleware");

// All search endpoints require authentication.
router.use(authenticate);

// GET /api/search/persons
router.get(
  "/persons",
  loadFamilyAccess,
  searchController.searchPersons
);

// GET /api/search/families
router.get(
  "/families",
  loadFamilyAccess,
  searchController.searchFamilies
);

module.exports = router;
