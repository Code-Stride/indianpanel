"use strict";

/**
 * Firebase Realtime Database service.
 * Proxies requests to Firebase server-side for security and CORS avoidance.
 */

const fetch = require("node-fetch");
const config = require("../config");
const { validateFirebaseUrl } = require("../middleware/validate");

class FirebaseService {
  /**
   * Normalize and validate a Firebase database URL.
   */
  static normalizeUrl(url) {
    const normalized = validateFirebaseUrl(url);
    if (!normalized) {
      throw Object.assign(
        new Error("Invalid Firebase URL. Must be HTTPS and end with firebaseio.com or firebasedatabase.app"),
        { status: 400 }
      );
    }
    return normalized;
  }

  /**
   * GET data from a Firebase path.
   * @param {string} baseUrl - Firebase database URL
   * @param {string} authKey - Database secret / auth token
   * @param {string} path - Database path (e.g. "clients")
   * @param {object} [params] - Additional query parameters
   */
  static async read(baseUrl, authKey, path, params = {}) {
    const base = this.normalizeUrl(baseUrl);
    const key = String(authKey || "").trim();
    if (!key) throw Object.assign(new Error("Auth key is required"), { status: 400 });

    const queryParams = new URLSearchParams({ auth: key, ...params });
    const url = `${base}/${path}.json?${queryParams}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.firebase.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 401 || response.status === 403) {
          throw Object.assign(
            new Error("PERMISSION_DENIED: Firebase rejected the key. Use a Database Secret from Firebase Console → Project Settings → Service Accounts → Database Secrets."),
            { status: 403 }
          );
        }
        if (response.status === 404) return null;
        throw Object.assign(new Error(`Firebase HTTP ${response.status}: ${body.slice(0, 300)}`), { status: response.status });
      }

      return response.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw Object.assign(new Error("Request timed out. Check your Firebase URL."), { status: 504 });
      }
      if (err.status) throw err;
      throw Object.assign(new Error(`Network error: ${err.message}`), { status: 502 });
    }
  }

  /**
   * PUT (write/overwrite) data at a Firebase path.
   */
  static async write(baseUrl, authKey, path, data) {
    const base = this.normalizeUrl(baseUrl);
    const key = String(authKey || "").trim();
    if (!key) throw Object.assign(new Error("Auth key is required"), { status: 400 });

    const url = `${base}/${path}.json?auth=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw Object.assign(
          new Error("PERMISSION_DENIED: Cannot write to Firebase. Use a Database Secret key, not an API key."),
          { status: 403 }
        );
      }
      throw Object.assign(new Error(`Firebase HTTP ${response.status}`), { status: response.status });
    }

    return response.json();
  }

  /**
   * DELETE data at a Firebase path.
   */
  static async remove(baseUrl, authKey, path) {
    const base = this.normalizeUrl(baseUrl);
    const key = String(authKey || "").trim();
    if (!key) throw Object.assign(new Error("Auth key is required"), { status: 400 });

    const url = `${base}/${path}.json?auth=${encodeURIComponent(key)}`;

    const response = await fetch(url, { method: "DELETE" });

    if (!response.ok) {
      if (response.status === 403) {
        throw Object.assign(new Error("PERMISSION_DENIED"), { status: 403 });
      }
      throw Object.assign(new Error(`Firebase HTTP ${response.status}`), { status: response.status });
    }

    return response.json();
  }

  /**
   * PATCH (update) data at a Firebase path.
   */
  static async update(baseUrl, authKey, path, data) {
    const base = this.normalizeUrl(baseUrl);
    const key = String(authKey || "").trim();
    if (!key) throw Object.assign(new Error("Auth key is required"), { status: 400 });

    const url = `${base}/${path}.json?auth=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw Object.assign(new Error("PERMISSION_DENIED"), { status: 403 });
      }
      throw Object.assign(new Error(`Firebase HTTP ${response.status}`), { status: response.status });
    }

    return response.json();
  }
}

module.exports = FirebaseService;
