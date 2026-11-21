
const familyTreeService = require("../services/familyTree.service");
const asyncHandler = require("../utils/asyncHandler");

/**
 * GET family tree
 *
 * Route example:
 * GET /api/family/:familyId/tree?headPersonId=10
 *
 * Optional query parameters:
 * - headPersonId: Selected Family Head
 * - maxDepth: Maximum descendant generations
 * - maxNodes: Maximum number of bloodline members
 */
const getFamilyTree = asyncHandler(async (req, res) => {
  const { familyId } = req.params;

  const {
    headPersonId,
    maxDepth,
    maxNodes,
  } = req.query;

  const result = await familyTreeService.getFamilyTree(
    familyId,
    {
      headPersonId,
      maxDepth,
      maxNodes,
    }
  );

  return res.status(200).json({
    success: true,
    message: "Family tree retrieved successfully",
    data: result,
  });
});

module.exports = {
  getFamilyTree,
};
