"use strict";

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  env: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  telegram: {
    botToken: process.env.TG_BOT_TOKEN || "",
    chatId: process.env.TG_CHAT_ID || "",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  upload: {
    maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || "50", 10),
  },

  firebase: {
    requestTimeoutMs: 15000,
    validHostSuffixes: [".firebaseio.com", ".firebasedatabase.app"],
  },

  session: {
    secret: process.env.SESSION_SECRET || "cyrus-panel-default-secret-change-me-in-production",
  },
};

module.exports = config;
