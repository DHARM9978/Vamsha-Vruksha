const adminService = require("../services/admin.service");

// ======================================================
// RESPONSE HELPERS
// ======================================================

const setPrivateResponseHeaders = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const pickAdminProfile = (admin) => {
  if (!admin || typeof admin !== "object") {
    return null;
  }

  // Explicit allow-list: never serialize password hashes,
  // OTP data, session secrets, or internal database fields.
  return {
    userId: admin.userId,
    userName: admin.userName,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    ...(admin.createdAt !== undefined
      ? { createdAt: admin.createdAt }
      : {}),
  };
};

const pickEmailChangeRequest = (result) => ({
  requestId: result.requestId,
  email: result.email,
  expiryMinutes: result.expiryMinutes,
  resendAfterSeconds: result.resendAfterSeconds,
});

// Keep the existing controller error-handling contract:
// forward service errors to the centralized Express error middleware.
const handle = (controller) => async (req, res, next) => {
  try {
    return await controller(req, res);
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// 1. ADMIN LOGIN
// POST /api/admin/login
// ======================================================

const loginAdmin = handle(async (req, res) => {
  const result = await adminService.loginAdmin({
    identifier: req.body?.identifier,
    password: req.body?.password,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Admin login successful",
    data: {
      // This is the authentication credential required by the client.
      token: result.token,
      admin: pickAdminProfile(result.admin),
    },
  });
});

// ======================================================
// 2. CREATE ADMIN
// POST /api/admin/create
// ======================================================

const createAdmin = handle(async (req, res) => {
  const admin = await adminService.createAdmin({
    userName: req.body?.userName,
    email: req.body?.email,
    phone: req.body?.phone,
    password: req.body?.password,
  });

  setPrivateResponseHeaders(res);

  return res.status(201).json({
    success: true,
    message: "Admin account created successfully",
    data: {
      admin: pickAdminProfile(admin),
    },
  });
});

// ======================================================
// 3. GET ADMIN PROFILE
// GET /api/admin/me
// ======================================================

const getAdminProfile = handle(async (req, res) => {
  const admin = await adminService.getAdminProfile(
    req.user.userId
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Admin profile retrieved successfully",
    data: {
      admin: pickAdminProfile(admin),
    },
  });
});

// ======================================================
// 4. CHANGE AUTHENTICATED ADMIN PASSWORD
// PATCH /api/admin/change-password
// ======================================================

const changeAdminPassword = handle(async (req, res) => {
  const result = await adminService.changeAdminPassword({
    adminId: req.user.userId,
    currentPassword: req.body?.currentPassword,
    newPassword: req.body?.newPassword,
    confirmPassword: req.body?.confirmPassword,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

// ======================================================
// 4. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
// ======================================================

const requestAdminEmailChange = handle(async (req, res) => {
  const result = await adminService.requestAdminEmailChange({
    adminId: req.user.userId,
    newEmail: req.body?.newEmail,
    currentPassword: req.body?.currentPassword,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: pickEmailChangeRequest(result),
  });
});

// ======================================================
// 5. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
// ======================================================

const resendAdminEmailChangeOtp = handle(async (req, res) => {
  const result = await adminService.resendAdminEmailChangeOtp(
    req.user.userId
  );

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: pickEmailChangeRequest(result),
  });
});

// ======================================================
// 6. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
// ======================================================

const verifyAdminEmailChangeOtp = handle(async (req, res) => {
  const result = await adminService.verifyAdminEmailChangeOtp({
    adminId: req.user.userId,
    otp: req.body?.otp,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      userId: result.userId,
      email: result.email,
    },
  });
});

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  loginAdmin,
  createAdmin,
  getAdminProfile,
  changeAdminPassword,
  requestAdminEmailChange,
  resendAdminEmailChangeOtp,
  verifyAdminEmailChangeOtp,
};