"use strict";

require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { rateLimiter } = require("./src/middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./src/middleware/errorHandler");

const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Security & Compression ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts in served HTML
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── Static Frontend ──────────────────────────────────────────────────────────
// Serve the panel frontend from the public directory
app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

// ─── SPA Route Fallback ───────────────────────────────────────────────────────
// All non-API routes serve the frontend (the app handles client-side routing)
const frontendRoutes = [
  "/",
  "/dashboard",
  "/dashboard/*",
  "/settings",
  "/settings/*",
  "/accounts",
  "/accounts/*",
  "/get-accounts",
  "/get-accounts/*",
  "/profile",
  "/profile/*",
  "/about",
  "/about/*",
  "/support",
  "/support/*",
  "/privacy",
  "/privacy/*",
  "/terms",
  "/terms/*",
  "/copyright",
  "/copyright/*",
  "/changelog",
  "/changelog/*",
  "/status",
  "/status/*",
  "/docs",
  "/docs/*",
  "/login",
  "/register",
  "/connections",
  "/connections/*",
];

frontendRoutes.forEach((route) => {
  app.get(route, (req, res) => {
    // Try route-specific index first, fall back to root index
    const specificIndex = path.join(__dirname, "public", req.path, "index.html");
    res.sendFile(specificIndex, (err) => {
      if (err) {
        res.sendFile(path.join(__dirname, "public", "index.html"));
      }
    });
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  ⚡ CYRUS PANEL Server v2.0.0`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  📡 API:  http://localhost:${PORT}/api`);
    console.log(`  🏥 Health: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
