const logger = require("../utils/logger");

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

const normalizeStatusCode = (error) => {
  const candidate = error?.statusCode ?? error?.status;

  if (
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 599
  ) {
    return candidate;
  }

  return 500;
};

const getSafeErrorCode = (error) => {
  const code = error?.code;

  // Keep only short machine-readable codes. Never log arbitrary code values.
  if (
    typeof code === "string" &&
    /^[A-Z0-9_]{1,64}$/.test(code)
  ) {
    return code;
  }

  return undefined;
};

const errorHandler = (err, req, res, next) => {
  // Once headers have been sent, Express must complete the response.
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = normalizeStatusCode(err);
  const requestId = req.requestId || null;

  // Error responses may contain account-specific information.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");

  const logData = {
    requestId,
    method: req.method,
    route: getSafeRouteLabel(req),
    statusCode,
    errorName:
      typeof err?.name === "string" &&
      /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(err.name)
        ? err.name
        : "Error",
    ...(getSafeErrorCode(err)
      ? { errorCode: getSafeErrorCode(err) }
      : {}),
  };

  // Do not log raw URLs, query strings, error.message, SQL statements,
  // request bodies, headers, stack traces, email addresses, OTPs or tokens.
  if (statusCode >= 500) {
    logger.error("Application error occurred", logData);
  } else if (statusCode >= 400) {
    logger.warn("Client request error", logData);
  }

  // Preserve safe application messages for client errors.
  // Hide all server-side error details from production clients.
  const message =
    statusCode >= 500
      ? "Internal server error"
      : (
          typeof err?.message === "string" &&
          err.message.trim()
            ? err.message
            : "Something went wrong"
        );

  return res.status(statusCode).json({
    success: false,
    message,
    requestId,
  });
};

module.exports = errorHandler;