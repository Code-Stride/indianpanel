"use strict";

const rateLimit = require("express-rate-limit");
const config = require("../config");

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
    retryAfterMs: config.rateLimit.windowMs,
  },
});

module.exports = { rateLimiter };
