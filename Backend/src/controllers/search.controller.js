
const searchService = require("../services/search.service");
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

// SEARCH PERSONS
// GET /api/search/persons

const searchPersons = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const result = await searchService.searchPersons(
    req.query,
    {
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Person search completed successfully",
    data: result,
  });
});

// SEARCH FAMILIES
// GET /api/search/families

const searchFamilies = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const result = await searchService.searchFamilies(
    req.query,
    {
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

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
