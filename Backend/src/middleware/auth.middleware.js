
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      const error = new Error("Authentication token is required");
      error.statusCode = 401;
      throw error;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      const error = new Error("Authentication token is missing");
      error.statusCode = 401;
      throw error;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || !decoded.role) {
      const error = new Error("Invalid authentication token");
      error.statusCode = 401;
      throw error;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token"
      });
    }

    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

module.exports = authenticate;
