"use strict";

/**
 * Firebase connections management service.
 * Users can add multiple Firebase database URLs with secret keys.
 */

const Database = require("../database");
const { validateFirebaseUrl } = require("../middleware/validate");

const connectionsDb = new Database("connections");

class ConnectionsService {
  /**
   * Add a new Firebase connection for a user.
   */
  static add(userId, { name, url, key }) {
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

    // Check if this URL already exists for this user
    const existing = connectionsDb.findOne({ userId, url: normalizedUrl });
    if (existing) {
      throw Object.assign(new Error("This Firebase URL is already connected"), { status: 409 });
    }

    return connectionsDb.insert({
      userId,
      name: name.trim().slice(0, 100),
      url: normalizedUrl,
      key: key.trim(),
      isActive: true,
      lastChecked: null,
      deviceCount: 0,
    });
  }

  /**
   * Get all connections for a user.
   */
  static list(userId) {
    return connectionsDb.findMany({ userId }).map((c) => ({
      ...c,
      key: ConnectionsService.maskKey(c.key),
    }));
  }

  /**
   * Get all connections for a user with full keys (internal use only).
   */
  static listWithKeys(userId) {
    return connectionsDb.findMany({ userId });
  }

  /**
   * Get a single connection by ID (must belong to user).
   */
  static get(userId, connectionId) {
    const conn = connectionsDb.findOne({ id: connectionId, userId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return conn;
  }

  /**
   * Update a connection.
   */
  static update(userId, connectionId, updates) {
    const conn = ConnectionsService.get(userId, connectionId);

    const allowed = {};
    if (updates.name) allowed.name = updates.name.trim().slice(0, 100);
    if (updates.key) allowed.key = updates.key.trim();
    if (updates.url) {
      const normalizedUrl = validateFirebaseUrl(updates.url);
      if (!normalizedUrl) {
        throw Object.assign(new Error("Invalid Firebase URL"), { status: 400 });
      }
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
  static remove(userId, connectionId) {
    const conn = connectionsDb.findOne({ id: connectionId, userId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return connectionsDb.delete(connectionId);
  }

  /**
   * Get all active connections across all users (for OTP API).
   */
  static getAllActive() {
    return connectionsDb.findMany({ isActive: true });
  }

  /**
   * Mask a secret key for display (show first 4 and last 4 chars).
   */
  static maskKey(key) {
    if (!key || key.length <= 10) return "••••••••";
    return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  }

  /**
   * Count connections for a user.
   */
  static count(userId) {
    return connectionsDb.count({ userId });
  }
}

module.exports = ConnectionsService;
