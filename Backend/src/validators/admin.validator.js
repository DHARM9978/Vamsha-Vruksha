
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 150;
const MAX_PASSWORD_LENGTH = 128;

// ======================================================
// COMMON VALIDATION HELPERS
// ======================================================

// Check whether the request body is an object.
const isObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

// Validate request body.
const validateBody = (req, res) => {
  if (!isObject(req.body)) {
    res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object",
    });

    return false;
  }

  return true;
};

// Validate email address.
const validateEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.trim();

  return (
    normalizedEmail.length > 0 &&
    normalizedEmail.length <= MAX_EMAIL_LENGTH &&
    emailRegex.test(normalizedEmail)
  );
};

// Validate current password.
// Do not trim passwords because whitespace may be meaningful.
const validateCurrentPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length > 0 &&
    password.length <= MAX_PASSWORD_LENGTH
  );
};

// Validate six-digit OTP.
const validateOtp = (otp) => {
  return (
    typeof otp === "string" &&
    /^\d{6}$/.test(otp.trim())
  );
};

// Send validation error.
const reject = (res, message) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

// ======================================================
// 1. REQUEST ADMIN EMAIL CHANGE
// POST /api/admin/email-change/request
//
// Body:
// {
//   "newEmail": "new@example.com",
//   "currentPassword": "CurrentPassword123"
// }
// ======================================================

const validateRequestEmailChange = (
  req,
  res,
  next
) => {
  if (!validateBody(req, res)) {
    return;
  }

  const {
    newEmail,
    currentPassword,
  } = req.body;

  if (!validateEmail(newEmail)) {
    return reject(
      res,
      "Please provide a valid new email address (maximum 150 characters)"
    );
  }

  if (!validateCurrentPassword(currentPassword)) {
    return reject(
      res,
      "Current password is required and must not exceed 128 characters"
    );
  }

  next();
};

// ======================================================
// 2. RESEND ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/resend
//
// No request body required.
// Pending request is identified using authenticated userId.
// ======================================================

const validateResendEmailChangeOtp = (
  req,
  res,
  next
) => {
  // No body is required for this endpoint.
  if (
    req.body === undefined ||
    req.body === null
  ) {
    return next();
  }

  if (!isObject(req.body)) {
    return reject(
      res,
      "Request body must be a valid JSON object"
    );
  }

  if (Object.keys(req.body).length > 0) {
    return reject(
      res,
      "No request body is required to resend the verification code"
    );
  }

  next();
};

// ======================================================
// 3. VERIFY ADMIN EMAIL CHANGE OTP
// POST /api/admin/email-change/verify
//
// Body:
// {
//   "otp": "123456"
// }
// ======================================================

const validateVerifyEmailChangeOtp = (
  req,
  res,
  next
) => {
  if (!validateBody(req, res)) {
    return;
  }

  const { otp } = req.body;

  if (!validateOtp(otp)) {
    return reject(
      res,
      "OTP must be a six-digit number"
    );
  }

  next();
};

// ======================================================
// EXPORT VALIDATORS
// ======================================================

module.exports = {
  validateRequestEmailChange,
  validateResendEmailChangeOtp,
  validateVerifyEmailChangeOtp,
};
