
const searchService = require("../services/search.service");
const asyncHandler = require("../utils/asyncHandler");

const searchPersons = asyncHandler(async (req, res) => {
  const result = await searchService.searchPersons(req.query);

  return res.status(200).json({
    success: true,
    message: "Person search completed successfully",
    data: result,
  });
});

const searchFamilies = asyncHandler(async (req, res) => {
  const result = await searchService.searchFamilies(req.query);

  return res.status(200).json({
    success: true,
    message: "Family search completed successfully",
    data: result,
  });
});

module.exports = {
  searchPersons,
  searchFamilies,
};
