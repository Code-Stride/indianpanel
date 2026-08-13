"use strict";

/**
 * Firebase connections management routes.
 * CRUD for multiple Firebase database URLs and secret keys per user.
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// All connection routes require authentication
router.use(requireAuth);

/**
 * GET /api/connections
 * List all Firebase connections for the current user.
 */
router.get("/", (req, res, next) => {
  try {
    const connections = ConnectionsService.list(req.user.userId);
    res.json({ success: true, count: connections.length, connections });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/connections
 * Add a new Firebase connection.
 * Body: { name, url, key }
 */
router.post("/", (req, res, next) => {
  try {
    const { name, url, key } = req.body;
    const connection = ConnectionsService.add(req.user.userId, { name, url, key });
    res.status(201).json({
      success: true,
      connection: { ...connection, key: ConnectionsService.maskKey(connection.key) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/connections/:id
 * Get a single connection (masked key).
 */
router.get("/:id", (req, res, next) => {
  try {
    const conn = ConnectionsService.get(req.user.userId, req.params.id);
    res.json({
      success: true,
      connection: { ...conn, key: ConnectionsService.maskKey(conn.key) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/connections/:id
 * Update a connection.
 * Body: { name?, url?, key?, isActive? }
 */
router.put("/:id", (req, res, next) => {
  try {
    const updated = ConnectionsService.update(req.user.userId, req.params.id, req.body);
    res.json({
      success: true,
      connection: { ...updated, key: ConnectionsService.maskKey(updated.key) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/connections/:id
 * Remove a connection.
 */
router.delete("/:id", (req, res, next) => {
  try {
    ConnectionsService.remove(req.user.userId, req.params.id);
    res.json({ success: true, message: "Connection removed" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/connections/:id/test
 * Test a Firebase connection.
 */
router.post("/:id/test", async (req, res, next) => {
  try {
    const conn = ConnectionsService.get(req.user.userId, req.params.id);

    const data = await FirebaseService.read(conn.url, conn.key, "clients");
    const deviceCount = data ? Object.keys(data).length : 0;

    ConnectionsService.update(req.user.userId, conn.id, {
      lastChecked: new Date().toISOString(),
      deviceCount,
    });

    res.json({
      success: true,
      status: "connected",
      deviceCount,
      message: `Connected! ${deviceCount} device(s) found.`,
    });
  } catch (err) {
    res.json({
      success: false,
      status: "error",
      message: err.message,
    });
  }
});

module.exports = router;
