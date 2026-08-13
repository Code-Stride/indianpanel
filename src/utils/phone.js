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
 * 12 digits starting with 92 → replace 92 with 91
 * Other 11-15 digit values → use as-is
 */
function normalizePhone(raw) {
  if (!raw) return "";
  let digits = String(raw).replace(/[^0-9]/g, "");

  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("92")) return "91" + digits.slice(2);
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
}

/**
 * Find a phone in known fields on an object and its immediate nested objects.
 */
function getPhoneFromFields(data) {
  if (!data || typeof data !== "object") return "";

  for (const path of PHONE_FIELD_PATHS) {
    const normalized = normalizePhone(getNestedValue(data, path));
    if (normalized) return normalized;
  }

  for (const value of Object.values(data)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const path of PHONE_FIELD_PATHS) {
      const normalized = normalizePhone(getNestedValue(value, path));
      if (normalized) return normalized;
    }
  }

  return "";
}

/**
 * Extract a phone from one device's own SMS messages.
 *
 * The digit boundaries prevent a 12-digit 92-prefixed number from being
 * mistaken for a partial 10-digit Indian number before it can be normalized.
 */
function getPhoneFromMessages(messages) {
  if (!messages || typeof messages !== "object") return "";

  const indianPattern = /(?:^|[^\d])(?:\+91|91)?[\s-]?([6-9]\d{9})(?!\d)/;
  const internationalPattern = /(?:^|[^\d])\+?(\d{10,15})(?!\d)/;

  for (const message of Object.values(messages)) {
    const texts = typeof message === "string"
      ? [message]
      : [message?.text, message?.body, message?.message];

    for (const text of texts) {
      if (typeof text !== "string" || !text) continue;

      const indianMatch = text.match(indianPattern);
      if (indianMatch) {
        const normalized = normalizePhone(indianMatch[1]);
        if (normalized) return normalized;
      }

      const internationalMatch = text.match(internationalPattern);
      if (internationalMatch) {
        const normalized = normalizePhone(internationalMatch[1]);
        if (normalized) return normalized;
      }
    }
  }

  return "";
}

/**
 * Extract phone in priority order: normalized device, raw client data, then
 * only the messages belonging to that same device.
 */
function getPhone(device, rawClient, deviceMessages) {
  const devicePhone = getPhoneFromFields(device);
  if (devicePhone) return devicePhone;

  const rawPhone = getPhoneFromFields(rawClient);
  if (rawPhone) return rawPhone;

  return getPhoneFromMessages(deviceMessages);
}

module.exports = { getPhone, getPhoneFromMessages, normalizePhone };
