
const nodemailer = require("nodemailer");
const logger = require("./logger");

// ======================================================
// SMTP CONFIGURATION
// ======================================================

const getSmtpConfig = () => {
  const requiredVariables = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing SMTP configuration: ${missingVariables.join(", ")}`
    );
  }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",

    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim().replace(/\s+/g, ""),
    },
  };
};

// ======================================================
// CREATE EMAIL TRANSPORTER
// ======================================================

const createTransporter = () => {
  const config = getSmtpConfig();

  return nodemailer.createTransport(config);
};

// ======================================================
// VERIFY SMTP CONNECTION
// ======================================================

const verifyEmailConnection = async () => {
  const transporter = createTransporter();

  try {
    await transporter.verify();

    logger.info(
      "SMTP connection and authentication successful",
      {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
      }
    );

    return true;
  } catch (error) {
    logger.error(
      "SMTP connection or authentication failed",
      {
        errorName: error.name,
        errorCode: error.code,
        responseCode: error.responseCode,
      }
    );

    throw error;
  } finally {
    transporter.close();
  }
};

// ======================================================
// OTP EMAIL TEMPLATE CONFIGURATION
// ======================================================

const getOtpEmailTemplate = (purpose, expiryMinutes) => {
  const templates = {
    signup: {
      subject: "Vamsha Vruksha - Verify Your Email",

      heading: "Verify Your Email Address",

      description:
        "Use the following verification code to complete your registration.",

      warning:
        "If you did not request this code, please ignore this email.",
    },

    forgot: {
      subject: "Vamsha Vruksha - Password Reset OTP",

      heading: "Password Reset Verification",

      description:
        "Use the following verification code to reset your password.",

      warning:
        "If you did not request a password reset, please ignore this email.",
    },

    admin_email_change: {
      subject: "Vamsha Vruksha - Admin Email Change Verification",

      heading: "Verify Your New Admin Email Address",

      description:
        "You requested to change the email address associated with your Vamsha Vruksha Admin account. Enter the following code to verify your new email address.",

      warning:
        "Your existing Admin email address will remain unchanged until this code is successfully verified. If you did not request this change, please ignore this email.",
    },
  };

  const template = templates[purpose];

  if (!template) {
    throw new Error(
      `Unsupported OTP email purpose: ${purpose}`
    );
  }

  return {
    ...template,
    expiryMinutes,
  };
};

// ======================================================
// SEND OTP EMAIL
// Supports:
// 1. signup
// 2. forgot
// 3. admin_email_change
// ======================================================

const sendOtpEmail = async ({
  email,
  otp,
  purpose,
}) => {
  if (!email || !otp || !purpose) {
    throw new Error(
      "Email, OTP and purpose are required"
    );
  }

  if (
    !/^\d{6}$/.test(String(otp))
  ) {
    throw new Error(
      "OTP must contain exactly 6 digits"
    );
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error("Invalid recipient email address");
  }

  const expiryMinutes = Number(
    process.env.OTP_EXPIRY_MINUTES || 5
  );

  if (
    !Number.isInteger(expiryMinutes) ||
    expiryMinutes <= 0
  ) {
    throw new Error(
      "OTP_EXPIRY_MINUTES must be a positive integer"
    );
  }

  const template = getOtpEmailTemplate(
    purpose,
    expiryMinutes
  );

  const transporter = createTransporter();

  const mailOptions = {
    from: {
      name: "Vamsha Vruksha",
      address:
        process.env.SMTP_FROM || process.env.SMTP_USER,
    },

    to: normalizedEmail,

    subject: template.subject,

    text: `
${template.heading}

${template.description}

Your Vamsha Vruksha verification code is:

${otp}

This code expires in ${expiryMinutes} minutes.

${template.warning}

Vamsha Vruksha
    `,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 520px;
        margin: auto;
        padding: 24px;
        color: #263238;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      ">

        <h2 style="
          color: #176b60;
          margin-bottom: 20px;
        ">
          ${template.heading}
        </h2>

        <p>
          ${template.description}
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          margin: 20px 0;
          background: #f0f7f5;
          color: #176b60;
          border-radius: 8px;
        ">
          ${otp}
        </div>

        <p>
          This code expires in
          <strong>${expiryMinutes} minutes</strong>.
        </p>

        <p style="
          font-size: 13px;
          color: #64748b;
          margin-top: 24px;
        ">
          ${template.warning}
        </p>

        <hr style="
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 24px 0;
        ">

        <p style="
          font-size: 13px;
          color: #64748b;
        ">
          Vamsha Vruksha
        </p>

      </div>
    `,
  };

  try {
    const result = await transporter.sendMail(
      mailOptions
    );

    logger.info(
      "OTP email sent successfully",
      {
        purpose,
        messageId: result.messageId,
      }
    );

    return result;

  } catch (error) {
    logger.error(
      "OTP email delivery failed",
      {
        purpose,
        errorName: error.name,
        errorCode: error.code,
        responseCode: error.responseCode,
      }
    );

    throw error;

  } finally {
    transporter.close();
  }
};

// ======================================================
// EXPORT EMAIL FUNCTIONS
// ======================================================

module.exports = {
  sendOtpEmail,
  verifyEmailConnection,
};
