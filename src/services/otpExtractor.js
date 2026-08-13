"use strict";

/**
 * OTP Extractor service.
 * Extracts OTP codes, verification codes, and authentication codes
 * from SMS message text. Supports multiple formats and languages.
 */

// Patterns that match OTP/verification codes in SMS messages
const OTP_PATTERNS = [
  // "code is 123456" / "code: 123456" / "code 123456"
  /(?:code|otp|pin|password|passcode|verify|verification|konfirmasi|kode|код|कोड)\s*(?:is|:|\s)\s*(\d{4,8})/gi,
  // "123456 is your" / "123-456 is your"
  /(\d{3,4}[-\s]?\d{3,4})\s+(?:is your|est votre|es tu|es Ihr|è il tuo)/gi,
  // "your code 123456" / "your OTP 123456"
  /your\s+(?:code|otp|pin|verification|passcode)\s+(\d{4,8})/gi,
  // "WhatsApp code 123-456"
  /(?:WhatsApp|whatsapp)\s+(?:code|Business code)\s+(\d{3,4}[-\s]?\d{3,4})/gi,
  // "Google code: 123456"
  /(?:Google|google|G-)\s*(?:code|:)?\s*(\d{4,8})/gi,
  // "Telegram code: 12345"
  /(?:Telegram|telegram)\s+(?:code|:)?\s*(\d{4,8})/gi,
  // Generic 4-8 digit codes near keywords
  /(?:code|otp|pin|verify|token|код|कोड)\s*[:\s]*[<b>]*(\d{4,8})[<\/b>]*/gi,
  // Standalone 6-digit codes (common OTP format)
  /\b(\d{6})\b/g,
  // 4-digit codes
  /\b(\d{4})\b/g,
];

// Service name detection patterns
const SERVICE_PATTERNS = [
  { name: "WhatsApp", pattern: /whatsapp|whatsApp|WhatsApp/i },
  { name: "Google", pattern: /\bgoogle\b|G-\d+/i },
  { name: "Telegram", pattern: /\btelegram\b/i },
  { name: "Facebook", pattern: /\bfacebook\b|\bfb\b/i },
  { name: "Instagram", pattern: /\binstagram\b/i },
  { name: "Twitter", pattern: /\btwitter\b|\bx\.com\b/i },
  { name: "Amazon", pattern: /\bamazon\b/i },
  { name: "PayPal", pattern: /\bpaypal\b/i },
  { name: "Microsoft", pattern: /\bmicrosoft\b|\boutlook\b|\bhotmail\b/i },
  { name: "Apple", pattern: /\bapple\b|\bicloud\b/i },
  { name: "TikTok", pattern: /\btiktok\b/i },
  { name: "Snapchat", pattern: /\bsnapchat\b/i },
  { name: "LinkedIn", pattern: /\blinkedin\b/i },
  { name: "Uber", pattern: /\buber\b/i },
  { name: "Grab", pattern: /\bgrab\b/i },
  { name: "Gojek", pattern: /\bgojek\b/i },
  { name: "Shopee", pattern: /\bshopee\b/i },
  { name: "Lazada", pattern: /\blazada\b/i },
  { name: "Tokopedia", pattern: /\btokopedia\b/i },
  { name: "Paytm", pattern: /\bpaytm\b/i },
  { name: "PhonePe", pattern: /\bphonepe\b/i },
  { name: "GPay", pattern: /\bgpay\b|\bgoogle pay\b/i },
  { name: "Bank", pattern: /\bbank\b|\bsbi\b|\bhdfc\b|\bicici\b|\baxis\b|\bkotak\b/i },
  { name: "Binance", pattern: /\bbinance\b/i },
  { name: "Discord", pattern: /\bdiscord\b/i },
  { name: "Spotify", pattern: /\bspotify\b/i },
  { name: "Netflix", pattern: /\bnetflix\b/i },
  { name: "Signal", pattern: /\bsignal\b/i },
  { name: "Viber", pattern: /\bviber\b/i },
  { name: "Line", pattern: /\bline\b/i },
  { name: "WeChat", pattern: /\bwechat\b/i },
];

// Country code to name mapping (common ones)
const COUNTRY_CODES = {
  "91": "India", "1": "USA/Canada", "44": "UK", "61": "Australia",
  "86": "China", "81": "Japan", "82": "South Korea", "62": "Indonesia",
  "60": "Malaysia", "63": "Philippines", "66": "Thailand", "84": "Vietnam",
  "90": "Turkey", "92": "Pakistan", "880": "Bangladesh", "94": "Sri Lanka",
  "977": "Nepal", "95": "Myanmar", "855": "Cambodia", "856": "Laos",
  "234": "Nigeria", "254": "Kenya", "27": "South Africa", "20": "Egypt",
  "212": "Morocco", "213": "Algeria", "216": "Tunisia", "233": "Ghana",
  "225": "Côte d'Ivoire", "228": "Togo", "229": "Benin", "221": "Senegal",
  "509": "Haiti", "55": "Brazil", "52": "Mexico", "54": "Argentina",
  "57": "Colombia", "51": "Peru", "56": "Chile", "58": "Venezuela",
  "7": "Russia", "380": "Ukraine", "48": "Poland", "49": "Germany",
  "33": "France", "34": "Spain", "39": "Italy", "31": "Netherlands",
  "32": "Belgium", "41": "Switzerland", "43": "Austria", "46": "Sweden",
  "47": "Norway", "45": "Denmark", "358": "Finland", "351": "Portugal",
  "30": "Greece", "36": "Hungary", "420": "Czech Republic", "966": "Saudi Arabia",
  "971": "UAE", "974": "Qatar", "965": "Kuwait", "968": "Oman",
  "973": "Bahrain", "962": "Jordan", "961": "Lebanon", "964": "Iraq",
  "98": "Iran", "972": "Israel",
};

class OtpExtractor {
  /**
   * Extract OTP from a message text.
   * @param {string} text - SMS message body
   * @returns {{ code: string, service: string } | null}
   */
  static extractOtp(text) {
    if (!text || typeof text !== "string") return null;

    for (const regex of OTP_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(text);
      if (match && match[1]) {
        const code = match[1].replace(/[-\s]/g, "");
        if (code.length >= 4 && code.length <= 8) {
          return {
            code,
            service: OtpExtractor.detectService(text),
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect which service sent the message.
   */
  static detectService(text) {
    for (const { name, pattern } of SERVICE_PATTERNS) {
      if (pattern.test(text)) return name;
    }
    return "Unknown";
  }

  /**
   * Detect country from a phone number.
   */
  static detectCountry(phoneNumber) {
    if (!phoneNumber) return "Unknown";
    const clean = phoneNumber.replace(/[^0-9+]/g, "").replace(/^\+/, "");

    // Try longest prefix first (3 digits, then 2, then 1)
    for (let len = 3; len >= 1; len--) {
      const prefix = clean.substring(0, len);
      if (COUNTRY_CODES[prefix]) return COUNTRY_CODES[prefix];
    }
    return "Unknown";
  }

  /**
   * Check if a message likely contains an OTP.
   */
  static isOtpMessage(text) {
    if (!text) return false;
    return /(?:code|otp|pin|verif|confirm|token|kode|код|कोड|verify)/i.test(text)
      && /\d{4,8}/.test(text);
  }

  /**
   * Extract phone number from device data.
   */
  static extractPhoneNumber(device, messages) {
    // Try device's own phone number first
    if (device.phoneNumber && device.phoneNumber !== "—") {
      return device.phoneNumber.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    }

    // Try SIM number
    if (device.simNumber) return device.simNumber.replace(/[^0-9+]/g, "").replace(/^\+/, "");

    // Try extracting from messages
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        const match = (msg.text || "").match(/\+?(\d{10,15})/);
        if (match) return match[1];
      }
    }

    return "";
  }
}

module.exports = OtpExtractor;
