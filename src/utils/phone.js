"use strict";

/**
 * Shared phone number extraction and normalization.
 * All numbers are treated as Indian by default.
 */

const PHONE_FIELD_PATHS = [
  "phoneNumber", "phone", "number", "mobileNumber", "mobile",
  "phoneNo", "contactNumber", "simNumber", "sim",
  "registeredNumber", "devicePhone", "myNumber",
  "simPhoneNumber", "line1Number", "msisdn",
  "phone_number", "mobile_number", "cellNumber",
];

function getNestedValue(obj, path) {
  if (!obj) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Normalize a phone number to international format.
 * 10 digits → 91XXXXXXXXXX (Indian)
 * 11 digits starting with 0 → strip 0, prepend 91
 * 12+ digits → use as-is (already has country code)
 */
function normalizePhone(raw) {
  if (!raw) return "";
  let digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
}

/**
 * Extract phone from device data, raw Firebase client data, or messages.
 */
function getPhone(device, rawClient, messages) {
  // 1. Check device normalized fields
  if (device) {
    for (const path of PHONE_FIELD_PATHS) {
      const val = getNestedValue(device, path);
      const normalized = normalizePhone(val);
      if (normalized) return normalized;
    }
  }

  // 2. Check raw Firebase client data
  if (rawClient && typeof rawClient === "object") {
    for (const path of PHONE_FIELD_PATHS) {
      const val = getNestedValue(rawClient, path);
      const normalized = normalizePhone(val);
      if (normalized) return normalized;
    }
  }

  // 3. Do NOT extract from messages (causes same-number-for-all bug)
  return "";
}

module.exports = { getPhone, normalizePhone };
