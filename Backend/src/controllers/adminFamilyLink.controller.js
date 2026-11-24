
const adminFamilyLinkService = require("../services/adminFamilyLink.service");
const asyncHandler = require("../utils/asyncHandler");

const getAuthenticatedAdminId = (req) => {
  const adminId = Number(req.user?.userId);

  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    const error = new Error("A valid authenticated Admin account is required");
    error.statusCode = 401;
    error.code = "INVALID_ADMIN_IDENTITY";
    throw error;
  }

  return adminId;
};

const sendNoStore = (res) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
};

// ======================================================
// GET UNLINKED USER ACCOUNTS
// GET /api/admin/family-links/unlinked-users
// ======================================================

const listUnlinkedUserAccounts = asyncHandler(async (req, res) => {
  sendNoStore(res);

  const result = await adminFamilyLinkService.listUnlinkedUserAccounts({
    adminId: getAuthenticatedAdminId(req),
    page: req.query.page,
    pageSize: req.query.pageSize,
    search: req.query.search,
  });

  return res.status(200).json({
    success: true,
    message: "Unlinked User accounts retrieved successfully",
    data: result,
  });
});

// ======================================================
// SEARCH PERSON RECORDS FOR LINKING
// GET /api/admin/family-links/people?search=...&familyId=...
// ======================================================

const searchPeopleForLinking = asyncHandler(async (req, res) => {
  sendNoStore(res);

  const result = await adminFamilyLinkService.searchPeopleForLinking({
    adminId: getAuthenticatedAdminId(req),
    search: req.query.search,
    familyId: req.query.familyId,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });

  return res.status(200).json({
    success: true,
    message: "Family member search completed successfully",
    data: result,
  });
});

// ======================================================
// LINK USER ACCOUNT TO A PERSON RECORD
// POST /api/admin/family-links/link
// ======================================================

const linkUserToPerson = asyncHandler(async (req, res) => {
  sendNoStore(res);

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    const error = new Error("A valid request body is required");
    error.statusCode = 400;
    error.code = "INVALID_REQUEST_BODY";
    throw error;
  }

  const result = await adminFamilyLinkService.linkUserToPerson({
    adminId: getAuthenticatedAdminId(req),
    userId: req.body.userId,
    personId: req.body.personId,
    confirmEmailMismatch: req.body.confirmEmailMismatch ?? false,
  });

  return res.status(201).json({
    success: true,
    message: result.emailMismatch
      ? "User account linked successfully after email-mismatch confirmation"
      : "User account linked to family member successfully",
    data: result,
  });
});

// ======================================================
// GET ACCOUNT-TO-PERSON LINK STATUS
// GET /api/admin/family-links/users/:userId
// ======================================================

const getUserPersonLink = asyncHandler(async (req, res) => {
  sendNoStore(res);

  const result = await adminFamilyLinkService.getUserPersonLink(
    getAuthenticatedAdminId(req),
    req.params.userId
  );

  if (!result) {
    return res.status(200).json({
      success: true,
      message: "No family person is linked to this User account",
      data: { link: null },
    });
  }

  return res.status(200).json({
    success: true,
    message: "User-to-person link retrieved successfully",
    data: { link: result },
  });
});

module.exports = {
  listUnlinkedUserAccounts,
  searchPeopleForLinking,
  linkUserToPerson,
  getUserPersonLink,
};
