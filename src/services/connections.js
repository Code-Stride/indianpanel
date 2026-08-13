"use strict";

/**
 * Firebase connections management service.
 * Connections are GLOBAL — managed by admins, accessible by all users.
 * All Firebase databases are linked together into a unified pool.
 */

const Database = require("../database");
const { validateFirebaseUrl } = require("../middleware/validate");

const connectionsDb = new Database("connections");

class ConnectionsService {
  /**
   * Add a new Firebase connection (admin only).
   */
  static add({ name, url, key }) {
    if (!name || name.trim().length === 0) {
      throw Object.assign(new Error("Connection name is required"), { status: 400 });
    }
    if (!url) {
      throw Object.assign(new Error("Firebase URL is required"), { status: 400 });
    }
    if (!key) {
      throw Object.assign(new Error("Secret key is required"), { status: 400 });
    }

    const normalizedUrl = validateFirebaseUrl(url);
    if (!normalizedUrl) {
      throw Object.assign(
        new Error("Invalid Firebase URL. Must be HTTPS and end with firebaseio.com or firebasedatabase.app"),
        { status: 400 }
      );
    }

    const existing = connectionsDb.findOne({ url: normalizedUrl });
    if (existing) {
      throw Object.assign(new Error("This Firebase URL is already connected"), { status: 409 });
    }

    return connectionsDb.insert({
      name: name.trim().slice(0, 100),
      url: normalizedUrl,
      key: key.trim(),
      isActive: true,
      lastChecked: null,
      deviceCount: 0,
      addedBy: "",
    });
  }

  /**
   * List all connections (keys masked for display).
   */
  static list() {
    return connectionsDb.findAll().map((c) => ({
      ...c,
      key: ConnectionsService.maskKey(c.key),
    }));
  }

  /**
   * List all connections with full keys (internal use — for OTP API, device fetching).
   */
  static listWithKeys() {
    return connectionsDb.findAll();
  }

  /**
   * Get all ACTIVE connections with full keys (for OTP API).
   */
  static getAllActive() {
    return connectionsDb.findMany({ isActive: true });
  }

  /**
   * Get a single connection by ID.
   */
  static get(connectionId) {
    const conn = connectionsDb.findOne({ id: connectionId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return conn;
  }

  /**
   * Update a connection.
   */
  static update(connectionId, updates) {
    ConnectionsService.get(connectionId); // verify exists

    const allowed = {};
    if (updates.name) allowed.name = updates.name.trim().slice(0, 100);
    if (updates.key) allowed.key = updates.key.trim();
    if (updates.url) {
      const normalizedUrl = validateFirebaseUrl(updates.url);
      if (!normalizedUrl) throw Object.assign(new Error("Invalid Firebase URL"), { status: 400 });
      allowed.url = normalizedUrl;
    }
    if (typeof updates.isActive === "boolean") allowed.isActive = updates.isActive;
    if (typeof updates.deviceCount === "number") allowed.deviceCount = updates.deviceCount;
    if (updates.lastChecked) allowed.lastChecked = updates.lastChecked;

    return connectionsDb.update(connectionId, allowed);
  }

  /**
   * Delete a connection.
   */
  static remove(connectionId) {
    const conn = connectionsDb.findOne({ id: connectionId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return connectionsDb.delete(connectionId);
  }

  static maskKey(key) {
    if (!key || key.length <= 10) return "••••••••";
    return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  }

  static count() {
    return connectionsDb.findAll().length;
  }

  static activeCount() {
    return connectionsDb.findMany({ isActive: true }).length;
  }
}

module.exports = ConnectionsService;
