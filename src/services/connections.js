"use strict";

const { getDatabase } = require("../database");
const { validateFirebaseUrl } = require("../middleware/validate");

let _db = null;
async function db() {
  if (!_db) _db = await getDatabase("connections");
  return _db;
}

class ConnectionsService {
  static async add({ name, url, key }) {
    if (!name || !name.trim())
      throw Object.assign(new Error("Connection name is required"), { status: 400 });
    if (!url)
      throw Object.assign(new Error("Firebase URL is required"), { status: 400 });
    if (!key)
      throw Object.assign(new Error("Secret key is required"), { status: 400 });

    const normalizedUrl = validateFirebaseUrl(url);
    if (!normalizedUrl)
      throw Object.assign(new Error("Invalid Firebase URL. Must be HTTPS and end with firebaseio.com or firebasedatabase.app"), { status: 400 });

    const conns = await db();
    if (await conns.findOne({ url: normalizedUrl }))
      throw Object.assign(new Error("This Firebase URL is already connected"), { status: 409 });

    return conns.insert({
      name: name.trim().slice(0, 100),
      url: normalizedUrl,
      key: key.trim(),
      isActive: true,
      lastChecked: null,
      deviceCount: 0,
      addedBy: "",
    });
  }

  static async list() {
    const all = await (await db()).findAll();
    return all.map((c) => ({ ...c, key: ConnectionsService.maskKey(c.key) }));
  }

  static async listWithKeys() {
    return (await db()).findAll();
  }

  static async getAllActive() {
    return (await db()).findMany({ isActive: true });
  }

  static async get(connectionId) {
    const conn = await (await db()).findOne({ id: connectionId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return conn;
  }

  static async update(connectionId, updates) {
    await ConnectionsService.get(connectionId);
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
    return (await db()).update(connectionId, allowed);
  }

  static async remove(connectionId) {
    const conn = await (await db()).findOne({ id: connectionId });
    if (!conn) throw Object.assign(new Error("Connection not found"), { status: 404 });
    return (await db()).delete(connectionId);
  }

  static maskKey(key) {
    if (!key || key.length <= 10) return "••••••••";
    return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  }

  static async count() { return (await (await db()).findAll()).length; }

  static async activeCount() { return (await (await db()).findMany({ isActive: true })).length; }
}

module.exports = ConnectionsService;
