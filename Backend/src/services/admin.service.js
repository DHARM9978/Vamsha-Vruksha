"use strict";

const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const {
  validatePassword,
  MAX_PASSWORD_BYTES,
} = require("../utils/password");

const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
} = require("../utils/otp");

const { sendOtpEmail } = require("../utils/email");

// ======================================================
// CONFIGURATION
// ======================================================

const BCRYPT_SALT_ROUNDS = 12;
const OTP_PURPOSE = "admin_email_change";
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// ======================================================
// COMMON HELPERS
// ======================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase()
    : "";

const normalizePhone = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeAdminId = (value) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError("Invalid Admin account ID");
  }

  return id;
};

const validateEmailAddress = (email) =>
  typeof email === "string" &&
  email.length <= 150 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getOtpExpiryMinutes = () => {
  const minutes = Number(
    process.env.OTP_EXPIRY_MINUTES || 5
  );

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(
      "OTP_EXPIRY_MINUTES must be a positive integer"
    );
  }

  return minutes;
};

const rollbackSafely = async (connection) => {
  try {
    await connection.rollback();
  } catch (error) {
    // Preserve the original error.
  }
};

const deletePendingEmailRequest = async (
  requestId,
  adminId
) => {
  try {
    await db.execute(
      `DELETE FROM admin_email_change_requests
       WHERE request_id = ?
         AND user_id = ?`,
      [requestId, adminId]
    );
  } catch (error) {
    logger.error(
      "Failed to clean up pending Admin email-change request",
      {
        requestId,
        errorCode: error.code,
      }
    );
  }
};

// ======================================================
// VALIDATE ADMIN DETAILS
// ======================================================

const validateAdminDetails = ({
  userName,
  email,
  phone,
  password,
}) => {
  if (
    !userName ||
    !email ||
    !phone ||
    typeof password !== "string" ||
    !password
  ) {
    throw createError(
      "Name, email, mobile number and password are required"
    );
  }

  if (userName.length < 2 || userName.length > 100) {
    throw createError(
      "Name must contain between 2 and 100 characters"
    );
  }

  if (!validateEmailAddress(email)) {
    throw createError(
      "Please provide a valid email address"
    );
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    throw createError(
      "Mobile number must contain exactly 10 digits"
    );
  }

  // Use the same password policy as User accounts.
  validatePassword(password);
};

// ======================================================
// 1. ADMIN LOGIN
// ======================================================

const loginAdmin = async ({
  identifier,
  password,
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
    throw new Error("JWT_SECRET is not configured");
  }

  const [admins] = await db.execute(
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
       AND role = 'Admin'
     LIMIT 1`,
    [
      loginIdentifier.toLowerCase(),
      loginIdentifier,
    ]
  );

  if (admins.length === 0) {
    throw createError(
      "Invalid admin credentials",
      401
    );
  }

  const admin = admins[0];

  const passwordMatches = await bcrypt.compare(
    password,
    admin.password
  );

  if (!passwordMatches) {
    throw createError(
      "Invalid admin credentials",
      401
    );
  }

  if (Number(admin.is_verified) !== 1) {
    throw createError(
      "Admin account is not verified",
      403
    );
  }

  const tokenVersion = Number(admin.token_version);

  if (
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0
  ) {
    throw createError(
      "Admin session version is invalid. Please contact support.",
      500
    );
  }

  const token = jwt.sign(
    {
      userId: admin.user_id,
      role: admin.role,
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    admin: {
      userId: admin.user_id,
      userName: admin.user_name,
      email: admin.user_email,
      phone: admin.user_phone_number,
      role: admin.role,
    },
  };
};

// ======================================================
// 2. CREATE ADMIN
// ======================================================

const createAdmin = async ({
  userName,
  email,
  phone,
  password,
}) => {
  const normalizedName = normalizeName(userName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  validateAdminDetails({
    userName: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
  });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingAccounts] =
      await connection.execute(
        `SELECT
           user_id,
           user_email,
           user_phone_number
         FROM user_login
         WHERE user_email = ?
            OR user_phone_number = ?
         LIMIT 1
         FOR UPDATE`,
        [
          normalizedEmail,
          normalizedPhone,
        ]
      );

    if (existingAccounts.length > 0) {
      const emailExists = existingAccounts.some(
        (account) =>
          normalizeEmail(account.user_email) ===
          normalizedEmail
      );

      const phoneExists = existingAccounts.some(
        (account) =>
          account.user_phone_number === normalizedPhone
      );

      if (emailExists && phoneExists) {
        throw createError(
          "Email and mobile number are already registered",
          409
        );
      }

      if (emailExists) {
        throw createError(
          "Email is already registered",
          409
        );
      }

      if (phoneExists) {
        throw createError(
          "Mobile number is already registered",
          409
        );
      }
    }

    const passwordHash = await bcrypt.hash(
      password,
      BCRYPT_SALT_ROUNDS
    );

    const [result] = await connection.execute(
      `INSERT INTO user_login
       (
         user_name,
         user_email,
         user_phone_number,
         password,
         role,
         is_verified,
         token_version
       )
       VALUES (?, ?, ?, ?, 'Admin', 1, 0)`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        passwordHash,
      ]
    );

    await connection.commit();

    return {
      userId: result.insertId,
      userName: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: "Admin",
    };

  } catch (error) {
    await rollbackSafely(connection);

    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "Email or mobile number is already registered",
        409
      );
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ======================================================
// 3. GET ADMIN PROFILE
// ======================================================

const getAdminProfile = async (adminId) => {
  const id = normalizeAdminId(adminId);

  const [admins] = await db.execute(
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
       AND role = 'Admin'
     LIMIT 1`,
    [id]
  );

  if (admins.length === 0) {
    throw createError(
      "Admin account not found",
      404
    );
  }

  const admin = admins[0];

  if (Number(admin.is_verified) !== 1) {
    throw createError(
      "Admin account is not verified",
      403
    );
  }

  return {
    userId: admin.user_id,
    userName: admin.user_name,
    email: admin.user_email,
    phone: admin.user_phone_number,
    role: admin.role,
    createdAt: admin.created_at,
  };
};

// ======================================================
// 4. CHANGE AUTHENTICATED ADMIN PASSWORD
// ======================================================

const changeAdminPassword = async ({
  adminId,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const id = normalizeAdminId(adminId);

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    typeof newPassword !== "string" ||
    newPassword.length === 0 ||
    typeof confirmPassword !== "string" ||
    confirmPassword.length === 0
  ) {
    throw createError(
      "Current password, new password and confirmation password are required"
    );
  }

  if (
    Buffer.byteLength(currentPassword, "utf8") > MAX_PASSWORD_BYTES ||
    Buffer.byteLength(confirmPassword, "utf8") > MAX_PASSWORD_BYTES
  ) {
    throw createError(
      "Current and confirmation passwords must not exceed 72 UTF-8 bytes"
    );
  }

  if (newPassword !== confirmPassword) {
    throw createError(
      "New password and confirmation password do not match"
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

    const [admins] = await connection.execute(
      `SELECT
         user_id,
         password,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (admins.length === 0 || admins[0].role !== "Admin") {
      throw createError("Admin account not found", 404);
    }

    const admin = admins[0];

    if (Number(admin.is_verified) !== 1) {
      throw createError("Admin account is not verified", 403);
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!passwordMatches) {
      throw createError("Current password is incorrect", 401);
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    const [updateResult] = await connection.execute(
      `UPDATE user_login
       SET password = ?,
           token_version = token_version + 1
       WHERE user_id = ?
         AND role = 'Admin'`,
      [newPasswordHash, id]
    );

    if (updateResult.affectedRows !== 1) {
      throw createError("Admin password could not be updated", 409);
    }

    await connection.commit();

    return {
      message: "Admin password changed successfully. Please log in again.",
    };
  } catch (error) {
    await rollbackSafely(connection);
    throw error;
  } finally {
    connection.release();
  }
};

// ======================================================
// 4. REQUEST ADMIN EMAIL CHANGE
// ======================================================

const requestAdminEmailChange = async ({
  adminId,
  newEmail,
  currentPassword,
}) => {
  const id = normalizeAdminId(adminId);
  const normalizedNewEmail = normalizeEmail(newEmail);

  if (!validateEmailAddress(normalizedNewEmail)) {
    throw createError(
      "Please provide a valid new email address"
    );
  }

  if (
    typeof currentPassword !== "string" ||
    !currentPassword
  ) {
    throw createError(
      "Current password is required"
    );
  }

  if (Buffer.byteLength(currentPassword, "utf8") > MAX_PASSWORD_BYTES) {
    throw createError(
      "Current password must not exceed 72 UTF-8 bytes"
    );
  }

  const expiryMinutes = getOtpExpiryMinutes();
  const connection = await db.getConnection();

  let requestId;
  let otp;

  try {
    await connection.beginTransaction();

    const [admins] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         password,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (
      admins.length === 0 ||
      admins[0].role !== "Admin"
    ) {
      throw createError(
        "Admin account not found",
        404
      );
    }

    const admin = admins[0];

    if (Number(admin.is_verified) !== 1) {
      throw createError(
        "Admin account is not verified",
        403
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!passwordMatches) {
      throw createError(
        "Current password is incorrect",
        401
      );
    }

    const oldEmail = normalizeEmail(
      admin.user_email
    );

    if (normalizedNewEmail === oldEmail) {
      throw createError(
        "New email must be different from your current email"
      );
    }

    // Remove expired email-change reservations.
    await connection.execute(
      `DELETE FROM admin_email_change_requests
       WHERE expires_at <= NOW()`
    );

    const [pendingRequests] =
      await connection.execute(
        `SELECT
           request_id,
           COALESCE(
             TIMESTAMPDIFF(
               SECOND,
               last_sent_at,
               NOW()
             ),
             0
           ) AS elapsed_seconds
         FROM admin_email_change_requests
         WHERE user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

    if (pendingRequests.length > 0) {
      const elapsedSeconds = Number(
        pendingRequests[0].elapsed_seconds
      );

      if (
        elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS
      ) {
        const remainingSeconds =
          OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

        const error = createError(
          `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
          429
        );

        error.retryAfterSeconds = remainingSeconds;
        throw error;
      }
    }

    const [existingAccounts] =
      await connection.execute(
        `SELECT user_id
         FROM user_login
         WHERE user_email = ?
           AND user_id <> ?
         LIMIT 1
         FOR UPDATE`,
        [
          normalizedNewEmail,
          id,
        ]
      );

    if (existingAccounts.length > 0) {
      throw createError(
        "This email address is already registered. Please use another email address.",
        409
      );
    }

    const [existingRequests] =
      await connection.execute(
        `SELECT request_id
         FROM admin_email_change_requests
         WHERE new_email = ?
           AND user_id <> ?
         LIMIT 1
         FOR UPDATE`,
        [
          normalizedNewEmail,
          id,
        ]
      );

    if (existingRequests.length > 0) {
      throw createError(
        "This email address is already reserved by another pending request.",
        409
      );
    }

    // Replace the previous request after cooldown.
    await connection.execute(
      `DELETE FROM admin_email_change_requests
       WHERE user_id = ?`,
      [id]
    );

    otp = generateOtp();

    const otpHash = hashOtp(
      otp,
      normalizedNewEmail,
      OTP_PURPOSE
    );

    const [insertResult] = await connection.execute(
      `INSERT INTO admin_email_change_requests
       (
         user_id,
         old_email,
         new_email,
         otp_hash,
         expires_at,
         attempts,
         last_sent_at
       )
       VALUES (
         ?, ?, ?, ?,
         DATE_ADD(NOW(), INTERVAL ? MINUTE),
         0,
         NOW()
       )`,
      [
        id,
        oldEmail,
        normalizedNewEmail,
        otpHash,
        expiryMinutes,
      ]
    );

    requestId = insertResult.insertId;

    await connection.commit();

  } catch (error) {
    await rollbackSafely(connection);

    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "Email address is already registered or reserved. Please use another email address.",
        409
      );
    }

    throw error;

  } finally {
    connection.release();
  }

  // Send OTP after committing the pending request.
  try {
    await sendOtpEmail({
      email: normalizedNewEmail,
      otp,
      purpose: OTP_PURPOSE,
    });

  } catch (error) {
    await deletePendingEmailRequest(
      requestId,
      id
    );

    logger.error(
      "Failed to send Admin email-change verification message",
      {
        requestId,
        errorCode: error.code,
      }
    );

    throw createError(
      "Unable to send the verification email. Your current email has not been changed. Please try again.",
      502
    );
  }

  logger.info(
    "Admin email-change verification request created",
    {
      requestId,
    }
  );

  return {
    requestId,
    email: normalizedNewEmail,
    expiryMinutes,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    message: "Verification code sent to your new email address",
  };
};

// ======================================================
// 5. RESEND ADMIN EMAIL CHANGE OTP
// ======================================================

const resendAdminEmailChangeOtp = async (adminId) => {
  const id = normalizeAdminId(adminId);
  const expiryMinutes = getOtpExpiryMinutes();

  const connection = await db.getConnection();

  let requestId;
  let newEmail;
  let otp;

  let transactionCommitted = false;

  try {
    await connection.beginTransaction();

    const [admins] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (
      admins.length === 0 ||
      admins[0].role !== "Admin"
    ) {
      throw createError(
        "Admin account not found",
        404
      );
    }

    if (Number(admins[0].is_verified) !== 1) {
      throw createError(
        "Admin account is not verified",
        403
      );
    }

    const [requests] = await connection.execute(
      `SELECT
         request_id,
         old_email,
         new_email,
         TIMESTAMPDIFF(
           SECOND,
           last_sent_at,
           NOW()
         ) AS elapsed_seconds
       FROM admin_email_change_requests
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (requests.length === 0) {
      throw createError(
        "No pending email change request found. Please start again.",
        404
      );
    }

    const request = requests[0];

    requestId = request.request_id;
    newEmail = normalizeEmail(request.new_email);

    if (
      normalizeEmail(admins[0].user_email) !==
      normalizeEmail(request.old_email)
    ) {
      await connection.execute(
        `DELETE FROM admin_email_change_requests
         WHERE request_id = ?`,
        [requestId]
      );

      await connection.commit();
      transactionCommitted = true;

      throw createError(
        "Your current email has changed. Please start a new email-change request.",
        409
      );
    }

    const elapsedSeconds = Number(
      request.elapsed_seconds || 0
    );

    if (
      elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS
    ) {
      const remainingSeconds =
        OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

      const error = createError(
        `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
        429
      );

      error.retryAfterSeconds = remainingSeconds;
      throw error;
    }

    const [existingAccounts] =
      await connection.execute(
        `SELECT user_id
         FROM user_login
         WHERE user_email = ?
           AND user_id <> ?
         LIMIT 1
         FOR UPDATE`,
        [
          newEmail,
          id,
        ]
      );

    if (existingAccounts.length > 0) {
      await connection.execute(
        `DELETE FROM admin_email_change_requests
         WHERE request_id = ?`,
        [requestId]
      );

      await connection.commit();
      transactionCommitted = true;

      throw createError(
        "This email address is already registered. Please start again with another email.",
        409
      );
    }

    otp = generateOtp();

    const otpHash = hashOtp(
      otp,
      newEmail,
      OTP_PURPOSE
    );

    await connection.execute(
      `UPDATE admin_email_change_requests
       SET
         otp_hash = ?,
         expires_at = DATE_ADD(
           NOW(),
           INTERVAL ? MINUTE
         ),
         attempts = 0,
         last_sent_at = NOW()
       WHERE request_id = ?
         AND user_id = ?`,
      [
        otpHash,
        expiryMinutes,
        requestId,
        id,
      ]
    );

    await connection.commit();
    transactionCommitted = true;

  } catch (error) {
    if (!transactionCommitted) {
      await rollbackSafely(connection);
    }

    throw error;

  } finally {
    connection.release();
  }

  try {
    await sendOtpEmail({
      email: newEmail,
      otp,
      purpose: OTP_PURPOSE,
    });

  } catch (error) {
    await deletePendingEmailRequest(
      requestId,
      id
    );

    logger.error(
      "Failed to resend Admin email-change verification message",
      {
        requestId,
        errorCode: error.code,
      }
    );

    throw createError(
      "Unable to resend the verification email. Please start a new request.",
      502
    );
  }

  logger.info(
    "Admin email-change verification code resent",
    {
      requestId,
    }
  );

  return {
    requestId,
    email: newEmail,
    expiryMinutes,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    message: "A new verification code has been sent",
  };
};

// ======================================================
// 6. VERIFY ADMIN EMAIL CHANGE OTP
// ======================================================

const verifyAdminEmailChangeOtp = async ({
  adminId,
  otp,
}) => {
  const id = normalizeAdminId(adminId);

  const normalizedOtp =
    typeof otp === "string"
      ? otp.trim()
      : "";

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw createError(
      "Please enter a valid six-digit verification code"
    );
  }

  const connection = await db.getConnection();

  let transactionCommitted = false;

  try {
    await connection.beginTransaction();

    const [admins] = await connection.execute(
      `SELECT
         user_id,
         user_email,
         role,
         is_verified
       FROM user_login
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (
      admins.length === 0 ||
      admins[0].role !== "Admin"
    ) {
      throw createError(
        "Admin account not found",
        404
      );
    }

    const admin = admins[0];

    if (Number(admin.is_verified) !== 1) {
      throw createError(
        "Admin account is not verified",
        403
      );
    }

    const [requests] = await connection.execute(
      `SELECT
         request_id,
         old_email,
         new_email,
         otp_hash,
         attempts,
         (expires_at <= NOW()) AS is_expired
       FROM admin_email_change_requests
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (requests.length === 0) {
      throw createError(
        "No pending email change request found. Please request a new code.",
        404
      );
    }

    const request = requests[0];

    const oldEmail = normalizeEmail(
      request.old_email
    );

    const newEmail = normalizeEmail(
      request.new_email
    );

    if (
      normalizeEmail(admin.user_email) !== oldEmail
    ) {
      await connection.execute(
        `DELETE FROM admin_email_change_requests
         WHERE request_id = ?`,
        [request.request_id]
      );

      await connection.commit();
      transactionCommitted = true;

      throw createError(
        "Your current email has changed. Please start a new request.",
        409
      );
    }

    if (Number(request.is_expired) === 1) {
      throw createError(
        "Verification code has expired. Please request a new code."
      );
    }

    const attempts = Number(request.attempts);

    if (attempts >= MAX_OTP_ATTEMPTS) {
      await connection.execute(
        `DELETE FROM admin_email_change_requests
         WHERE request_id = ?`,
        [request.request_id]
      );

      await connection.commit();
      transactionCommitted = true;

      throw createError(
        "Maximum verification attempts exceeded. Please start a new request.",
        429
      );
    }

    const isValidOtp = verifyOtpHash(
      normalizedOtp,
      newEmail,
      OTP_PURPOSE,
      request.otp_hash
    );

    if (!isValidOtp) {
      const nextAttempts = attempts + 1;

      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await connection.execute(
          `DELETE FROM admin_email_change_requests
           WHERE request_id = ?`,
          [request.request_id]
        );

      } else {
        await connection.execute(
          `UPDATE admin_email_change_requests
           SET attempts = ?
           WHERE request_id = ?`,
          [
            nextAttempts,
            request.request_id,
          ]
        );
      }

      await connection.commit();
      transactionCommitted = true;

      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        throw createError(
          "Maximum verification attempts exceeded. Please start a new request.",
          429
        );
      }

      throw createError(
        `Invalid verification code. ${MAX_OTP_ATTEMPTS - nextAttempts} attempts remaining.`,
        400
      );
    }

    // Final duplicate email check.
    const [existingAccounts] =
      await connection.execute(
        `SELECT user_id
         FROM user_login
         WHERE user_email = ?
           AND user_id <> ?
         LIMIT 1
         FOR UPDATE`,
        [
          newEmail,
          id,
        ]
      );

    if (existingAccounts.length > 0) {
      await connection.execute(
        `DELETE FROM admin_email_change_requests
         WHERE request_id = ?`,
        [request.request_id]
      );

      await connection.commit();
      transactionCommitted = true;

      throw createError(
        "This email address is already registered. Please start again with another email.",
        409
      );
    }

    // The otp_verification.user_email foreign key references
    // user_login.user_email without ON UPDATE CASCADE. Remove OTPs tied
    // to the old address before changing the parent email. This also
    // invalidates any signup/password-reset OTPs issued to the old address.
    await connection.execute(
      `DELETE FROM otp_verification
       WHERE user_email = ?`,
      [oldEmail]
    );

    // Update email and invalidate all existing JWTs.
    const [updateResult] = await connection.execute(
      `UPDATE user_login
       SET user_email = ?,
           token_version = token_version + 1
       WHERE user_id = ?
         AND role = 'Admin'`,
      [
        newEmail,
        id,
      ]
    );

    if (updateResult.affectedRows !== 1) {
      throw createError(
        "Admin email could not be updated. Please try again.",
        500
      );
    }

    // Consume OTP so it cannot be reused.
    await connection.execute(
      `DELETE FROM admin_email_change_requests
       WHERE request_id = ?
         AND user_id = ?`,
      [
        request.request_id,
        id,
      ]
    );

    await connection.commit();
    transactionCommitted = true;

    logger.info(
      "Admin email address updated after OTP verification",
      {
        requestId: request.request_id,
      }
    );

    return {
      userId: id,
      email: newEmail,
      message:
        "Admin email address updated and verified successfully",
    };

  } catch (error) {
    if (!transactionCommitted) {
      await rollbackSafely(connection);
    }

    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "This email address is already registered. Please use another email address.",
        409
      );
    }

    throw error;

  } finally {
    connection.release();
  }
};

// ======================================================
// EXPORT ADMIN SERVICES
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