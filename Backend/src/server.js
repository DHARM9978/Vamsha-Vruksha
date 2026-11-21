
require("dotenv").config();

const app = require("./app");
const db = require("./config/db");
const logger = require("./utils/logger");

const PORT = Number(process.env.PORT) || 5000;

let server;
let isShuttingDown = false;

// ======================================================
// VALIDATE ENVIRONMENT
// ======================================================

const validateEnvironment = () => {
  const requiredVariables = [
    "JWT_SECRET",
    "OTP_SECRET",
    "DB_HOST",
    "DB_USER",
    "DB_NAME",
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
  }

  if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
    throw new Error("PORT must be a valid port number");
  }
};

// ======================================================
// CHECK DATABASE CONNECTION
// ======================================================

const checkDatabaseConnection = async () => {
  const connection = await db.getConnection();

  try {
    await connection.query("SELECT 1");
    logger.info("MySQL database connection established");
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

  logger.info(`${signal} received. Starting graceful shutdown`);

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

      logger.info("HTTP server closed successfully");
    }

    // Close all MySQL pool connections.
    await db.end();

    logger.info("MySQL connection pool closed");

    clearTimeout(forceShutdownTimer);

    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      errorName: error.name,
      message: error.message,
    });

    clearTimeout(forceShutdownTimer);

    process.exit(1);
  }
};

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  try {
    validateEnvironment();

    // Verify MySQL before accepting requests.
    await checkDatabaseConnection();

    server = app.listen(PORT);

    // Handle server startup errors.
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    logger.info("Vamsha Vruksha backend server started", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    });

    process.once("SIGINT", () => {
      shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
      shutdown("SIGTERM");
    });
  } catch (error) {
    logger.error("Backend startup failed", {
      errorName: error.name,
      message: error.message,
      stack: error.stack,
    });

    try {
      await db.end();
    } catch (databaseError) {
      logger.error("Failed to close database pool", {
        message: databaseError.message,
      });
    }

    process.exit(1);
  }
};

startServer();
