
const overviewService = require("../services/overview.service");
const asyncHandler = require("../utils/asyncHandler");

const getAdminOverview = asyncHandler(async (req, res) => {
  const result = await overviewService.getAdminOverview();

  return res.status(200).json({
    success: true,
    message: "Admin overview retrieved successfully",
    data: result,
  });
});

const getUserOverview = asyncHandler(async (req, res) => {
  const result = await overviewService.getUserOverview();

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
