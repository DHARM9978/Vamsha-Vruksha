
const authService = require("../services/auth.service");

// ==========================================
// REGISTER
// ==========================================

const register = async (req, res, next) => {
  try {
    const { userName, email, phone, password } = req.body || {};

    const result = await authService.registerUser({
      userName,
      email,
      phone,
      password
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        email: result.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY SIGNUP OTP
// ==========================================

const verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};

    const result = await authService.verifySignupOtp({
      email,
      otp
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESEND SIGNUP OTP
// ==========================================

const resendSignupOtp = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    const result = await authService.resendSignupOtp({
      email
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};

    const result = await authService.loginUser({
      identifier,
      password
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: result.token,
        user: result.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully",
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset({
      email: req.body.email
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY PASSWORD RESET OTP
// ==========================================

const verifyResetOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyPasswordResetOtp({
      email: req.body.email,
      otp: req.body.otp
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      email: req.body.email,
      otp: req.body.otp,
      newPassword: req.body.newPassword
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  register,
  verifySignupOtp,
  resendSignupOtp,
  login,
  getCurrentUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword
};
