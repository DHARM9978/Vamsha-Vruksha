
const familyService = require("../services/family.service");
const asyncHandler = require("../utils/asyncHandler");

const requireFamilyAccessContext = (req) => {
  if (!req.familyAccess) {
    const error = new Error(
      "Family access context is missing. Ensure loadFamilyAccess runs before this controller."
    );

    error.statusCode = 500;
    error.code = "FAMILY_ACCESS_CONTEXT_MISSING";

    throw error;
  }

  return req.familyAccess;
};

const setPrivateResponseHeaders = (res) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
};

// ==========================================
// CREATE FAMILY
// POST /api/families
// Admin-only route
// ==========================================

const createFamily = asyncHandler(async (req, res) => {
  const { family, headPerson } = req.body || {};

  const result = await familyService.createFamily({
    family,
    headPerson,
  });

  setPrivateResponseHeaders(res);

  return res.status(201).json({
    success: true,
    message: "Family and initial head person created successfully",
    data: {
      family: result,
    },
  });
});

// ==========================================
// GET ALL AUTHORIZED FAMILIES
// GET /api/families
// Admin: all families
// User: only authorized family IDs
// ==========================================

const getAllFamilies = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const families = await familyService.getAllFamilies({
    accessContext,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Families retrieved successfully",
    data: {
      totalFamilies: families.length,
      families,
    },
  });
});

// ==========================================
// GET ONE AUTHORIZED FAMILY
// GET /api/families/:familyId
// ==========================================

const getFamilyById = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const family = await familyService.getFamilyById(
    req.params.familyId,
    {
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Family details retrieved successfully",
    data: {
      family,
    },
  });
});

// ==========================================
// UPDATE FAMILY
// PUT /api/families/:familyId
// Admin-only route
// ==========================================

const updateFamily = asyncHandler(async (req, res) => {
  const { family, headPerson } = req.body || {};

  const updatedFamily = await familyService.updateFamily({
    familyId: req.params.familyId,
    family,
    headPerson,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Family updated successfully",
    data: {
      family: updatedFamily,
    },
  });
});

// ==========================================
// DELETE FAMILY
// DELETE /api/families/:familyId
// Admin-only route
// ==========================================

const deleteFamily = asyncHandler(async (req, res) => {
  const result = await familyService.deleteFamily(
    req.params.familyId
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      familyId: result.familyId,
    },
  });
});

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily,
};
