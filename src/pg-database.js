"use strict";

/**
 * PostgreSQL Database class.
 * Same API as the JSON Database class — drop-in replacement.
 *
 * Tables are auto-created on first use (idempotent migrations).
 */

const { Pool } = require("pg");

let _pool = null;

function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("railway")
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    _pool.on("error", (err) => {
      console.error("[PG] Unexpected pool error:", err.message);
    });
  }
  return _pool;
}

/**
 * Run migrations — create tables if they don't exist.
 */
async function runMigrations() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        "apiKey"    TEXT UNIQUE NOT NULL,
        role        TEXT NOT NULL DEFAULT 'user',
        avatar      TEXT DEFAULT '',
        bio         TEXT DEFAULT '',
        phone       TEXT DEFAULT '',
        "isActive"  BOOLEAN DEFAULT true,
        "lastLogin" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS connections (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        url           TEXT UNIQUE NOT NULL,
        key           TEXT NOT NULL,
        "isActive"    BOOLEAN DEFAULT true,
        "lastChecked" TIMESTAMPTZ,
        "deviceCount" INTEGER DEFAULT 0,
        "addedBy"     TEXT DEFAULT '',
        "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_apikey ON users("apiKey");
      CREATE INDEX IF NOT EXISTS idx_connections_active ON connections("isActive");
    `);
    console.log("  ✅ PostgreSQL migrations complete");
  } finally {
    client.release();
  }
}

class PostgresDatabase {
  constructor(collection) {
    this.table = collection;
    this._validTables = new Set(["users", "connections"]);
    if (!this._validTables.has(this.table)) {
      throw new Error(`Invalid table: ${this.table}`);
    }
  }

  /**
   * Insert a record.
   */
  async insert(record) {
    const { v4: uuidv4 } = require("uuid");
    const entry = {
      id: record.id || uuidv4(),
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const keys = Object.keys(entry);
    const values = Object.values(entry);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const quotedKeys = keys.map((k) => `"${k}"`);

    const sql = `INSERT INTO ${this.table} (${quotedKeys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const result = await getPool().query(sql, values);
    return result.rows[0];
  }

  /**
   * Find one record matching the query.
   */
  async findOne(query) {
    const { where, values } = this._buildWhere(query);
    const sql = `SELECT * FROM ${this.table} ${where} LIMIT 1`;
    const result = await getPool().query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Find many records matching the query.
   */
  async findMany(query = {}) {
    const { where, values } = this._buildWhere(query);
    const sql = `SELECT * FROM ${this.table} ${where} ORDER BY "createdAt" ASC`;
    const result = await getPool().query(sql, values);
    return result.rows;
  }

  /**
   * Find all records.
   */
  async findAll() {
    return this.findMany({});
  }

  /**
   * Update a record by id.
   */
  async update(id, updates) {
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.createdAt;
    safeUpdates.updatedAt = new Date().toISOString();

    const keys = Object.keys(safeUpdates);
    if (keys.length === 0) return this.findOne({ id });

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    const values = [...Object.values(safeUpdates), id];
    const sql = `UPDATE ${this.table} SET ${setClauses.join(", ")} WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await getPool().query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Delete by id.
   */
  async delete(id) {
    const result = await getPool().query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }

  /**
   * Delete many matching query.
   */
  async deleteMany(query) {
    const { where, values } = this._buildWhere(query);
    const result = await getPool().query(`DELETE FROM ${this.table} ${where}`, values);
    return result.rowCount;
  }

  /**
   * Count records matching query.
   */
  async count(query = {}) {
    const { where, values } = this._buildWhere(query);
    const result = await getPool().query(`SELECT COUNT(*) FROM ${this.table} ${where}`, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Build WHERE clause from query object.
   */
  _buildWhere(query) {
    const keys = Object.keys(query);
    if (keys.length === 0) return { where: "", values: [] };

    const clauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    return {
      where: `WHERE ${clauses.join(" AND ")}`,
      values: Object.values(query),
    };
  }
}

module.exports = { PostgresDatabase, runMigrations, getPool };
