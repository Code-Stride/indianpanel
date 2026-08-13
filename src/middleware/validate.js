"use strict";

/**
 * Validates that the request body contains required fields.
 * @param {string[]} fields - Array of required field names
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === "");
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required field(s): ${missing.join(", ")}`,
      });
    }
    next();
  };
}

/**
 * Validates a Firebase URL format.
 */
function validateFirebaseUrl(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith(".firebaseio.com") && !host.endsWith(".firebasedatabase.app")) return null;
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "").slice(0, 500);
  } catch {
    return null;
  }
}

module.exports = { requireFields, validateFirebaseUrl };
