
"use strict";

require("dotenv").config();

const app = require("./app");
const db = require("./config/db");
const logger = require("./utils/logger");

// ======================================================
// PORT CONFIGURATION
// ======================================================

const PORT =
  process.env.PORT === undefined
    ? 5000
    : Number(process.env.PORT);

// ======================================================
// SERVER STATE
// ======================================================

let server;
let isShuttingDown = false;

// ======================================================
// ENVIRONMENT VALIDATION
// ======================================================

const validateEnvironment = () => {
  const requiredVariables = [
    "JWT_SECRET",
    "OTP_SECRET",
    "DB_HOST",
    "DB_USER",
    "DB_NAME",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
  ];

  const missingVariables = requiredVariables.filter(
    (variable) =>
      typeof process.env[variable] !== "string" ||
      !process.env[variable].trim()
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
  }

  // ----------------------------------------------------
  // JWT SECRET STRENGTH
  // ----------------------------------------------------

  if (
    Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 bytes"
    );
  }

  // ----------------------------------------------------
  // OTP SECRET STRENGTH
  // ----------------------------------------------------

  if (
    Buffer.byteLength(process.env.OTP_SECRET, "utf8") < 32
  ) {
    throw new Error(
      "OTP_SECRET must contain at least 32 bytes"
    );
  }

  // ----------------------------------------------------
  // HTTP PORT
  // ----------------------------------------------------

  if (
    !Number.isInteger(PORT) ||
    PORT <= 0 ||
    PORT > 65535
  ) {
    throw new Error(
      "PORT must be an integer between 1 and 65535"
    );
  }

  // ----------------------------------------------------
  // DATABASE PORT
  // ----------------------------------------------------

  const databasePort =
    process.env.DB_PORT === undefined
      ? 3306
      : Number(process.env.DB_PORT);

  if (
    !Number.isInteger(databasePort) ||
    databasePort <= 0 ||
    databasePort > 65535
  ) {
    throw new Error(
      "DB_PORT must be an integer between 1 and 65535"
    );
  }

  // ----------------------------------------------------
  // SMTP PORT
  // ----------------------------------------------------

  const smtpPort = Number(process.env.SMTP_PORT);

  if (
    !Number.isInteger(smtpPort) ||
    smtpPort <= 0 ||
    smtpPort > 65535
  ) {
    throw new Error(
      "SMTP_PORT must be an integer between 1 and 65535"
    );
  }

  // ----------------------------------------------------
  // SMTP SECURE FLAG
  // ----------------------------------------------------

  if (
    process.env.SMTP_SECURE !== undefined &&
    !["true", "false"].includes(
      process.env.SMTP_SECURE.toLowerCase()
    )
  ) {
    throw new Error(
      'SMTP_SECURE must be either "true" or "false"'
    );
  }

  // ----------------------------------------------------
  // OTP EXPIRY
  // ----------------------------------------------------

  const otpExpiryMinutes =
    process.env.OTP_EXPIRY_MINUTES === undefined
      ? 5
      : Number(process.env.OTP_EXPIRY_MINUTES);

  if (
    !Number.isInteger(otpExpiryMinutes) ||
    otpExpiryMinutes <= 0
  ) {
    throw new Error(
      "OTP_EXPIRY_MINUTES must be a positive integer"
    );
  }

  logger.info("Environment configuration validated");
};

// ======================================================
// DATABASE CONNECTION CHECK
// ======================================================

const checkDatabaseConnection = async () => {
  const connection = await db.getConnection();

  try {
    await connection.query("SELECT 1");

    logger.info(
      "MySQL database connection established"
    );
  } finally {
    connection.release();
  }
};

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info(
    `${signal} received. Starting graceful shutdown`
  );

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10000);

  forceShutdownTimer.unref();

  try {
    // Stop accepting new HTTP requests.
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      logger.info(
        "HTTP server closed successfully"
      );
    }

    // Close all MySQL pool connections.
    await db.end();

    logger.info(
      "MySQL connection pool closed"
    );

    clearTimeout(forceShutdownTimer);

    process.exit(0);
  } catch (error) {
    logger.error(
      "Error during graceful shutdown",
      {
        errorName: error.name,
        message: error.message,
      }
    );

    clearTimeout(forceShutdownTimer);

    process.exit(1);
  }
};

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  try {
    // Validate configuration before accepting requests.
    validateEnvironment();

    // Verify MySQL before accepting requests.
    await checkDatabaseConnection();

    server = app.listen(PORT);

    // Handle server startup errors.
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    logger.info(
      "Vamsha Vruksha backend server started",
      {
        port: PORT,
        environment:
          process.env.NODE_ENV || "development",
      }
    );

    process.once("SIGINT", () => {
      shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
      shutdown("SIGTERM");
    });
  } catch (error) {
    logger.error(
      "Backend startup failed",
      {
        errorName: error.name,
        message: error.message,
      }
    );

    try {
      await db.end();
    } catch (databaseError) {
      logger.error(
        "Failed to close database pool",
        {
          message: databaseError.message,
        }
      );
    }

    process.exit(1);
  }
};

startServer();
