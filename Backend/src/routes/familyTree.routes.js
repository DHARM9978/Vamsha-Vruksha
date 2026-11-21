const express = require("express");

const router = express.Router();

const familyTreeController = require("../controllers/familyTree.controller");
const authenticate = require("../middleware/auth.middleware");

router.use(authenticate);

router.get(
  "/families/:familyId/tree",
  familyTreeController.getFamilyTree
);

module.exports = router;