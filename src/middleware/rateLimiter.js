"use strict";

const rateLimit = require("express-rate-limit");
const config = require("../config");

// General API rate limiter — generous limits for bots
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 min
  max: config.rateLimit.maxRequests,   // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limited. Slow down requests.",
    retryAfterMs: 5000,
  },
});

// OTP-specific limiter — very generous for bot polling
const otpLimiter = rateLimit({
  windowMs: 60000, // 1 minute window
  max: 60,         // 60 requests per minute (1 per second)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "OTP API rate limited. Wait a few seconds.",
    retryAfterMs: 3000,
  },
});

module.exports = { rateLimiter, otpLimiter };
