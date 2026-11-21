
const adminService = require("../services/admin.service");

// ======================================================
// 1. ADMIN LOGIN
// POST /api/admin/login
// ======================================================

const loginAdmin = async (req, res, next) => {
  try {
    const result = await adminService.loginAdmin({
      identifier: req.body.identifier,
      password: req.body.password,
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 2. CREATE ADMIN
// POST /api/admin/create
// ======================================================

const createAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.createAdmin({
      userName: req.body.userName,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 3. GET ADMIN PROFILE
// GET /api/admin/me
// ======================================================

const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await adminService.getAdminProfile(
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: "Admin profile retrieved successfully",
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 4. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
// ======================================================

const requestAdminEmailChange = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await adminService.requestAdminEmailChange({
        adminId: req.user.userId,
        newEmail: req.body.newEmail,
        currentPassword: req.body.currentPassword,
      });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        requestId: result.requestId,
        email: result.email,
        expiryMinutes: result.expiryMinutes,
        resendAfterSeconds: result.resendAfterSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 5. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
// ======================================================

const resendAdminEmailChangeOtp = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await adminService.resendAdminEmailChangeOtp(
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        requestId: result.requestId,
        email: result.email,
        expiryMinutes: result.expiryMinutes,
        resendAfterSeconds: result.resendAfterSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// 6. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
// ======================================================

const verifyAdminEmailChangeOtp = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await adminService.verifyAdminEmailChangeOtp({
        adminId: req.user.userId,
        otp: req.body.otp,
      });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        email: result.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  loginAdmin,
  createAdmin,
  getAdminProfile,

  requestAdminEmailChange,
  resendAdminEmailChangeOtp,
  verifyAdminEmailChangeOtp,
};
