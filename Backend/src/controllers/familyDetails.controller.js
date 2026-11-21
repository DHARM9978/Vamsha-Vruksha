const familyDetailsService = require("../services/familyDetails.service");
const asyncHandler = require("../utils/asyncHandler");

const getFamilyDetails = asyncHandler(async (req, res) => {
  const { familyId } = req.params;

  const result = await familyDetailsService.getFamilyDetails(
    familyId
  );

  return res.status(200).json({
    success: true,
    message: "Family details retrieved successfully",
    data: result,
  });
});

module.exports = {
  getFamilyDetails,
};