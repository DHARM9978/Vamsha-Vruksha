const validatePersonPayload = (req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a JSON object",
    });
  }

  if (
    typeof req.body.firstName !== "string" ||
    !req.body.firstName.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "firstName is required and must be a non-empty string",
    });
  }

  next();
};

module.exports = {
  validatePersonPayload,
};