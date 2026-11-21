
const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);

  logger.info("Incoming API request", {
    requestId,
    method: req.method,
    url: req.originalUrl
  });

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration
    };

    if (res.statusCode >= 500) {
      logger.error("API request failed", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("API request completed with client error", logData);
    } else {
      logger.info("API request completed successfully", logData);
    }
  });

  next();
};

module.exports = requestLogger;
