
const express = require("express");

const myFamilyController = require("../controllers/myFamily.controller");
const authenticate = require("../middleware/auth.middleware");

const {
  loadFamilyAccess,
} = require("../middleware/familyAccess.middleware");

const router = express.Router();

// Every request requires a valid JWT.
router.use(authenticate);

// GET /api/my-family
router.get(
  "/",
  loadFamilyAccess,
  myFamilyController.getMyFamily
);

module.exports = router;
