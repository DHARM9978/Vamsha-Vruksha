
"use strict";

const db = require("../config/db");
const bcrypt = require("bcryptjs");

const {
  validatePassword,
  MAX_PASSWORD_BYTES,
} = require("../utils/password");

// ==========================================
// CONFIGURATION
// ==========================================

const BCRYPT_SALT_ROUNDS = 12;

// ==========================================
// COMMON HELPERS
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeUserId = (userId) => {
  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError("Invalid user account ID");
  }

  return id;
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

// ==========================================
// 1. GET USER PROFILE
// ==========================================

const getUserProfile = async (userId) => {
  const id = normalizeUserId(userId);

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
    [id]
  );

  if (users.length === 0) {
    throw createError(
      "User account not found",
      404
    );
  }

  const user = users[0];

  return {
    userId: user.user_id,
    userName: user.user_name,
    email: user.user_email,
    phone: user.user_phone_number,
    role: user.role,
    isVerified: Number(user.is_verified) === 1,
    createdAt: user.created_at,
  };
};

// ==========================================
// 2. UPDATE USER PROFILE
// ==========================================

const updateUserProfile = async ({
  userId,
  userName,
  phone,
}) => {
  const id = normalizeUserId(userId);

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

  // user_phone_number is VARCHAR(15).
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
      [id]
    );

    if (users.length === 0) {
      throw createError(
        "User account not found",
        404
      );
    }

    if (normalizedPhone) {
      const [existingPhone] =
        await connection.execute(
          `SELECT user_id
           FROM user_login
           WHERE user_phone_number = ?
             AND user_id <> ?
           LIMIT 1`,
          [
            normalizedPhone,
            id,
          ]
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
        id,
      ]
    );

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);

    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "Phone number is already registered",
        409
      );
    }

    throw error;

  } finally {
    connection.release();
  }

  return getUserProfile(id);
};

// ==========================================
// 3. CHANGE USER PASSWORD
// ==========================================

const changeUserPassword = async ({
  userId,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const id = normalizeUserId(userId);

  // Validate required fields.
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

  // bcrypt processes at most 72 UTF-8 bytes.
  if (
    Buffer.byteLength(currentPassword, "utf8") >
    MAX_PASSWORD_BYTES
  ) {
    throw createError(
      "Current password exceeds the maximum allowed length"
    );
  }

  if (
    Buffer.byteLength(confirmPassword, "utf8") >
    MAX_PASSWORD_BYTES
  ) {
    throw createError(
      "Confirm password exceeds the maximum allowed length"
    );
  }

  if (newPassword !== confirmPassword) {
    throw createError(
      "New password and confirm password do not match"
    );
  }

  // Shared password policy.
  validatePassword(newPassword);

  if (currentPassword === newPassword) {
    throw createError(
      "New password must be different from current password"
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the account to prevent concurrent password changes.
    const [users] = await connection.execute(
      `SELECT
         user_id,
         password
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (users.length === 0) {
      throw createError(
        "User account not found",
        404
      );
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

    // Hash the new password.
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    // Increment token_version to invalidate existing JWTs.
    await connection.execute(
      `UPDATE user_login
       SET password = ?,
           token_version = token_version + 1
       WHERE user_id = ?`,
      [
        newPasswordHash,
        id,
      ]
    );

    await connection.commit();

    return {
      message:
        "Password changed successfully. Please log in again.",
    };

  } catch (error) {
    await rollbackSafely(connection);
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
  changeUserPassword,
};
