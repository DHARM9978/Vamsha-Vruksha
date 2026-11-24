const jwt = require("jsonwebtoken");
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const unauthorized = (res, message = "Invalid or expired authentication token") => {
  return res.status(401).json({
    success: false,
    message,
  });
};

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (typeof authorization !== "string") {
    return unauthorized(res, "Authentication token is required");
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return unauthorized(res, "Authentication token is missing");
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured");
    error.statusCode = 500;
    throw error;
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
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

  // Require all claims issued by the updated login service.
  // Tokens issued before token_version deployment are intentionally rejected.
  const userId = Number(decoded?.userId);
  const tokenVersion = decoded?.tokenVersion;
  const tokenRole = decoded?.role;

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 0 ||
    !["Admin", "User"].includes(tokenRole)
  ) {
    return unauthorized(res);
  }

  // Read current authorization state from the database rather than trusting
  // a potentially stale role or session version embedded in the JWT.
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
  const currentTokenVersion = Number(account.token_version);

  if (
    Number(account.is_verified) !== 1 ||
    !Number.isSafeInteger(currentTokenVersion) ||
    currentTokenVersion < 0 ||
    currentTokenVersion !== tokenVersion ||
    account.role !== tokenRole
  ) {
    return unauthorized(res);
  }

  // Preserve the req.user shape consumed by existing controllers,
  // role middleware, and services.
  req.user = {
    userId: Number(account.user_id),
    role: account.role,
  };

  return next();
});

module.exports = authenticate;