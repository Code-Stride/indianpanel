"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const ConnectionsService = require("../src/services/connections");
const FirebaseService = require("../src/services/firebase");

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

test("v1 and v2 OTP routes return full phones extracted per device", async (t) => {
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
});
