
const familyAccessService = require("../services/familyAccess.service");
const asyncHandler = require("../utils/asyncHandler");

const parsePositiveId = (value) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const sendNotFound = (res) =>
  res.status(404).json({
    success: false,
    message: "The requested family resource was not found",
  });

/**
 * Loads the current account's family authorization context.
 *
 * Must be mounted AFTER authenticate middleware.
 */
const loadFamilyAccess = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication is required",
    });
  }

  req.familyAccess =
    await familyAccessService.getFamilyAccessContext(req.user.userId);

  return next();
});

/**
 * Checks access to req.params.familyId.
 */
const requireFamilyIdAccess = (req, res, next) => {
  const familyId = parsePositiveId(req.params?.familyId);

  if (!familyId) {
    return res.status(400).json({
      success: false,
      message: "A valid family ID is required",
    });
  }

  if (
    !familyAccessService.hasFamilyAccess(
      req.familyAccess,
      familyId
    )
  ) {
    return sendNotFound(res);
  }

  return next();
};

/**
 * Checks access to any person in the extended family scope.
 */
const requirePersonIdAccess = (req, res, next) => {
  const personId = parsePositiveId(req.params?.personId);

  if (!personId) {
    return res.status(400).json({
      success: false,
      message: "A valid person ID is required",
    });
  }

  if (
    !familyAccessService.hasPersonAccess(
      req.familyAccess,
      personId
    )
  ) {
    return sendNotFound(res);
  }

  return next();
};

/**
 * Checks access only to a person in the bloodline hierarchy.
 * Use this for selecting Family Tree roots.
 */
const requireBloodlinePersonIdAccess = (req, res, next) => {
  const personId = parsePositiveId(req.params?.personId);

  if (!personId) {
    return res.status(400).json({
      success: false,
      message: "A valid person ID is required",
    });
  }

  if (
    !familyAccessService.hasBloodlinePersonAccess(
      req.familyAccess,
      personId
    )
  ) {
    return sendNotFound(res);
  }

  return next();
};

/**
 * Checks a single familyId supplied in query parameters.
 *
 * For list endpoints without a familyId, the controller
 * must filter SQL results using req.familyAccess.familyIds.
 */
const requireFamilyQueryAccess = (req, res, next) => {
  const rawFamilyId = req.query?.familyId;

  if (rawFamilyId === undefined) {
    return next();
  }

  const familyId = parsePositiveId(rawFamilyId);

  if (!familyId) {
    return res.status(400).json({
      success: false,
      message: "A valid family ID is required",
    });
  }

  if (
    !familyAccessService.hasFamilyAccess(
      req.familyAccess,
      familyId
    )
  ) {
    return sendNotFound(res);
  }

  return next();
};

module.exports = {
  loadFamilyAccess,
  requireFamilyIdAccess,
  requirePersonIdAccess,
  requireBloodlinePersonIdAccess,
  requireFamilyQueryAccess,
};
