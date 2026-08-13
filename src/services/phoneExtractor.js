"use strict";

/**
 * Phone number extraction service.
 * Extracts Indian phone numbers from SMS text with carrier identification.
 */

const CARRIER_PATTERNS = [
  { name: "Jio", pattern: /(?:Jio|JIO)\s+/i },
  { name: "Airtel", pattern: /(?:Airtel|AIRTEL)\s+/i },
  { name: "Vi", pattern: /(?:Vi|VI|Vodafone|VODAFONE|Idea|IDEA)\s+/i },
  { name: "BSNL", pattern: /(?:BSNL|bsnl)\s+/i },
  { name: "MTNL", pattern: /(?:MTNL|mtnl)\s+/i },
  { name: "Docomo", pattern: /(?:Docomo|DOCOMO|Tata)\s+/i },
  { name: "Reliance", pattern: /(?:Reliance|RELIANCE)\s+/i },
  { name: "Telenor", pattern: /(?:Telenor|TELENOR)\s+/i },
  { name: "Uninor", pattern: /(?:Uninor|UNINOR)\s+/i },
  { name: "Videocon", pattern: /(?:Videocon|VIDEOCON)\s+/i },
];

const PHONE_PATTERNS = [
  /\+91[-\s]?([6-9][0-9]{9})/g,
  /\b(?:91)([6-9][0-9]{9})\b/g,
  /(?:^|\s|:)([6-9][0-9]{9})(?:\s|$|\.)/gm,
];

class PhoneExtractor {
  /**
   * Extract phone numbers from text.
   * @param {string} text
   * @returns {{ numbers: string[], carriers: string[] }}
   */
  static extract(text) {
    if (!text || typeof text !== "string") return { numbers: [], carriers: [] };

    const numbers = new Set();
    const carriers = new Set();

    for (const regex of PHONE_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match[1]) numbers.add(match[1]);
      }
    }

    for (const { name, pattern } of CARRIER_PATTERNS) {
      if (pattern.test(text)) carriers.add(name);
    }

    return {
      numbers: [...numbers],
      carriers: [...carriers],
    };
  }
}

module.exports = PhoneExtractor;
