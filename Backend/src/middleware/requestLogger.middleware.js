const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

// Use only the matched Express route template in completion logs.
// Never use the raw path, since it may contain user-supplied identifiers.
const getSafeRouteLabel = (req) => {
  const routePath = req.route?.path;

  if (typeof routePath !== "string" || !routePath) {
    return "<unmatched-route>";
  }

  const basePath =
    typeof req.baseUrl === "string"
      ? req.baseUrl
      : "";

  return `${basePath}${routePath}`;
};

const requestLogger = (req, res, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);

  // Log only the request ID and HTTP method at request arrival.
  // Do not log query parameters, request payloads, headers, IP addresses,
  // credentials, OTPs, tokens, email addresses, or other user data.
  logger.info("Incoming API request", {
    requestId,
    method: req.method,
  });

  let completed = false;

  const finalizeRequestLog = (responseFinished) => {
    if (completed) {
      return;
    }

    completed = true;

    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    const logData = {
      requestId,
      method: req.method,
      route: getSafeRouteLabel(req),
      statusCode,
      durationMs,
      responseFinished,
    };

    if (statusCode >= 500) {
      logger.error("API request failed", logData);
    } else if (statusCode >= 400 || !responseFinished) {
      logger.warn(
        responseFinished
          ? "API request completed with client error"
          : "API connection closed before response finished",
        logData
      );
    } else {
      logger.info("API request completed successfully", logData);
    }
  };

  res.once("finish", () => {
    finalizeRequestLog(true);
  });

  // Record client disconnects that do not emit "finish".
  // The completed guard prevents duplicate logs when "close" follows "finish".
  res.once("close", () => {
    if (!res.writableEnded) {
      finalizeRequestLog(false);
    }
  });

  return next();
};

module.exports = requestLogger;