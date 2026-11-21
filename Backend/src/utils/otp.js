
const crypto = require("crypto");

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Generate an HMAC-SHA256 hash for an OTP.
 *
 * @param {string} otp - The 6-digit OTP
 * @param {string} email - User's email address
 * @param {string} purpose - OTP purpose (signup or forgot)
 * @returns {string} Hexadecimal hash
 */
const hashOtp = (otp, email, purpose) => {
  const secret = process.env.OTP_SECRET;

  if (!secret) {
    throw new Error("OTP_SECRET is not configured");
  }

  if (!otp || !email || !purpose) {
    throw new Error("OTP, email, and purpose are required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  return crypto
    .createHmac("sha256", secret)
    .update(`${normalizedEmail}:${purpose}:${otp}`)
    .digest("hex");
};

/**
 * Verify an OTP against its stored hash.
 *
 * @param {string} otp - User-entered OTP
 * @param {string} email - User's email address
 * @param {string} purpose - OTP purpose
 * @param {string} storedHash - Hash stored in MySQL
 * @returns {boolean} Whether the OTP matches
 */
const verifyOtpHash = (otp, email, purpose, storedHash) => {
  if (
    typeof storedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  const calculatedHash = hashOtp(otp, email, purpose);

  const storedBuffer = Buffer.from(storedHash, "hex");
  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  if (storedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, calculatedBuffer);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash
};
