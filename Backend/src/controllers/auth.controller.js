const authService = require("../services/auth.service");

// ======================================================
// RESPONSE HELPERS
// ======================================================

const setPrivateResponseHeaders = (res) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

// Explicit allow-list for account data returned to the frontend.
// Never serialize password hashes, OTP records, token versions,
// verification internals, or other database columns.
const pickUserProfile = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    userId: user.userId,
    userName: user.userName,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
  };
};

// Forward service and controller errors to the centralized
// Express error middleware.
const handle = (controller) => async (req, res, next) => {
  try {
    return await controller(req, res);
  } catch (error) {
    return next(error);
  }
};

// ======================================================
// 1. REGISTER
// POST /api/auth/register
// ======================================================

const register = handle(async (req, res) => {
  const {
    userName,
    email,
    phone,
    password,
  } = req.body || {};

  const result = await authService.registerUser({
    userName,
    email,
    phone,
    password,
  });

  setPrivateResponseHeaders(res);

  return res.status(201).json({
    success: true,
    message: result.message,
    data: {
      userId: result.userId,
      email: result.email,
    },
  });
});

// ======================================================
// 2. VERIFY SIGNUP OTP
// POST /api/auth/verify-otp
// ======================================================

const verifySignupOtp = handle(async (req, res) => {
  const {
    email,
    otp,
  } = req.body || {};

  const result = await authService.verifySignupOtp({
    email,
    otp,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      email: result.email,
    },
  });
});

// ======================================================
// 3. RESEND SIGNUP OTP
// POST /api/auth/resend-otp
// ======================================================

const resendSignupOtp = handle(async (req, res) => {
  const { email } = req.body || {};

  const result = await authService.resendSignupOtp({
    email,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

// ======================================================
// 4. LOGIN
// POST /api/auth/login
// ======================================================

const login = handle(async (req, res) => {
  const {
    identifier,
    password,
  } = req.body || {};

  const result = await authService.loginUser({
    identifier,
    password,
  });

  if (!result || typeof result.token !== "string" || !result.token) {
    const error = new Error("Authentication service returned an invalid login result");
    error.statusCode = 500;
    throw error;
  }

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token: result.token,
      user: pickUserProfile(result.user),
    },
  });
});

// ======================================================
// 5. GET CURRENT AUTHENTICATED USER
// GET /api/auth/me
// ======================================================

const getCurrentUser = handle(async (req, res) => {
  const userId = req.user?.userId;

  if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) {
    const error = new Error("Authenticated user context is invalid");
    error.statusCode = 401;
    throw error;
  }

  const user = await authService.getCurrentUser(Number(userId));

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved successfully",
    data: {
      user: pickUserProfile(user),
    },
  });
});

// ======================================================
// 6. FORGOT PASSWORD
// POST /api/auth/forgot-password
// ======================================================

const forgotPassword = handle(async (req, res) => {
  const result = await authService.requestPasswordReset({
    email: req.body?.email,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

// ======================================================
// 7. VERIFY PASSWORD RESET OTP
// POST /api/auth/verify-reset-otp
// ======================================================

const verifyResetOtp = handle(async (req, res) => {
  const result = await authService.verifyPasswordResetOtp({
    email: req.body?.email,
    otp: req.body?.otp,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

// ======================================================
// 8. RESET PASSWORD
// POST /api/auth/reset-password
// ======================================================

const resetPassword = handle(async (req, res) => {
  const result = await authService.resetPassword({
    email: req.body?.email,
    otp: req.body?.otp,
    newPassword: req.body?.newPassword,
  });

  setPrivateResponseHeaders(res);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  register,
  verifySignupOtp,
  resendSignupOtp,
  login,
  getCurrentUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};