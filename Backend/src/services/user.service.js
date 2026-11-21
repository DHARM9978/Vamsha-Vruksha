
const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ==========================================
// CONFIGURATION
// ==========================================

const BCRYPT_SALT_ROUNDS = 12;

// ==========================================
// COMMON HELPER
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Password requirements:
// - Minimum 8 characters
// - At least one uppercase letter
// - At least one number
// - At least one special character
const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[!@#$%^&*]/.test(password)
  ) {
    throw createError(
      "Password must contain at least 8 characters, one uppercase letter, one number and one special character (!@#$%^&*)."
    );
  }
};

// ==========================================
// 1. GET USER PROFILE
// ==========================================

const getUserProfile = async (userId) => {
  const [users] = await db.execute(
    `SELECT
       user_id,
       user_name,
       user_email,
       user_phone_number,
       role,
       is_verified,
       created_at
     FROM user_login
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (users.length === 0) {
    throw createError("User account not found", 404);
  }

  const user = users[0];

  return {
    userId: user.user_id,
    userName: user.user_name,
    email: user.user_email,
    phone: user.user_phone_number,
    role: user.role,
    isVerified: Number(user.is_verified) === 1,
    createdAt: user.created_at
  };
};

// ==========================================
// 2. UPDATE USER PROFILE
// ==========================================

const updateUserProfile = async ({
  userId,
  userName,
  phone
}) => {
  const normalizedName =
    typeof userName === "string"
      ? userName.trim()
      : "";

  const normalizedPhone =
    typeof phone === "string"
      ? phone.trim() || null
      : null;

  if (!normalizedName) {
    throw createError("User name is required");
  }

  if (normalizedName.length > 100) {
    throw createError(
      "User name cannot exceed 100 characters"
    );
  }

  if (
    normalizedPhone &&
    !/^[0-9]{7,15}$/.test(normalizedPhone)
  ) {
    throw createError(
      "Please provide a valid phone number"
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the user record during the update.
    const [users] = await connection.execute(
      `SELECT user_id
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (users.length === 0) {
      throw createError("User account not found", 404);
    }

    // Check whether another account uses this phone.
    if (normalizedPhone) {
      const [existingPhone] = await connection.execute(
        `SELECT user_id
         FROM user_login
         WHERE user_phone_number = ?
           AND user_id <> ?
         LIMIT 1`,
        [normalizedPhone, userId]
      );

      if (existingPhone.length > 0) {
        throw createError(
          "Phone number is already registered",
          409
        );
      }
    }

    await connection.execute(
      `UPDATE user_login
       SET user_name = ?,
           user_phone_number = ?
       WHERE user_id = ?`,
      [
        normalizedName,
        normalizedPhone,
        userId
      ]
    );

    await connection.commit();

    return await getUserProfile(userId);

  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // Preserve the original error.
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 3. CHANGE USER PASSWORD
// ==========================================

const changeUserPassword = async ({
  userId,
  currentPassword,
  newPassword,
  confirmPassword
}) => {
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    typeof newPassword !== "string" ||
    !newPassword ||
    typeof confirmPassword !== "string" ||
    !confirmPassword
  ) {
    throw createError(
      "Current password, new password and confirm password are required"
    );
  }

  // Check password confirmation.
  if (newPassword !== confirmPassword) {
    throw createError(
      "New password and confirm password do not match"
    );
  }

  // Apply the original PHP password requirements.
  validatePassword(newPassword);

  // Prevent reusing the current password.
  if (currentPassword === newPassword) {
    throw createError(
      "New password must be different from current password"
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the user record while changing the password.
    const [users] = await connection.execute(
      `SELECT user_id, password
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (users.length === 0) {
      throw createError("User account not found", 404);
    }

    const user = users[0];

    // Verify the existing password.
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      throw createError(
        "Current password is incorrect",
        401
      );
    }

    // Generate the new password hash.
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    await connection.execute(
      `UPDATE user_login
       SET password = ?
       WHERE user_id = ?`,
      [
        newPasswordHash,
        userId
      ]
    );

    await connection.commit();

    return {
      message:
        "Password changed successfully. Please log in again."
    };

  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // Preserve the original error.
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// EXPORT USER SERVICES
// ==========================================

module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};
