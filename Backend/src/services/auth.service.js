// SESSION REVOCATION REQUIREMENT:
// Run the token_version migration before deploying this service.
// The authentication middleware must compare the JWT tokenVersion
// claim with user_login.token_version on every authenticated request.

"use strict";

const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  validatePassword,
  MAX_PASSWORD_BYTES,
} = require("../utils/password");

const {
  generateOtp,
  hashOtp,
  verifyOtpHash
} = require("../utils/otp");

const { sendOtpEmail } = require("../utils/email");

// ==========================================
// AUTHENTICATION CONFIGURATION
// ==========================================

const OTP_EXPIRY_MINUTES = Number(
  process.env.OTP_EXPIRY_MINUTES || 5
);

const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const BCRYPT_SALT_ROUNDS = 12;

// ==========================================
// COMMON HELPERS
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (email) => {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
};

const normalizeOtp = (otp) => {
  return String(otp ?? "").trim();
};

const validateOtpInput = (email, otp) => {
  if (!email || !/^\d{6}$/.test(otp)) {
    throw createError(
      "A valid email and six-digit OTP are required"
    );
  }
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

// ==========================================
// 1. REGISTER USER
// ==========================================

const registerUser = async ({
  userName,
  email,
  phone,
  password
}) => {
  const normalizedEmail = normalizeEmail(email);

  const normalizedPhone =
    typeof phone === "string"
      ? phone.trim() || null
      : null;

  const normalizedName =
    typeof userName === "string"
      ? userName.trim()
      : "";

  if (
    !normalizedName ||
    !normalizedEmail ||
    typeof password !== "string"
  ) {
    throw createError(
      "Name, email and password are required"
    );
  }

  if (normalizedName.length > 100) {
    throw createError(
      "Name cannot exceed 100 characters"
    );
  }

  // Shared password policy used by User and Admin services.
  validatePassword(password);

  const connection = await db.getConnection();

  try {
    const [existingUsers] = await connection.execute(
      `SELECT user_id
       FROM user_login
       WHERE user_email = ?
          OR (? IS NOT NULL AND user_phone_number = ?)
       LIMIT 1`,
      [
        normalizedEmail,
        normalizedPhone,
        normalizedPhone
      ]
    );

    if (existingUsers.length > 0) {
      throw createError(
        "Email or phone number is already registered",
        409
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      BCRYPT_SALT_ROUNDS
    );

    const otp = generateOtp();

    const otpHash = hashOtp(
      otp,
      normalizedEmail,
      "signup"
    );

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      `INSERT INTO user_login
       (
         user_name,
         user_email,
         user_phone_number,
         password,
         role,
         is_verified
       )
       VALUES (?, ?, ?, ?, 'User', 0)`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        passwordHash
      ]
    );

    // Remove any previous signup OTP.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'signup'`,
      [normalizedEmail]
    );

    // Store the hashed OTP.
    await connection.execute(
      `INSERT INTO otp_verification
       (
         user_email,
         otp,
         purpose,
         expires_at,
         attempts
       )
       VALUES (?, ?, 'signup', ?, 0)`,
      [
        normalizedEmail,
        otpHash,
        expiresAt
      ]
    );

    // Send OTP before committing so a mail failure
    // does not leave an unusable pending registration.
    await sendOtpEmail({
      email: normalizedEmail,
      otp,
      purpose: "signup"
    });

    await connection.commit();

    return {
      userId: userResult.insertId,
      email: normalizedEmail,
      message:
        "Registration successful. Please verify your email using the OTP."
    };

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 2. VERIFY SIGNUP OTP
// ==========================================

const verifySignupOtp = async ({
  email,
  otp
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = normalizeOtp(otp);

  validateOtpInput(
    normalizedEmail,
    normalizedOtp
  );

  const connection = await db.getConnection();

  let transactionFinished = false;

  try {
    await connection.beginTransaction();

    const [otpRows] = await connection.execute(
      `SELECT
         id,
         otp,
         expires_at,
         attempts,
         (expires_at <= NOW()) AS is_expired
       FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'signup'
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (otpRows.length === 0) {
      throw createError(
        "OTP not found. Please request a new OTP."
      );
    }

    const otpRecord = otpRows[0];

    // Check OTP expiry.
    if (
      !otpRecord.expires_at ||
      Number(otpRecord.is_expired) === 1
    ) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [otpRecord.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "OTP has expired. Please request a new OTP."
      );
    }

    // Check maximum incorrect attempts.
    if (
      Number(otpRecord.attempts) >= MAX_OTP_ATTEMPTS
    ) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [otpRecord.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
        429
      );
    }

    const isValid = verifyOtpHash(
      normalizedOtp,
      normalizedEmail,
      "signup",
      otpRecord.otp
    );

    // Incorrect OTP.
    if (!isValid) {
      await connection.execute(
        `UPDATE otp_verification
         SET attempts = attempts + 1
         WHERE id = ?`,
        [otpRecord.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError("Invalid OTP");
    }

    // Verify user account.
    const [userResult] = await connection.execute(
      `UPDATE user_login
       SET is_verified = 1
       WHERE user_email = ?
         AND is_verified = 0`,
      [normalizedEmail]
    );

    if (userResult.affectedRows === 0) {
      throw createError(
        "Account not found or already verified"
      );
    }

    // Consume OTP after successful verification.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE id = ?`,
      [otpRecord.id]
    );

    await connection.commit();
    transactionFinished = true;

    return {
      email: normalizedEmail,
      message:
        "Email verified successfully. You can now log in."
    };

  } catch (error) {
    if (!transactionFinished) {
      await rollbackSafely(connection);
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 3. RESEND SIGNUP OTP
// ==========================================

const resendSignupOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw createError("Email is required");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the account while processing the resend.
    const [users] = await connection.execute(
      `SELECT user_id, is_verified
       FROM user_login
       WHERE user_email = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (
      users.length === 0 ||
      Number(users[0].is_verified) === 1
    ) {
      throw createError(
        "Unable to resend OTP. Check your email or account verification status."
      );
    }

    // Check the most recently generated signup OTP.
    const [existingOtps] = await connection.execute(
      `SELECT
         id,
         GREATEST(
           0,
           TIMESTAMPDIFF(
             SECOND,
             created_at,
             NOW()
           )
         ) AS seconds_since_created
       FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'signup'
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (existingOtps.length > 0) {
      const elapsedSeconds = Number(
        existingOtps[0].seconds_since_created
      );

      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds =
          OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

        throw createError(
          `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
          429
        );
      }
    }

    const otp = generateOtp();

    const otpHash = hashOtp(
      otp,
      normalizedEmail,
      "signup"
    );

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    // Invalidate previous signup OTP.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'signup'`,
      [normalizedEmail]
    );

    // Insert the new OTP with zero attempts.
    await connection.execute(
      `INSERT INTO otp_verification
       (
         user_email,
         otp,
         purpose,
         expires_at,
         attempts
       )
       VALUES (?, ?, 'signup', ?, 0)`,
      [
        normalizedEmail,
        otpHash,
        expiresAt
      ]
    );

    await sendOtpEmail({
      email: normalizedEmail,
      otp,
      purpose: "signup"
    });

    await connection.commit();

    return {
      message:
        "A new signup OTP has been sent to your email."
    };

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 4. LOGIN USER
// ==========================================

const loginUser = async ({
  identifier,
  password
}) => {
  const loginIdentifier =
    typeof identifier === "string"
      ? identifier.trim()
      : "";

  if (
    !loginIdentifier ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    throw createError(
      "Email/phone number and password are required"
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw createError(
      "Password must not exceed 72 UTF-8 bytes"
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured"
    );
  }

  const [users] = await db.execute(
    `SELECT
       user_id,
       user_name,
       user_email,
       user_phone_number,
       password,
       role,
       is_verified,
       token_version
     FROM user_login
     WHERE (
       user_email = ?
       OR user_phone_number = ?
     )
       AND role = 'User'
     LIMIT 1`,
    [
      loginIdentifier.toLowerCase(),
      loginIdentifier
    ]
  );

  if (users.length === 0) {
    throw createError(
      "Invalid email/phone number or password",
      401
    );
  }

  const user = users[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw createError(
      "Invalid email/phone number or password",
      401
    );
  }

  if (Number(user.is_verified) !== 1) {
    throw createError(
      "Please verify your email before logging in",
      403
    );
  }

  const tokenVersion = Number(user.token_version);

  if (
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0
  ) {
    throw new Error(
      "Invalid token_version stored for user account"
    );
  }

  const token = jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      tokenVersion
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );

  return {
    token,
    user: {
      userId: user.user_id,
      userName: user.user_name,
      email: user.user_email,
      phone: user.user_phone_number,
      role: user.role
    }
  };
};

// ==========================================
// 5. GET CURRENT AUTHENTICATED USER
// ==========================================

const getCurrentUser = async (userId) => {
  const [users] = await db.execute(
    `SELECT
       user_id,
       user_name,
       user_email,
       user_phone_number,
       role,
       is_verified
     FROM user_login
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (users.length === 0) {
    throw createError(
      "User account not found",
      404
    );
  }

  const user = users[0];

  if (Number(user.is_verified) !== 1) {
    throw createError(
      "User account is not verified",
      403
    );
  }

  return {
    userId: user.user_id,
    userName: user.user_name,
    email: user.user_email,
    phone: user.user_phone_number,
    role: user.role
  };
};

// ==========================================
// 6. REQUEST PASSWORD RESET OTP
// ==========================================

const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw createError("Email is required");
  }

  const genericMessage =
    "If an account exists for this email, a reset OTP has been sent.";

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the account row first. This serializes concurrent
    // forgot-password requests for the same account and prevents
    // concurrent requests from bypassing the account-level cooldown.
    const [users] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         password_reset_otp_requested_at,
         CASE
           WHEN password_reset_otp_requested_at IS NULL THEN NULL
           ELSE GREATEST(
             0,
             TIMESTAMPDIFF(
               SECOND,
               password_reset_otp_requested_at,
               NOW()
             )
           )
         END AS seconds_since_last_request
       FROM user_login
       WHERE user_email = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    // Use the same response for unknown email addresses to reduce
    // account enumeration. No OTP is created or sent when the account
    // does not exist.
    if (users.length === 0) {
      await connection.commit();

      return {
        message: genericMessage
      };
    }

    const user = users[0];

    const hasPreviousRequest = Boolean(
      user.password_reset_otp_requested_at
    );

    const elapsedSeconds = Number(
      user.seconds_since_last_request
    );

    if (
      hasPreviousRequest &&
      Number.isFinite(elapsedSeconds) &&
      elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS
    ) {
      // Do not reveal whether the account exists or whether the
      // cooldown was triggered. The public response remains generic.
      await connection.commit();

      return {
        message: genericMessage
      };
    }

    const otp = generateOtp();

    const hashedOtp = hashOtp(
      otp,
      normalizedEmail,
      "forgot"
    );

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    // Invalidate any previous forgot-password OTP.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'forgot'`,
      [normalizedEmail]
    );

    // Store only the HMAC hash, never the plaintext OTP.
    await connection.execute(
      `INSERT INTO otp_verification
       (
         user_email,
         otp,
         purpose,
         expires_at,
         attempts
       )
       VALUES (?, ?, 'forgot', ?, 0)`,
      [
        normalizedEmail,
        hashedOtp,
        expiresAt
      ]
    );

    // Persist cooldown independently from the OTP row. This timestamp
    // is retained when resetPassword consumes and deletes the OTP.
    await connection.execute(
      `UPDATE user_login
       SET password_reset_otp_requested_at = NOW()
       WHERE user_id = ?`,
      [user.user_id]
    );

    // Send before commit so a delivery failure rolls back both the OTP
    // and the cooldown timestamp.
    await sendOtpEmail({
      email: normalizedEmail,
      otp,
      purpose: "forgot"
    });

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);
    throw error;

  } finally {
    connection.release();
  }

  return {
    message: genericMessage
  };
};

// ==========================================
// 7. VERIFY PASSWORD RESET OTP
// ==========================================

const verifyPasswordResetOtp = async ({
  email,
  otp
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = normalizeOtp(otp);

  validateOtpInput(
    normalizedEmail,
    normalizedOtp
  );

  const connection = await db.getConnection();

  let transactionFinished = false;

  try {
    await connection.beginTransaction();

    const [records] = await connection.execute(
      `SELECT
         id,
         otp,
         expires_at,
         attempts,
         (expires_at <= NOW()) AS is_expired
       FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'forgot'
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (records.length === 0) {
      throw createError(
        "Invalid or expired OTP"
      );
    }

    const record = records[0];

    // Maximum attempt protection.
    if (
      Number(record.attempts) >= MAX_OTP_ATTEMPTS
    ) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "Maximum OTP attempts exceeded. Request a new OTP.",
        429
      );
    }

    // OTP expiry.
    if (
      !record.expires_at ||
      Number(record.is_expired) === 1
    ) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "OTP has expired. Request a new OTP."
      );
    }

    const isValid = verifyOtpHash(
      normalizedOtp,
      normalizedEmail,
      "forgot",
      record.otp
    );

    if (!isValid) {
      await connection.execute(
        `UPDATE otp_verification
         SET attempts = attempts + 1
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError("Invalid OTP");
    }

    await connection.commit();
    transactionFinished = true;

    return {
      message:
        "OTP verified successfully. You can now reset your password."
    };

  } catch (error) {
    if (!transactionFinished) {
      await rollbackSafely(connection);
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// 8. RESET PASSWORD
// ==========================================

const resetPassword = async ({
  email,
  otp,
  newPassword
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = normalizeOtp(otp);

  validateOtpInput(
    normalizedEmail,
    normalizedOtp
  );

  // Use the same password policy as registration and password changes.
  validatePassword(newPassword);

  const connection = await db.getConnection();
  let transactionFinished = false;

  try {
    await connection.beginTransaction();

    // Always lock the account row before the OTP row. This uses the same
    // lock order as requestPasswordReset() and reduces deadlock risk when
    // a reset request and a password reset happen concurrently.
    const [users] = await connection.execute(
      `SELECT user_id, token_version
       FROM user_login
       WHERE user_email = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (users.length !== 1) {
      throw createError("Invalid or expired OTP");
    }

    const userId = Number(users[0].user_id);
    const previousTokenVersion = Number(users[0].token_version);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(previousTokenVersion) ||
      previousTokenVersion < 0
    ) {
      throw createError("Invalid account session version", 500);
    }

    // Lock the current forgot-password OTP after locking the account.
    const [records] = await connection.execute(
      `SELECT
         id,
         otp,
         expires_at,
         attempts,
         (expires_at <= NOW()) AS is_expired
       FROM otp_verification
       WHERE user_email = ?
         AND purpose = 'forgot'
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (records.length !== 1) {
      throw createError("Invalid or expired OTP");
    }

    const record = records[0];
    const attempts = Number(record.attempts);

    // The OTP is removed after the configured maximum number of attempts.
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "Maximum OTP attempts exceeded. Request a new OTP.",
        429
      );
    }

    // Expired OTPs cannot be used to change the password.
    if (
      !record.expires_at ||
      Number(record.is_expired) === 1
    ) {
      await connection.execute(
        `DELETE FROM otp_verification
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError(
        "OTP has expired. Request a new OTP."
      );
    }

    const isValid = verifyOtpHash(
      normalizedOtp,
      normalizedEmail,
      "forgot",
      record.otp
    );

    // Record an incorrect attempt and commit it before returning an error.
    if (!isValid) {
      await connection.execute(
        `UPDATE otp_verification
         SET attempts = attempts + 1
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionFinished = true;

      throw createError("Invalid OTP");
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    // Compare-and-increment protects against an unexpected concurrent
    // token-version change, even though the account row is already locked.
    const [passwordUpdate] = await connection.execute(
      `UPDATE user_login
       SET password = ?,
           token_version = token_version + 1
       WHERE user_id = ?
         AND token_version = ?`,
      [
        hashedPassword,
        userId,
        previousTokenVersion
      ]
    );

    if (passwordUpdate.affectedRows !== 1) {
      throw createError(
        "Password reset could not update the account session version.",
        500
      );
    }

    // Read the value back inside the same transaction before committing.
    const [updatedUsers] = await connection.execute(
      `SELECT token_version
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    const updatedTokenVersion = Number(
      updatedUsers[0]?.token_version
    );

    if (updatedTokenVersion !== previousTokenVersion + 1) {
      throw createError(
        "Password reset did not invalidate existing sessions.",
        500
      );
    }

    // Consume the OTP so it cannot be reused.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE id = ?
         AND purpose = 'forgot'`,
      [record.id]
    );

    await connection.commit();
    transactionFinished = true;

    return {
      message:
        "Password reset successfully. Please log in with your new password."
    };

  } catch (error) {
    if (!transactionFinished) {
      await rollbackSafely(connection);
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ==========================================
// EXPORT AUTHENTICATION SERVICES
// ==========================================

module.exports = {
  registerUser,
  verifySignupOtp,
  resendSignupOtp,
  loginUser,
  getCurrentUser,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
};