
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // If response has already started, pass error to Express
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;

  // Validate HTTP status code
  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    statusCode = 500;
  }

  // Log application error
  logger.error("Application error occurred", {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack
  });

  // Send safe error response
  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message || "Something went wrong",
    requestId: req.requestId
  });
};

module.exports = errorHandler;
