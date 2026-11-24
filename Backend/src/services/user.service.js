
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

// Keep the self-service password policy aligned with auth.service.js
// and auth.validator.js. bcrypt processes at most 72 UTF-8 bytes.
const MAX_PASSWORD_BYTES = 72;

const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw createError(
      "Password must contain at least 8 characters, one uppercase letter, one number and one special character, and must not exceed 72 UTF-8 bytes"
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

  if (newPassword !== confirmPassword) {
    throw createError(
      "New password and confirm password do not match"
    );
  }

  validatePassword(newPassword);

  if (currentPassword === newPassword) {
    throw createError(
      "New password must be different from current password"
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

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

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    await connection.execute(
      `UPDATE user_login
       SET password = ?,
           token_version = token_version + 1
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
