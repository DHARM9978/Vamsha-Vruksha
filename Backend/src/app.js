
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const db = require("./config/db");

const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");
const requestLogger = require("./middleware/requestLogger.middleware");

const logger = require("./utils/logger");

// Route imports
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const familyRoutes = require("./routes/family.routes");
const personRoutes = require("./routes/person.routes");
const relationRoutes = require("./routes/relation.routes");
const familyTreeRoutes = require("./routes/familyTree.routes");
const familyDetailsRoutes = require("./routes/familyDetails.routes");
const masterDataRoutes = require("./routes/masterData.routes");
const overviewRoutes = require("./routes/overview.routes");
const searchRoutes = require("./routes/search.routes");

const app = express();

// ==========================================
// 1. SECURITY HEADERS
// ==========================================

app.use(helmet());

// ==========================================
// 2. CORS CONFIGURATION
// ==========================================

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

// ==========================================
// 3. REQUEST BODY PARSING
// ==========================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 4. REQUEST LOGGING
// ==========================================

app.use(requestLogger);

// ==========================================
// 5. API RATE LIMITING
// ==========================================

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiRateLimiter);

// ==========================================
// 6. HEALTH CHECK
// ==========================================

app.get("/api/health", async (req, res, next) => {
  try {
    await db.query("SELECT 1");

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Vamsha Vruksha API is running",
      database: "Connected"
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 7. AUTHENTICATION ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// 8. ADMIN ROUTES
// ==========================================

app.use("/api/admin", adminRoutes);

// ==========================================
// 9. USER ROUTES
// ==========================================

app.use("/api/users", userRoutes);

// ==========================================
// 10. FAMILY ROUTES
// ==========================================

app.use("/api/families", familyRoutes);

// ==========================================
// 11. PERSON ROUTES
// ==========================================

app.use("/api", personRoutes);

// ==========================================
// 12. RELATIONSHIP ROUTES
// ==========================================

app.use("/api", relationRoutes);

// ==========================================
// 13. FAMILY TREE ROUTES
// ==========================================

app.use("/api", familyTreeRoutes);

// ==========================================
// 14. FAMILY DETAILS ROUTES
// ==========================================

app.use("/api", familyDetailsRoutes);

// ==========================================
// 15. MASTER DATA ROUTES
// ==========================================

app.use("/api/masters", masterDataRoutes);

// ==========================================
// 16. OVERVIEW ROUTES
// ==========================================

app.use("/api/overview", overviewRoutes);

// ==========================================
// 17. SEARCH ROUTES
// ==========================================

app.use("/api/search", searchRoutes);

// ==========================================
// 18. NOT FOUND HANDLER
// ==========================================

app.use(notFound);

// ==========================================
// 19. GLOBAL ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

logger.info("Express application initialized");

module.exports = app;
