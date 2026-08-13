"use strict";

const { Router } = require("express");

const router = Router();

/**
 * GET /api/health
 * Health check endpoint.
 */
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "CYRUS PANEL API",
    version: "2.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: process.version,
  });
});

module.exports = router;
