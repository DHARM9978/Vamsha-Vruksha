const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const db = require("./config/db");

const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");
const requestLogger = require("./middleware/requestLogger.middleware");

const logger = require("./utils/logger");

// ======================================================
// ROUTE IMPORTS
// ======================================================

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const myFamilyRoutes = require("./routes/myFamily.routes");
const familyRoutes = require("./routes/family.routes");
const personRoutes = require("./routes/person.routes");
const relationRoutes = require("./routes/relation.routes");
const familyTreeRoutes = require("./routes/familyTree.routes");
const familyDetailsRoutes = require("./routes/familyDetails.routes");
const masterDataRoutes = require("./routes/masterData.routes");
const overviewRoutes = require("./routes/overview.routes");
const searchRoutes = require("./routes/search.routes");

const app = express();

// ======================================================
// 1. PROXY AND SECURITY CONFIGURATION
// ======================================================

// Render forwards requests through a reverse proxy.
// Trust the known proxy hop count, not arbitrary forwarded headers.
if (process.env.NODE_ENV === "production") {
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);

  if (
    !Number.isSafeInteger(proxyHops) ||
    proxyHops < 1 ||
    proxyHops > 10
  ) {
    throw new Error(
      "TRUST_PROXY_HOPS must be an integer between 1 and 10 in production"
    );
  }

  app.set("trust proxy", proxyHops);
} else {
  app.set("trust proxy", false);
}

app.disable("x-powered-by");
app.use(helmet());

// Request IDs and completion metrics are available to all routes.
app.use(requestLogger);

// ======================================================
// 2. CORS CONFIGURATION
// ======================================================

// CLIENT_URL is the canonical environment variable.
// FRONTEND_URL is retained temporarily as a compatibility fallback.
const clientOriginSetting =
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

if (!process.env.CLIENT_URL && process.env.FRONTEND_URL) {
  logger.warn("FRONTEND_URL is deprecated; use CLIENT_URL instead");
}

const allowedOrigins = clientOriginSetting
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    let parsed;

    try {
      parsed = new URL(value);
    } catch {
      throw new Error(
        "CLIENT_URL must contain valid HTTP(S) origins separated by commas"
      );
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        "Each CLIENT_URL entry must be an origin only, such as https://example.com"
      );
    }

    return parsed.origin;
  });

if (allowedOrigins.length === 0) {
  throw new Error("At least one CLIENT_URL origin must be configured");
}

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header include direct browser navigation,
      // curl, PowerShell and server-to-server health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);

// ======================================================
// 3. PUBLIC HEALTH CHECK
// GET /api/health
//
// This route is deliberately registered before all API routers.
// No authenticate middleware is applied to this endpoint.
// ======================================================

const healthCheck = async (req, res, next) => {
  try {
    await db.query("SELECT 1 AS database_connection");

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Vamsha Vruksha API is running",
      database: "Connected",
    });
  } catch (error) {
    return next(error);
  }
};

// Keep both paths public for direct checks and hosting-provider probes.
app.get("/api/health", healthCheck);
app.get("/health", healthCheck);

// ======================================================
// 4. API RATE LIMITING
// ======================================================

// Endpoint-specific limits are also configured in auth.routes.js
// and admin.routes.js. This is the additional global API limit.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiRateLimiter);

// ======================================================
// 5. REQUEST BODY PARSING
// ======================================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ======================================================
// 6. PUBLIC API ROOT
// GET /api
//
// /api is the API base prefix, not an authenticated resource.
// Return a small public service index before mounting routers whose
// router.use(authenticate) protects all requests entering those routers.
// ======================================================

app.get("/api", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    success: true,
    message: "Vamsha Vruksha API is running",
    endpoints: {
      health: "/api/health",
      authentication: "/api/auth",
      admin: "/api/admin",
      users: "/api/users",
      myFamily: "/api/my-family",
      families: "/api/families",
      overview: "/api/overview",
      search: "/api/search",
    },
  });
});

// ======================================================
// 7. API ROUTES
// ======================================================

// Public authentication endpoints are selectively rate-limited.
// Protected endpoints apply authenticate inside their route files.
app.use("/api/auth", authRoutes);

// Admin endpoints apply authenticate and Admin role authorization.
app.use("/api/admin", adminRoutes);

// User account endpoints.
app.use("/api/users", userRoutes);

// Authenticated User family dashboard.
app.use("/api/my-family", myFamilyRoutes);

// Family CRUD endpoints.
app.use("/api/families", familyRoutes);

// Person and relationship endpoints.
app.use("/api", personRoutes);
app.use("/api", relationRoutes);

// Bloodline tree and extended family details.
app.use("/api", familyTreeRoutes);
app.use("/api", familyDetailsRoutes);

// Master data, overview and search endpoints.
app.use("/api/masters", masterDataRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/search", searchRoutes);

// ======================================================
// 8. NOT FOUND AND ERROR HANDLERS
// ======================================================

app.use(notFound);
app.use(errorHandler);

// ======================================================
// 9. APPLICATION INITIALIZATION
// ======================================================

logger.info("Express application initialized", {
  environment: process.env.NODE_ENV || "development",
  corsOriginCount: allowedOrigins.length,
  publicHealthRoutes: ["/api/health", "/health"],
});

module.exports = app;