"use strict";

require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const fetch = require("node-fetch");
const OtpExtractor = require("../src/services/otpExtractor");
const TelegramService = require("../src/services/telegram");

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_FETCH_COUNT = 100;
const MAX_SEEN_ENTRIES = 5000;

function parsePositiveInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function resolveStateFile(value, dataDir) {
  if (value) return path.resolve(value);
  const baseDir = dataDir ? path.resolve(dataDir) : path.resolve(process.cwd(), "data");
  return path.join(baseDir, "telegram-otp-state.json");
}

function getConfig(env = process.env, overrides = {}) {
  const apiUrl = overrides.apiUrl || env.OTP_API_URL || "";
  if (!apiUrl) {
    throw new Error("OTP_API_URL is required (use the /api/v2/otp endpoint)");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    throw new Error("OTP_API_URL must be a valid http(s) URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("OTP_API_URL must use http or https");
  }

  return {
    apiUrl: parsedUrl.toString(),
    apiKey: overrides.apiKey ?? env.OTP_API_KEY ?? "",
    intervalMs: parsePositiveInteger(
      overrides.intervalMs ?? env.OTP_POLL_INTERVAL_MS,
      DEFAULT_INTERVAL_MS,
      1000,
      300000
    ),
    fetchCount: parsePositiveInteger(
      overrides.fetchCount ?? env.OTP_FETCH_COUNT,
      DEFAULT_FETCH_COUNT,
      1,
      500
    ),
    forwardExisting: parseBoolean(
      overrides.forwardExisting ?? env.OTP_FORWARD_EXISTING,
      false
    ),
    stateFile: resolveStateFile(
      overrides.stateFile || env.OTP_BOT_STATE_FILE,
      env.DATA_DIR
    ),
  };
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => Array.isArray(entry) && entry.length >= 4)
      .map((entry) => ({
        cli: entry[0],
        num: entry[1],
        message: entry[2],
        dt: entry[3],
        payout: "0",
      }));
  }

  if (payload && payload.status === "success" && Array.isArray(payload.data)) {
    return payload.data.filter((entry) => entry && typeof entry === "object");
  }

  throw new Error("OTP API returned an unsupported response; use /api/v2/otp or /api/otp");
}

async function fetchOtps(config, fetchImpl = fetch) {
  const url = new URL(config.apiUrl);
  if (!url.searchParams.has("count")) {
    url.searchParams.set("count", String(config.fetchCount));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = { Accept: "application/json" };
    if (config.apiKey) headers["X-API-Key"] = config.apiKey;

    const response = await fetchImpl(url.toString(), {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OTP API error ${response.status}: ${body.slice(0, 200)}`);
    }

    return normalizePayload(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

function entryKey(entry) {
  const stableValue = [
    entry.dt || "",
    entry.num || "",
    entry.cli || "",
    entry.message || "",
  ].join("\u001f");
  return crypto.createHash("sha256").update(stableValue).digest("hex");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractCode(rawMessage, extracted = OtpExtractor.extractOtp(rawMessage)) {
  if (extracted?.code) return extracted.code;

  // Handle common separators/phrasing not covered by the shared extractor,
  // for example: "your code is 123-456".
  const contextual = rawMessage.match(
    /(?:one[- ]?time password|otp|code|pin|passcode|password|token|verification)[^0-9]{0,32}([0-9][0-9 -]{2,12}[0-9])(?![0-9])/i
  );
  if (!contextual) return "Unknown";

  const digits = contextual[1].replace(/[^0-9]/g, "");
  return digits.length >= 4 && digits.length <= 8 ? digits : "Unknown";
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

function formatOtpMessage(entry) {
  const rawMessage = String(entry.message || "");
  const extracted = OtpExtractor.extractOtp(rawMessage);
  const code = extractCode(rawMessage, extracted);
  const service = truncate(
    entry.cli || extracted?.service || OtpExtractor.detectService(rawMessage) || "Unknown",
    100
  );
  const phone = truncate(entry.num || "Unknown", 40);
  const country = OtpExtractor.detectCountry(phone);
  const timestamp = truncate(entry.dt || new Date().toISOString(), 100);
  const preview = truncate(rawMessage, 1000);

  return [
    "🔐 <b>New OTP Received</b>",
    "",
    `🔢 <b>OTP:</b> <code>${escapeHtml(code)}</code>`,
    `🏷 <b>Service:</b> ${escapeHtml(service)}`,
    `📱 <b>Number:</b> <code>${escapeHtml(phone)}</code>`,
    `🌍 <b>Country:</b> ${escapeHtml(country)}`,
    `🕒 <b>Time:</b> ${escapeHtml(timestamp)}`,
    "",
    `💬 <b>Message:</b> ${escapeHtml(preview)}`,
  ].join("\n");
}

async function loadState(stateFile) {
  try {
    const parsed = JSON.parse(await fs.readFile(stateFile, "utf8"));
    return {
      initialized: Boolean(parsed.initialized),
      seen: new Set(Array.isArray(parsed.seen) ? parsed.seen.slice(-MAX_SEEN_ENTRIES) : []),
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[OTP Bot] Could not read state: ${error.message}`);
    }
    return { initialized: false, seen: new Set() };
  }
}

function remember(seen, key) {
  seen.add(key);
  while (seen.size > MAX_SEEN_ENTRIES) {
    seen.delete(seen.values().next().value);
  }
}

async function saveState(stateFile, state) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const temporaryFile = stateFile + ".tmp";
  const data = JSON.stringify({
    version: 1,
    initialized: state.initialized,
    seen: [...state.seen],
  });
  await fs.writeFile(temporaryFile, data, "utf8");
  await fs.rename(temporaryFile, stateFile);
}

function safeApiLabel(apiUrl) {
  const url = new URL(apiUrl);
  return url.origin + url.pathname;
}

async function startOtpForwarder(options = {}) {
  if (!options.sendMessage && !TelegramService.isConfigured) {
    throw new Error("TG_BOT_TOKEN and TG_CHAT_ID are required");
  }

  const config = getConfig(process.env, options);
  const state = await loadState(config.stateFile);
  const shouldStop = options.shouldStop || (() => false);
  const fetchImpl = options.fetchImpl || fetch;
  const sendMessage = options.sendMessage || ((message) => TelegramService.sendMessage(message));

  console.log(`[OTP Bot] Watching ${safeApiLabel(config.apiUrl)} every ${config.intervalMs}ms`);
  console.log(`[OTP Bot] State file: ${config.stateFile}`);

  while (!shouldStop()) {
    try {
      const entries = await fetchOtps(config, fetchImpl);

      if (!state.initialized && !config.forwardExisting) {
        for (const entry of entries) remember(state.seen, entryKey(entry));
        state.initialized = true;
        await saveState(config.stateFile, state);
        console.log(`[OTP Bot] Ready; skipped ${entries.length} existing OTP(s)`);
      } else {
        const stateNeedsInitialization = !state.initialized;
        state.initialized = true;
        let forwarded = 0;

        // APIs return newest first; forward unseen entries oldest first.
        for (const entry of [...entries].reverse()) {
          const key = entryKey(entry);
          if (state.seen.has(key)) continue;

          try {
            await sendMessage(formatOtpMessage(entry));
            remember(state.seen, key);
            forwarded += 1;
          } catch (error) {
            // Leave failed entries unseen so the next poll retries them.
            console.error(`[OTP Bot] Telegram send failed: ${error.message}`);
          }
        }

        if (forwarded || stateNeedsInitialization) {
          await saveState(config.stateFile, state);
        }
        if (forwarded) console.log(`[OTP Bot] Forwarded ${forwarded} new OTP(s)`);
      }
    } catch (error) {
      const message = error.name === "AbortError" ? "OTP API request timed out" : error.message;
      console.error(`[OTP Bot] Poll failed: ${message}`);
    }

    if (!shouldStop()) {
      await new Promise((resolve) => setTimeout(resolve, config.intervalMs));
    }
  }
}

if (require.main === module) {
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  startOtpForwarder({ shouldStop: () => stopping })
    .then(() => console.log("[OTP Bot] Stopped"))
    .catch((error) => {
      console.error(`[OTP Bot] Startup failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  entryKey,
  fetchOtps,
  formatOtpMessage,
  getConfig,
  normalizePayload,
  startOtpForwarder,
};
