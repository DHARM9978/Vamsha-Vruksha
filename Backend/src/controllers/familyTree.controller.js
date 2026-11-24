
const familyTreeService = require("../services/familyTree.service");
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

// ======================================================
// GET FAMILY TREE
// GET /api/families/:familyId/tree
//
// Admin:
//   - Can request any family's tree.
//
// Ordinary User:
//   - Can request only a permitted bloodline family tree.
//   - Spouses appear beside bloodline members.
//   - Spouse-side parents/siblings are not expanded.
// ======================================================

const getFamilyTree = asyncHandler(async (req, res) => {
  const accessContext = requireFamilyAccessContext(req);

  const {
    headPersonId,
    maxDepth,
    maxNodes,
  } = req.query;

  const result = await familyTreeService.getFamilyTree(
    req.params.familyId,
    {
      headPersonId,
      maxDepth,
      maxNodes,
      accessContext,
    }
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Family tree retrieved successfully",
    data: result,
  });
});

module.exports = {
  getFamilyTree,
};
