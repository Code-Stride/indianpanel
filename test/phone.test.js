"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getPhone, getPhoneFromMessages, normalizePhone } = require("../src/utils/phone");

test("normalizes all supported Indian phone formats", () => {
  assert.equal(normalizePhone("9876543210"), "919876543210");
  assert.equal(normalizePhone("09876543210"), "919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "919876543210");
  assert.equal(normalizePhone("923001234567"), "913001234567");
});

test("uses normalized device and nested raw client fields before SMS", () => {
  const messages = { sms1: { text: "Number 912222222222" } };

  assert.equal(
    getPhone({ phoneNumber: "9876543210" }, { simInfo: { number: "911111111111" } }, messages),
    "919876543210"
  );
  assert.equal(
    getPhone({ phoneNumber: "—" }, { simInfo: { number: "911111111111" } }, messages),
    "911111111111"
  );
});

test("extracts Indian numbers from a device's SMS text, body, or message field", () => {
  assert.equal(
    getPhoneFromMessages({ sms1: { text: "Your registered mobile is +91 9876543210." } }),
    "919876543210"
  );
  assert.equal(
    getPhoneFromMessages([{ body: "Account number: 09876543210" }]),
    "919876543210"
  );
  assert.equal(
    getPhoneFromMessages({ sms1: { message: "Phone 91-9876543210" } }),
    "919876543210"
  );
});

test("normalizes 92-prefixed numbers found in SMS without taking a partial match", () => {
  assert.equal(
    getPhoneFromMessages({ sms1: { text: "Registered number 923001234567" } }),
    "913001234567"
  );
});

test("keeps message fallback isolated to the current device", () => {
  const deviceAMessages = { sms1: { text: "Mobile 9876543210" } };
  const deviceBMessages = { sms1: { text: "Mobile 9123456780" } };

  assert.equal(getPhone(null, null, deviceAMessages), "919876543210");
  assert.equal(getPhone(null, null, deviceBMessages), "919123456780");
  assert.equal(getPhone(null, null, {}), "");
});
