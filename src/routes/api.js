"use strict";

/**
 * Main API routes.
 * All routes are mounted under /api.
 */

const { Router } = require("express");
const firebaseRoutes = require("./firebase");
const deviceRoutes = require("./devices");
const apkRoutes = require("./apk");
const telegramRoutes = require("./telegram");
const healthRoutes = require("./health");

const router = Router();

// Health check
router.use("/health", healthRoutes);

// Firebase proxy
router.use("/firebase", firebaseRoutes);

// Device management
router.use("/devices", deviceRoutes);

// APK parsing
router.use("/apk", apkRoutes);

// Telegram notifications
router.use("/telegram", telegramRoutes);

module.exports = router;
