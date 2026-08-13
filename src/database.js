"use strict";

/**
 * Simple JSON-file database.
 * Stores data in JSON files inside the data/ directory.
 * Thread-safe for single-process Node.js (uses atomic writes).
 */

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DATA_DIR = path.join(__dirname, "..", "data");

class Database {
  constructor(collection) {
    this.collection = collection;
    this.filePath = path.join(DATA_DIR, `${collection}.json`);
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _read() {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const raw = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  _write(data) {
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  /**
   * Insert a new record. Auto-generates an id if not provided.
   */
  insert(record) {
    const data = this._read();
    const entry = {
      id: record.id || uuidv4(),
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(entry);
    this._write(data);
    return entry;
  }

  /**
   * Find a single record by a field match.
   */
  findOne(query) {
    const data = this._read();
    return data.find((item) =>
      Object.entries(query).every(([k, v]) => item[k] === v)
    ) || null;
  }

  /**
   * Find all records matching a query.
   */
  findMany(query = {}) {
    const data = this._read();
    if (Object.keys(query).length === 0) return data;
    return data.filter((item) =>
      Object.entries(query).every(([k, v]) => item[k] === v)
    );
  }

  /**
   * Find all records (no filter).
   */
  findAll() {
    return this._read();
  }

  /**
   * Update a record by id.
   */
  update(id, updates) {
    const data = this._read();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data[index] = {
      ...data[index],
      ...updates,
      id: data[index].id, // prevent id overwrite
      createdAt: data[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    this._write(data);
    return data[index];
  }

  /**
   * Delete a record by id.
   */
  delete(id) {
    const data = this._read();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return false;
    data.splice(index, 1);
    this._write(data);
    return true;
  }

  /**
   * Delete records matching a query.
   */
  deleteMany(query) {
    const data = this._read();
    const before = data.length;
    const filtered = data.filter((item) =>
      !Object.entries(query).every(([k, v]) => item[k] === v)
    );
    this._write(filtered);
    return before - filtered.length;
  }

  /**
   * Count records matching a query.
   */
  count(query = {}) {
    return this.findMany(query).length;
  }
}

module.exports = Database;
