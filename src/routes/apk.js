"use strict";

/**
 * APK parsing routes.
 * Upload and analyze Android APK files for Firebase credentials.
 */

const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const ApkParserService = require("../services/apkParser");
const TelegramService = require("../services/telegram");
const config = require("../config");

const router = Router();

// Configure multer for APK uploads (in-memory for parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxSizeMB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".apk") {
      return cb(new Error("Only .apk files are supported"), false);
    }
    cb(null, true);
  },
});

/**
 * POST /api/apk/parse
 * Upload and parse an APK file for Firebase credentials.
 *
 * Multipart form: file (the .apk)
 */
router.post("/parse", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Send an .apk file." });
    }

    console.log(`[APK] Parsing: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(1)} MB)`);

    const result = await ApkParserService.parse(req.file.buffer, req.file.originalname);

    if (!result) {
      return res.json({
        success: true,
        found: false,
        message: "No Firebase credentials found in this APK.",
      });
    }

    // Send to Telegram if configured
    if (TelegramService.isConfigured) {
      try {
        await TelegramService.sendApkResult(req.file.originalname, result);
      } catch (tgErr) {
        console.error("[Telegram] Failed to send APK result:", tgErr.message);
      }
    }

    res.json({
      success: true,
      found: true,
      filename: req.file.originalname,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
