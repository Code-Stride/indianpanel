"use strict";

/**
 * Database factory.
 *
 * If DATABASE_URL is set → uses PostgreSQL (Railway, production)
 * Otherwise → uses JSON files (local development)
 *
 * Both backends expose the same async API:
 *   insert(record), findOne(query), findMany(query), findAll(),
 *   update(id, updates), delete(id), deleteMany(query), count(query)
 */

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");

// ═══════════════════════════════════════════════════════
// JSON File Database (fallback for local dev)
// ═══════════════════════════════════════════════════════

class JsonDatabase {
  constructor(collection) {
    this.collection = collection;
    this.filePath = path.join(DATA_DIR, `${collection}.json`);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _read() {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch { return []; }
  }

  _write(data) {
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  async insert(record) {
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

  async findOne(query) {
    const data = this._read();
    return data.find((item) =>
      Object.entries(query).every(([k, v]) => item[k] === v)
    ) || null;
  }

  async findMany(query = {}) {
    const data = this._read();
    if (Object.keys(query).length === 0) return data;
    return data.filter((item) =>
      Object.entries(query).every(([k, v]) => item[k] === v)
    );
  }

  async findAll() { return this._read(); }

  async update(id, updates) {
    const data = this._read();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data[index] = {
      ...data[index],
      ...updates,
      id: data[index].id,
      createdAt: data[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    this._write(data);
    return data[index];
  }

  async delete(id) {
    const data = this._read();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return false;
    data.splice(index, 1);
    this._write(data);
    return true;
  }

  async deleteMany(query) {
    const data = this._read();
    const before = data.length;
    const filtered = data.filter((item) =>
      !Object.entries(query).every(([k, v]) => item[k] === v)
    );
    this._write(filtered);
    return before - filtered.length;
  }

  async count(query = {}) {
    return (await this.findMany(query)).length;
  }
}

// ═══════════════════════════════════════════════════════
// Factory: pick backend based on DATABASE_URL
// ═══════════════════════════════════════════════════════

let _usingPostgres = null;

async function getDatabase(collection) {
  if (_usingPostgres === null) {
    _usingPostgres = Boolean(process.env.DATABASE_URL);
    if (_usingPostgres) {
      console.log("  🐘 Using PostgreSQL database");
      const { runMigrations } = require("./pg-database");
      await runMigrations();
    } else {
      console.log("  📁 Using JSON file database (local)");
    }
  }

  if (_usingPostgres) {
    const { PostgresDatabase } = require("./pg-database");
    return new PostgresDatabase(collection);
  }
  return new JsonDatabase(collection);
}

module.exports = { JsonDatabase, getDatabase };
