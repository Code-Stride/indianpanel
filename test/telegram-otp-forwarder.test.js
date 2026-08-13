"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  entryKey,
  fetchOtps,
  formatOtpMessage,
  normalizePayload,
  startOtpForwarder,
} = require("../scripts/telegram-otp-forwarder");

const sampleOtp = {
  cli: "WhatsApp <Business>",
  num: "919876543210",
  message: "Your WhatsApp code is 123-456 & do not share it.",
  dt: "2026-08-14 10:30:00",
  payout: "0",
};

test("formats a safe Telegram HTML message with OTP details", () => {
  const message = formatOtpMessage(sampleOtp);

  assert.match(message, /<code>123456<\/code>/);
  assert.match(message, /WhatsApp &lt;Business&gt;/);
  assert.match(message, /<code>919876543210<\/code>/);
  assert.match(message, /Country:<\/b> India/);
  assert.match(message, /123-456 &amp; do not share/);
});

test("creates stable deduplication keys from record content", () => {
  assert.equal(entryKey(sampleOtp), entryKey({ ...sampleOtp }));
  assert.notEqual(entryKey(sampleOtp), entryKey({ ...sampleOtp, dt: "2026-08-14 10:31:00" }));
});

test("normalizes v1 and v2 OTP API payloads", () => {
  assert.deepEqual(normalizePayload({ status: "success", data: [sampleOtp] }), [sampleOtp]);
  assert.deepEqual(
    normalizePayload([["Google", "919999999999", "G-654321 is your code", "2026-08-14 11:00:00", " India"]]),
    [{
      cli: "Google",
      num: "919999999999",
      message: "G-654321 is your code",
      dt: "2026-08-14 11:00:00",
      payout: "0",
    }]
  );
  assert.throws(() => normalizePayload({ data: [] }), /unsupported response/);
});

test("fetches OTP records with count and optional API key", async () => {
  let request;
  const records = await fetchOtps({
    apiUrl: "https://panel.example/api/v2/otp",
    apiKey: "test-key",
    fetchCount: 25,
  }, async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ status: "success", data: [sampleOtp] }),
    };
  });

  assert.deepEqual(records, [sampleOtp]);
  assert.equal(new URL(request.url).searchParams.get("count"), "25");
  assert.equal(request.options.headers["X-API-Key"], "test-key");
});

test("skips records already present during the default first startup", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otp-forwarder-startup-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const stateFile = path.join(directory, "state.json");
  let stopChecks = 0;
  let sendCount = 0;

  await startOtpForwarder({
    apiUrl: "https://panel.example/api/v2/otp",
    stateFile,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ status: "success", data: [sampleOtp] }),
    }),
    sendMessage: async () => { sendCount += 1; },
    shouldStop: () => stopChecks++ > 0,
  });

  const saved = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(sendCount, 0);
  assert.equal(saved.initialized, true);
  assert.deepEqual(saved.seen, [entryKey(sampleOtp)]);
});

test("persists sent record keys and does not forward them after restart", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otp-forwarder-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const stateFile = path.join(directory, "state.json");
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ status: "success", data: [sampleOtp] }),
  });
  const messages = [];

  let stopFirstRun = false;
  await startOtpForwarder({
    apiUrl: "https://panel.example/api/v2/otp",
    stateFile,
    forwardExisting: true,
    fetchImpl,
    sendMessage: async (message) => {
      messages.push(message);
      stopFirstRun = true;
    },
    shouldStop: () => stopFirstRun,
  });

  let stopChecks = 0;
  await startOtpForwarder({
    apiUrl: "https://panel.example/api/v2/otp",
    stateFile,
    forwardExisting: true,
    fetchImpl,
    sendMessage: async (message) => messages.push(message),
    shouldStop: () => stopChecks++ > 0,
  });

  assert.equal(messages.length, 1);
  const saved = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(saved.initialized, true);
  assert.deepEqual(saved.seen, [entryKey(sampleOtp)]);
});
