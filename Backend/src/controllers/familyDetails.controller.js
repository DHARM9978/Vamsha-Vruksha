
const familyDetailsService = require("../services/familyDetails.service");
const asyncHandler = require("../utils/asyncHandler");

const PRIVATE_FIELD_NAMES = new Set([
  "phonenumber",
  "mobilenumber",
  "email",
  "currentaddress",
  "password",
  "otp",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "secret",
]);

const normalizeFieldName = (key) =>
  String(key).replace(/[^a-z0-9]/gi, "").toLowerCase();

/**
 * Remove confidential values recursively from a family-details response.
 */
const removeConfidentialFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeConfidentialFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  const safe = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    if (PRIVATE_FIELD_NAMES.has(normalizeFieldName(key))) {
      continue;
    }

    safe[key] = removeConfidentialFields(fieldValue);
  }

  return safe;
};

const getFamilyDetails = asyncHandler(async (req, res) => {
  const { familyId } = req.params;
  const accessContext = req.familyAccess;

  if (!accessContext) {
    const error = new Error(
      "Family access context is missing. Ensure loadFamilyAccess runs before this controller."
    );
    error.statusCode = 500;
    error.code = "FAMILY_ACCESS_CONTEXT_MISSING";
    throw error;
  }

  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");

  const result = await familyDetailsService.getFamilyDetails(
    familyId,
    {
      accessContext,
      requesterUserId: accessContext.userId,
      requesterRole: accessContext.role,
    }
  );

  const responseData = accessContext.isGlobal
    ? result
    : removeConfidentialFields(result);

  return res.status(200).json({
    success: true,
    message: "Family details retrieved successfully",
    data: responseData,
  });
});

module.exports = {
  getFamilyDetails,
};
