
const express = require("express");

const router = express.Router();

const masterDataController = require("../controllers/masterData.controller");
const authenticate = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

// All master-data endpoints require authentication.
router.use(authenticate);

// Read operations: Admin and User.
router.get(
  "/:type",
  masterDataController.getAllMasterData
);

router.get(
  "/:type/:id",
  masterDataController.getMasterDataById
);

// Write operations: Admin only.
router.post(
  "/:type",
  authorizeRoles("Admin"),
  masterDataController.createMasterData
);

router.put(
  "/:type/:id",
  authorizeRoles("Admin"),
  masterDataController.updateMasterData
);

router.delete(
  "/:type/:id",
  authorizeRoles("Admin"),
  masterDataController.deleteMasterData
);

module.exports = router;
