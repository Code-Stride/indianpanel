"use strict";

/**
 * Telegram notification routes.
 * Trigger notifications from the client.
 */

const { Router } = require("express");
const TelegramService = require("../services/telegram");
const { requireFields } = require("../middleware/validate");

const router = Router();

/**
 * POST /api/telegram/notify
 * Send a custom notification.
 *
 * Body: { message }
 */
router.post("/notify", requireFields("message"), async (req, res, next) => {
  try {
    if (!TelegramService.isConfigured) {
      return res.json({ success: false, skipped: true, message: "Telegram not configured" });
    }

    await TelegramService.sendMessage(req.body.message);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/telegram/credential-alert
 * Send a credential login alert.
 *
 * Body: { url, key }
 */
router.post("/credential-alert", requireFields("url", "key"), async (req, res, next) => {
  try {
    if (!TelegramService.isConfigured) {
      return res.json({ success: false, skipped: true, message: "Telegram not configured" });
    }

    await TelegramService.sendCredentialAlert(req.body.url, req.body.key);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
