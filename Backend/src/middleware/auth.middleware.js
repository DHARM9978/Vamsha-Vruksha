
"use strict";

const jwt = require("jsonwebtoken");
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const unauthorized = (
  res,
  message = "Invalid or expired authentication token"
) => {
  return res.status(401).json({
    success: false,
    message,
  });
};

const authenticate = asyncHandler(async (req, res, next) => {
  // ======================================================
  // 1. EXTRACT BEARER TOKEN
  // ======================================================

  const authorization = req.headers.authorization;

  if (typeof authorization !== "string") {
    return unauthorized(
      res,
      "Authentication token is required"
    );
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return unauthorized(
      res,
      "Authentication token is missing"
    );
  }

  // Reject excessively large tokens.
  if (token.length > 8192) {
    return unauthorized(res);
  }

  // ======================================================
  // 2. VALIDATE JWT SECRET CONFIGURATION
  // ======================================================

  if (
    typeof process.env.JWT_SECRET !== "string" ||
    !process.env.JWT_SECRET.trim()
  ) {
    const error = new Error(
      "JWT_SECRET is not configured"
    );

    error.statusCode = 500;
    throw error;
  }

  // ======================================================
  // 3. VERIFY JWT
  // ======================================================

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return unauthorized(res);
    }

    throw error;
  }

  // ======================================================
  // 4. VALIDATE JWT PAYLOAD
  // ======================================================

  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded)
  ) {
    return unauthorized(res);
  }

  const userId = Number(decoded.userId);
  const tokenVersion = decoded.tokenVersion;
  const tokenRole = decoded.role;

  // Require the expiration claim.
  if (
    typeof decoded.exp !== "number" ||
    !Number.isFinite(decoded.exp)
  ) {
    return unauthorized(res);
  }

  // Require all claims issued by the updated login service.
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0 ||
    !["Admin", "User"].includes(tokenRole)
  ) {
    return unauthorized(res);
  }

  // ======================================================
  // 5. FETCH CURRENT ACCOUNT AUTHORIZATION STATE
  // ======================================================

  const [users] = await db.execute(
    `SELECT
       user_id,
       role,
       token_version,
       is_verified
     FROM user_login
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!users || users.length === 0) {
    return unauthorized(res);
  }

  const account = users[0];

  const currentTokenVersion = Number(
    account.token_version
  );

  // ======================================================
  // 6. CHECK CURRENT ACCOUNT STATUS
  // ======================================================

  if (
    Number(account.is_verified) !== 1 ||
    !Number.isSafeInteger(currentTokenVersion) ||
    currentTokenVersion < 0 ||
    currentTokenVersion !== tokenVersion ||
    account.role !== tokenRole
  ) {
    return unauthorized(res);
  }

  // ======================================================
  // 7. ATTACH AUTHENTICATED USER
  // ======================================================

  // Preserve the req.user structure consumed by existing
  // controllers, role middleware, and services.

  req.user = {
    userId: Number(account.user_id),
    role: account.role,
  };

  return next();
});

module.exports = authenticate;
