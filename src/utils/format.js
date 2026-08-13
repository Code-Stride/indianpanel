"use strict";

/**
 * Format a timestamp into a human-readable relative or absolute string.
 */
function formatTimestamp(ts) {
  if (!ts) return "—";

  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(date.getTime())) return String(ts);

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format a number as Indian currency (₹).
 */
function formatINR(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/**
 * Truncate a string with ellipsis.
 */
function truncate(str, maxLen = 40) {
  if (!str || str.length <= maxLen) return str || "";
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Safe JSON parse with fallback.
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = { formatTimestamp, formatINR, truncate, safeJsonParse };
