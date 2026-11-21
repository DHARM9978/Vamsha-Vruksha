
const express = require("express");

const router = express.Router();

const searchController = require("../controllers/search.controller");
const authenticate = require("../middleware/auth.middleware");

// Search endpoints require authentication.
router.use(authenticate);

router.get(
  "/persons",
  searchController.searchPersons
);

router.get(
  "/families",
  searchController.searchFamilies
);

module.exports = router;
