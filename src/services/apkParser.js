"use strict";

/**
 * APK Parser service.
 * Extracts Firebase credentials from Android APK files.
 */

const AdmZip = require("adm-zip");
const path = require("path");

// Regex patterns for Firebase credentials
const FIREBASE_URL_REGEX = /https:\/\/[a-z0-9_-]+\.firebaseio\.com/gi;
const API_KEY_REGEX = /AIza[A-Za-z0-9_-]{35}/g;

class ApkParserService {
  /**
   * Search a buffer for Firebase URL and API key matches.
   */
  static searchBuffer(buffer) {
    let text = "";
    const CHUNK = 65536;
    for (let i = 0; i < buffer.length; i += CHUNK) {
      text += String.fromCharCode(...buffer.subarray(i, Math.min(i + CHUNK, buffer.length)));
    }

    const urlMatch = text.match(FIREBASE_URL_REGEX);
    const keyMatch = text.match(API_KEY_REGEX);

    return {
      url: urlMatch ? urlMatch[0] : "",
      key: keyMatch ? keyMatch[0] : "",
    };
  }

  /**
   * Parse an APK buffer and extract Firebase configuration.
   * @param {Buffer} apkBuffer - The raw APK file contents
   * @param {string} filename - Original filename for logging
   * @returns {Promise<object|null>} Extracted config or null
   */
  static async parse(apkBuffer, filename = "unknown.apk") {
    const zip = new AdmZip(apkBuffer);
    const entries = zip.getEntries();

    let firebaseUrl = "";
    let apiKey = "";
    let projectId = "";
    let appId = "";

    // 1. Check resources.arsc first (most common location)
    const resourcesEntry = zip.getEntry("resources.arsc");
    if (resourcesEntry) {
      const result = this.searchBuffer(resourcesEntry.getData());
      if (result.url) firebaseUrl = result.url;
      if (result.key) apiKey = result.key;
    }

    // 2. Check DEX files
    if (!firebaseUrl || !apiKey) {
      const dexFiles = ["classes.dex", "classes2.dex", "classes3.dex", "classes4.dex"];
      for (const dexName of dexFiles) {
        if (firebaseUrl && apiKey) break;
        const dexEntry = zip.getEntry(dexName);
        if (!dexEntry) continue;
        const result = this.searchBuffer(dexEntry.getData());
        if (!firebaseUrl && result.url) firebaseUrl = result.url;
        if (!apiKey && result.key) apiKey = result.key;
      }
    }

    // 3. Check google-services.json
    if (!firebaseUrl || !apiKey) {
      const jsonPaths = [
        "google-services.json",
        "assets/google-services.json",
      ];

      for (const jsonPath of jsonPaths) {
        const entry = zip.getEntry(jsonPath);
        if (!entry) continue;

        try {
          const parsed = JSON.parse(entry.getData().toString("utf8"));
          if (!firebaseUrl) firebaseUrl = parsed?.project_info?.firebase_url || "";
          if (!projectId) projectId = parsed?.project_info?.project_id || "";
          const client = parsed?.client?.[0];
          if (!apiKey) apiKey = client?.api_key?.[0]?.current_key || "";
          if (!appId) appId = client?.client_info?.mobilesdk_app_id || "";
        } catch {
          // Ignore parse errors
        }

        if (firebaseUrl && apiKey) break;
      }
    }

    // 4. Fallback: scan all files
    if (!firebaseUrl || !apiKey) {
      for (const entry of entries) {
        if (firebaseUrl && apiKey) break;
        if (entry.isDirectory) continue;

        try {
          const result = this.searchBuffer(entry.getData());
          if (!firebaseUrl && result.url) firebaseUrl = result.url;
          if (!apiKey && result.key) apiKey = result.key;
        } catch {
          // Skip entries that fail to decompress
        }
      }
    }

    if (!firebaseUrl && !apiKey) return null;

    return { firebaseUrl, apiKey, projectId, appId };
  }
}

module.exports = ApkParserService;
