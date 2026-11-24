const overviewService = require("../services/overview.service");
const asyncHandler = require("../utils/asyncHandler");

const setPrivateResponseHeaders = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const requireFamilyAccessContext = (req) => {
  if (!req.familyAccess || typeof req.familyAccess !== "object") {
    const error = new Error("Family access context is required");
    error.statusCode = 500;
    error.code = "FAMILY_ACCESS_CONTEXT_MISSING";
    throw error;
  }

  return req.familyAccess;
};

const getAdminOverview = asyncHandler(async (req, res) => {
  const result = await overviewService.getAdminOverview();

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Admin overview retrieved successfully",
    data: result,
  });
});

const getUserOverview = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const result = await overviewService.getUserOverview({
    accessContext,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "User overview retrieved successfully",
    data: result,
  });
});

const getPublicOverview = asyncHandler(async (req, res) => {
  const result = await overviewService.getPublicOverview();

  return res.status(200).json({
    success: true,
    message: "Public overview statistics retrieved successfully",
    data: result,
  });
});

module.exports = {
  getAdminOverview,
  getUserOverview,
  getPublicOverview,
};