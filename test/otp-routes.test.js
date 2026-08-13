"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const ConnectionsService = require("../src/services/connections");
const FirebaseService = require("../src/services/firebase");
const AuthService = require("../src/services/auth");
const OtpExtractor = require("../src/services/otpExtractor");

const clients = {
  "device-a": { name: "Device A" },
  "device-b": { name: "Device B" },
};

const messages = {
  "device-a": {
    sms1: {
      text: "Your WhatsApp OTP is 123456. Registered mobile +91 9876543210.",
      timestamp: "2026-08-13T13:00:00.000Z",
    },
  },
  "device-b": {
    sms1: {
      body: "Your Telegram OTP is 654321. Registered mobile 923001234567.",
      timestamp: "2026-08-13T12:00:00.000Z",
    },
  },
};

test("OTP and dashboard routes return phones extracted per device", async (t) => {
  const originalGetAllActive = ConnectionsService.getAllActive;
  const originalRead = FirebaseService.read;

  ConnectionsService.getAllActive = async () => [
    { name: "Test Firebase", url: "https://example.firebaseio.com", key: "secret" },
  ];
  FirebaseService.read = async (_url, _key, path) => {
    if (path === "clients") return clients;
    if (path === "messages") return messages;
    return null;
  };

  const app = express();
  app.use("/api/otp", require("../src/routes/otp"));
  app.use("/api/v2", require("../src/routes/otp-v2"));
  app.use("/api/dashboard", require("../src/routes/dashboard"));
  app.use("/api/live", require("../src/routes/otp-live"));

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => resolve(listeningServer));
  });

  t.after(() => {
    ConnectionsService.getAllActive = originalGetAllActive;
    FirebaseService.read = originalRead;
    server.close();
  });

  const { port } = server.address();

  const v1Response = await fetch(`http://127.0.0.1:${port}/api/otp?count=all`);
  assert.equal(v1Response.status, 200);
  const v1 = await v1Response.json();
  assert.deepEqual(v1.map((entry) => entry[1]), ["919876543210", "913001234567"]);
  assert.ok(v1.every((entry) => !entry[1].includes("CYRUS")));

  const v2Response = await fetch(`http://127.0.0.1:${port}/api/v2/otp?count=all`);
  assert.equal(v2Response.status, 200);
  const v2Text = await v2Response.text();
  assert.match(v2Text, /\n    "status": "success"/);

  const v2 = JSON.parse(v2Text);
  assert.equal(v2.total, 2);
  assert.deepEqual(v2.data.map((entry) => entry.num), ["919876543210", "913001234567"]);
  assert.ok(v2.data.every((entry) => !entry.num.includes("CYRUS")));

  const token = AuthService.generateToken({ id: "test-user", username: "tester", role: "user" });
  const dashboardResponse = await fetch(`http://127.0.0.1:${port}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.deepEqual(
    dashboard.devices.list.map((device) => device.phoneNumber),
    ["919876543210", "913001234567"]
  );
  assert.deepEqual(
    dashboard.otps.recent.map((otp) => otp.phone),
    ["919876543210", "913001234567"]
  );
  assert.deepEqual(
    dashboard.otps.recent.map((otp) => OtpExtractor.maskPhone(otp.phone)),
    ["91CYRUS43210", "91CYRUS34567"]
  );

  const liveResponse = await fetch(`http://127.0.0.1:${port}/api/live/otp`);
  assert.equal(liveResponse.status, 200);
  const reader = liveResponse.body.getReader();
  const decoder = new TextDecoder();
  let liveText = "";
  while (!liveText.includes("data: ")) {
    const { done, value } = await reader.read();
    if (done) break;
    liveText += decoder.decode(value, { stream: true });
  }
  await reader.cancel();

  const dataLine = liveText.split("\n").find((line) => line.startsWith("data: "));
  assert.ok(dataLine);
  const live = JSON.parse(dataLine.slice(6));
  assert.deepEqual(
    live.recent.map((otp) => otp.phone),
    ["919876543210", "913001234567"]
  );
});
