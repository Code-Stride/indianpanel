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
const AuthService = require("./src/services/auth");

const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Trust reverse proxies (needed for Render, Railway, Fly, nginx, etc.)
app.set("trust proxy", 1);

// ─── Security & Compression ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
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

// ─── Rate Limiting (only on auth/admin, not OTP) ─────────────────────────────
app.use("/api/auth", rateLimiter);
app.use("/api/admin", rateLimiter);
app.use("/api/profile", rateLimiter);
// OTP, Firebase, Devices, Dashboard — no rate limit (bot-friendly)

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── Static Frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

// ─── SPA Route Fallback ───────────────────────────────────────────────────────
const frontendRoutes = [
  "/",
  "/dashboard", "/dashboard/*",
  "/settings", "/settings/*",
  "/accounts", "/accounts/*",
  "/get-accounts", "/get-accounts/*",
  "/profile", "/profile/*",
  "/about", "/about/*",
  "/support", "/support/*",
  "/privacy", "/privacy/*",
  "/terms", "/terms/*",
  "/copyright", "/copyright/*",
  "/changelog", "/changelog/*",
  "/status", "/status/*",
  "/docs", "/docs/*",
  "/login",
  "/register",
  "/admin", "/admin/*",
  "/connections", "/connections/*",
];

frontendRoutes.forEach((route) => {
  app.get(route, (req, res) => {
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
async function start() {
  // Bootstrap admin from .env if configured
  await AuthService.bootstrapAdmin();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  ⚡ CYRUS PANEL Server v2.0.0`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  📡 API:   http://localhost:${PORT}/api`);
    console.log(`  🔐 Admin: http://localhost:${PORT}/admin/`);
    console.log(`  🏥 Health: http://localhost:${PORT}/api/health\n`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app;

// Graceful shutdown
process.on("SIGTERM", () => { console.log("SIGTERM received, shutting down..."); process.exit(0); });
process.on("SIGINT", () => { console.log("SIGINT received, shutting down..."); process.exit(0); });
