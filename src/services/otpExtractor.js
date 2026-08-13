"use strict";

/**
 * OTP Extractor — detects OTP codes, services, phone numbers from SMS.
 */

// ═══ OTP Code Patterns ═══════════════════════════════════
const OTP_PATTERNS = [
  // "one-time password (OTP) for X is 331827"
  /(?:one[- ]?time\s+password|OTP|otp)\s*(?:\([^)]*\))?\s*(?:for|of|from)?\s*(?:[A-Za-z0-9\s]+?)?\s*(?:is|:)\s*(\d{4,8})/gi,
  // "OTP is 123456" / "code: 123456"
  /(?:your\s+)?(?:OTP|otp|code|pin|password|passcode|verification\s+code|security\s+code|auth(?:entication)?\s+code|login\s+code|sign[- ]?in\s+code|confirm(?:ation)?\s+code|access\s+code|activation\s+code)\s*(?:is|:|\s)*(\d{4,8})/gi,
  // "123-456 is your"
  /(\d{3,4})[-\s](\d{3,4})\s+(?:is your|is the|est votre)/gi,
  /(\d{3,4}[-\s]?\d{3,4})\s+(?:is your|is the)/gi,
  // "use 123456 as" / "enter 123456 for"
  /(?:use|enter)\s+(\d{4,8})\s+(?:as|for|to)\s+/gi,
  // "your code 123456"
  /(?:your|the|use|enter)\s+(?:code|otp|pin)\s+(\d{4,8})/gi,
  // WhatsApp code 123-456
  /(?:WhatsApp|whatsapp)\s+(?:Business\s+)?code\s+(\d{3,4}[-\s]?\d{3,4})/gi,
  // Google G-XXXXXX
  /(?:G-|g-)(\d{4,8})/g,
  // Generic keyword + digits
  /(?:code|otp|pin|verify|token|kode)\s*[:\s]*(\d{4,8})/gi,
];

// ═══ Known Services ══════════════════════════════════════
const KNOWN_SERVICES = [
  // Messaging
  ["WhatsApp", /\bwhats\s*app\b/i],
  ["Telegram", /\btelegram\b/i],
  ["Signal", /\bsignal\b/i],
  ["Viber", /\bviber\b/i],
  ["LINE", /\bline\b(?!.*airline)/i],
  ["WeChat", /\bwechat\b/i],
  ["IMO", /\bimo\b/i],

  // Social
  ["Facebook", /\bfacebook\b|\bfb\b(?!.*feedback)/i],
  ["Instagram", /\binstagram\b/i],
  ["Twitter/X", /\btwitter\b|\bx\.com\b/i],
  ["Snapchat", /\bsnapchat\b/i],
  ["TikTok", /\btik\s*tok\b/i],
  ["LinkedIn", /\blinkedin\b/i],
  ["Reddit", /\breddit\b/i],
  ["Discord", /\bdiscord\b/i],
  ["Pinterest", /\bpinterest\b/i],

  // Google
  ["Google", /\bgoogle\b|\bgmail\b|\byoutube\b|\bG-\d/i],
  ["Google Pay", /\bgoogle\s*pay\b|\bgpay\b/i],

  // Microsoft
  ["Microsoft", /\bmicrosoft\b|\boutlook\b|\bhotmail\b|\bxbox\b|\bskype\b/i],

  // Apple
  ["Apple", /\bapple\b|\bicloud\b|\biphone\b/i],

  // Shopping
  ["Amazon", /\bamazon\b/i],
  ["Flipkart", /\bflipkart\b/i],
  ["Myntra", /\bmyntra\b/i],
  ["Shopee", /\bshopee\b/i],
  ["Lazada", /\blazada\b/i],
  ["Tokopedia", /\btokopedia\b/i],
  ["Meesho", /\bmeesho\b/i],
  ["Ajio", /\bajio\b/i],
  ["Nykaa", /\bnykaa\b/i],

  // Food/Delivery
  ["Swiggy", /\bswiggy\b/i],
  ["Zomato", /\bzomato\b/i],
  ["Uber Eats", /\buber\s*eats\b/i],
  ["DoorDash", /\bdoordash\b/i],
  ["Grab", /\bgrab\b(?!.*grabbing)/i],
  ["Gojek", /\bgojek\b/i],

  // Ride
  ["Uber", /\buber\b/i],
  ["Ola", /\bola\b(?!.*ola[aeiou])/i],
  ["Bolt", /\bbolt\b(?!.*bolted)/i],
  ["inDrive", /\bindrive\b/i],

  // Payments (India)
  ["Paytm", /\bpaytm\b/i],
  ["PhonePe", /\bphone\s*pe\b/i],
  ["PayPal", /\bpaypal\b/i],
  ["Razorpay", /\brazor\s*pay\b/i],
  ["Cred", /\bcred\b/i],
  ["Mobills", /\bmobills\b/i],
  ["Freecharge", /\bfreecharge\b/i],
  ["DigiCredit", /\bdigi\s*credit\b/i],

  // Banking (India)
  ["SBI", /\bsbi\b|\bstate\s*bank\b/i],
  ["HDFC", /\bhdfc\b/i],
  ["ICICI", /\bicici\b/i],
  ["Axis Bank", /\baxis\s*bank\b/i],
  ["Kotak", /\bkotak\b/i],
  ["PNB", /\bpnb\b|\bpunjab\s*national\b/i],
  ["BOB", /\bbob\b.*bank|\bbank\s*of\s*baroda\b/i],
  ["Yes Bank", /\byes\s*bank\b/i],
  ["IndusInd", /\bindusind\b/i],
  ["IDFC", /\bidfc\b/i],
  ["Federal Bank", /\bfederal\s*bank\b/i],
  ["Bandhan Bank", /\bbandhan\b/i],
  ["RBL", /\brbl\b.*bank/i],
  ["Indane", /\bindane\b/i],
  ["HP Gas", /\bhp\s*gas\b|\bhindustan\s*petroleum\b/i],
  ["Bharat Gas", /\bbharat\s*gas\b|\bbharatgas\b|\bBPCL\b/i],

  // Telecom (India)
  ["Jio", /\bjio\b/i],
  ["Airtel", /\bairtel\b/i],
  ["Vi", /\bvi\b(?!.*via|.*video|.*view)/i],
  ["BSNL", /\bbsnl\b/i],

  // Crypto
  ["Binance", /\bbinance\b/i],
  ["Coinbase", /\bcoinbase\b/i],
  ["WazirX", /\bwazir\s*x\b/i],

  // Streaming
  ["Netflix", /\bnetflix\b/i],
  ["Spotify", /\bspotify\b/i],
  ["Disney+", /\bdisney\b/i],
  ["Hotstar", /\bhotstar\b/i],
  ["Prime Video", /\bprime\s*video\b/i],

  // Govt (India)
  ["Aadhaar/UIDAI", /\baadhaar\b|\buidai\b/i],
  ["PAN/IT Dept", /\bpan\s*card\b|\bincome\s*tax\b|\bit\s*department\b/i],
  ["DigiLocker", /\bdigi\s*locker\b/i],
  ["IRCTC", /\birctc\b/i],
  ["EPFO/PF", /\bepfo\b|\bprovident\s*fund\b|\bpf\b.*account/i],
  ["GST", /\bgst\b.*portal|\bgstin\b/i],
  ["Passport", /\bpassport\b.*seva/i],
  ["Cowin", /\bcowin\b|\bvaccin/i],
  ["Parivahan", /\bparivahan\b|\bdriving\s*licence/i],

  // Others
  ["Truecaller", /\btruecaller\b/i],
  ["WhatsApp Business", /\bwhatsapp\s*business\b/i],
];

// ═══ Country Codes ═══════════════════════════════════════
const COUNTRY_CODES = {
  "91":"India","1":"USA/Canada","44":"UK","61":"Australia","86":"China",
  "81":"Japan","82":"South Korea","62":"Indonesia","60":"Malaysia",
  "63":"Philippines","66":"Thailand","84":"Vietnam","90":"Turkey",
  "92":"Pakistan","880":"Bangladesh","94":"Sri Lanka","977":"Nepal",
  "95":"Myanmar","855":"Cambodia","234":"Nigeria","254":"Kenya",
  "27":"South Africa","20":"Egypt","212":"Morocco","213":"Algeria",
  "216":"Tunisia","233":"Ghana","225":"Côte d'Ivoire","228":"Togo",
  "229":"Benin","221":"Senegal","509":"Haiti","55":"Brazil",
  "52":"Mexico","54":"Argentina","57":"Colombia","51":"Peru",
  "56":"Chile","7":"Russia","380":"Ukraine","48":"Poland",
  "49":"Germany","33":"France","34":"Spain","39":"Italy",
  "31":"Netherlands","32":"Belgium","41":"Switzerland","43":"Austria",
  "46":"Sweden","47":"Norway","45":"Denmark","358":"Finland",
  "351":"Portugal","30":"Greece","36":"Hungary","420":"Czech Republic",
  "966":"Saudi Arabia","971":"UAE","974":"Qatar","965":"Kuwait",
  "968":"Oman","973":"Bahrain","962":"Jordan","961":"Lebanon",
  "964":"Iraq","98":"Iran","972":"Israel",
};

// ═══ Phone Patterns ══════════════════════════════════════
const PHONE_PATTERNS = [
  /\+91[\s-]?([6-9]\d{9})/,
  /\+?(\d{1,3})[\s-]?([6-9]\d{9})/,
  /\b([6-9]\d{9})\b/,
  /\+?(\d{10,15})\b/,
];

class OtpExtractor {

  /**
   * Check if a word is a common stop word (not a service name).
   */
  static _isStopWord(word) {
    return /^(your|the|this|that|and|for|from|with|please|dear|customer|user|otp|code|pin|new|old|use|enter|keep|share|valid|do|not|it|is|are|was|has|had|been|will|can|may|must|shall|should|would|could)$/i.test(word);
  }

  /**
   * Extract OTP code from text.
   */
  static extractOtp(text) {
    if (!text || typeof text !== "string") return null;

    for (const regex of OTP_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(text);
      if (match) {
        // Handle multi-group matches like "123-456"
        let code = match[1] || "";
        if (match[2]) code = match[1] + match[2]; // "123" + "456"
        code = code.replace(/[-\s]/g, "");
        if (code.length >= 4 && code.length <= 8) {
          return { code, service: OtpExtractor.detectService(text) };
        }
      }
    }
    return null;
  }

  /**
   * Detect service name from message text.
   * Tries known services first, then extracts from message patterns.
   */
  static detectService(text) {
    // 1. Check known services first
    for (const [name, pattern] of KNOWN_SERVICES) {
      if (pattern.test(text)) return name;
    }

    // 2. "-BRAND" at end of message (most reliable)
    const endMatch = text.match(/[-–—]\s*([A-Z][A-Za-z0-9]+(?:\s*\([^)]+\))?)\s*$/);
    if (endMatch && endMatch[1] && !OtpExtractor._isStopWord(endMatch[1])) {
      return endMatch[1].trim();
    }

    // 3. Generic extraction — uses case-sensitive patterns to avoid false positives
    const genericPatterns = [
      // "for SERVICE Sign in" / "for SERVICE login" (case-sensitive: service must be uppercase-start)
      /(?:for|from|by)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+(?:[Ss]ign|[Ll]ogin|OTP|[Vv]erif|[Cc]ode|[Aa]ccount|[Rr]egistration)/,
      // "SERVICE login OTP" / "SERVICE OTP"
      /([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+(?:login\s+)?OTP/,
      // "on SERVICE app"
      /(?:on|in)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+(?:app|portal|website|account)/,
      // "Dear customer,your OTP for SERVICE..." — extract SERVICE before "is NNNN"
      /OTP\s+(?:for\s+)?(?:\w+\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)\s+(?:is\s+\d|network|service)/i,
    ];

    for (const pattern of genericPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && !OtpExtractor._isStopWord(match[1])) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 30 && /^[A-Z]/.test(name)) return name;
      }
    }

    return "Unknown";
  }

  static detectCountry(phoneNumber) {
    if (!phoneNumber) return "Unknown";
    const clean = String(phoneNumber).replace(/[^0-9]/g, "");
    if (clean.length < 7) return "Unknown";

    for (let len = 3; len >= 1; len--) {
      const prefix = clean.substring(0, len);
      if (COUNTRY_CODES[prefix]) return COUNTRY_CODES[prefix];
    }
    return "Unknown";
  }

  /**
   * Check if message likely contains an OTP.
   */
  static isOtpMessage(text) {
    if (!text) return false;
    const hasKeyword = /(?:code|otp|pin|verif|confirm|token|kode|код|कोड|verify|one.time|passcode|auth|sign.in|log.in)/i.test(text);
    const hasDigits = /\d{4,8}/.test(text);
    return hasKeyword && hasDigits;
  }

  /**
   * Extract phone number — tries device data, then message content.
   */
  static extractPhoneNumber(device, messages) {
    // 1. Device's own phone number (check multiple field names)
    const devicePhone = device.phoneNumber || device.phone || device.number
      || device.mobileNumber || device.mobile || device.simNumber || "";
    if (devicePhone && devicePhone !== "—") {
      const clean = String(devicePhone).replace(/[^0-9+]/g, "");
      if (clean.length >= 7) return clean.replace(/^\+/, "");
    }

    // 2. Try to extract from messages
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        const text = msg.text || msg.body || msg.message || "";
        for (const pattern of PHONE_PATTERNS) {
          const match = text.match(pattern);
          if (match) {
            const num = (match[2] || match[1] || match[0]).replace(/[^0-9]/g, "");
            if (num.length >= 10 && num.length <= 15) return num;
          }
        }
      }
    }

    return "";
  }
  /**
   * Mask a phone number with CYRUS branding.
   * "918480991648" → "CYRUS-1648"
   * "50942237186" → "CYRUS-7186"
   */
  static maskPhone(phone) {
    if (!phone || phone === "Unknown") return "CYRUS";
    const digits = String(phone).replace(/[^0-9]/g, "");
    if (digits.length < 7) return "CYRUS";
    // Extract country code (1-3 digits)
    let cc = "";
    for (let len = 3; len >= 1; len--) {
      const prefix = digits.substring(0, len);
      if (COUNTRY_CODES[prefix]) { cc = prefix; break; }
    }
    if (!cc) cc = digits.substring(0, 2); // fallback
    const last5 = digits.slice(-5);
    return cc + "CYRUS" + last5;
  }

}

module.exports = OtpExtractor;
