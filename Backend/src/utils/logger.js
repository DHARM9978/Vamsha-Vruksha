
const winston = require("winston");
const fs = require("fs");
const path = require("path");

const logDirectory = path.join(__dirname, "../../logs");

// Create logs directory automatically
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const isProduction = process.env.NODE_ENV === "production";

const logLevel =
  process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

// Console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss"
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length
      ? JSON.stringify(meta)
      : "";

    return `${timestamp} [${level}]: ${message} ${extra}`;
  })
);

// File format
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: logLevel,

  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat
    }),

    // Application log: info, warnings and errors
    new winston.transports.File({
      filename: path.join(logDirectory, "application.log"),
      level: "info",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    }),

    // Error-only log
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    }),

    // Detailed debug log
    new winston.transports.File({
      filename: path.join(logDirectory, "debug.log"),
      level: "debug",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ],

  exitOnError: false
});

module.exports = logger;
