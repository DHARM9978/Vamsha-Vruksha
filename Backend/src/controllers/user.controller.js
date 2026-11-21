
const userService = require("../services/user.service");

// GET /api/users/me
const getUserProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};


// PUT /api/users/me
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUserProfile({
      userId: req.user.userId,
      userName: req.body.userName,
      phone: req.body.phone
    });

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};


// PATCH /api/users/change-password
const changeUserPassword = async (req, res, next) => {
  try {
    const result = await userService.changeUserPassword({
      userId: req.user.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      confirmPassword: req.body.confirmPassword
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};
