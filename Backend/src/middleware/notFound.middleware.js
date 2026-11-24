const logger = require("../utils/logger");

const notFound = (req, res) => {
  const requestId = req.requestId || null;

  // Log only safe operational metadata. Never log originalUrl, query
  // parameters, request bodies, headers, or user-supplied path segments.
  logger.warn("API route not found", {
    requestId,
    method: req.method,
  });

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");

  return res.status(404).json({
    success: false,
    message: "Route not found",
    requestId,
  });
};

module.exports = notFound;