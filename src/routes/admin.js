"use strict";

/**
 * Admin routes.
 * Firebase connection management, user management, system stats.
 * All routes require admin role.
 */

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const AuthService = require("../services/auth");
const { requireAdmin } = require("../middleware/auth");

const router = Router();

router.use(requireAdmin);

// ═══════════════════════════════════════════════════════
// Firebase Connections
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/connections
 * List all Firebase connections.
 */
router.get("/connections", (_req, res, next) => {
  try {
    const connections = ConnectionsService.list();
    res.json({ success: true, count: connections.length, connections });
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/connections
 * Add a new Firebase connection.
 */
router.post("/connections", (req, res, next) => {
  try {
    const { name, url, key } = req.body;
    const connection = ConnectionsService.add({ name, url, key });
    res.status(201).json({
      success: true,
      connection: { ...connection, key: ConnectionsService.maskKey(connection.key) },
    });
  } catch (err) { next(err); }
});

/**
 * PUT /api/admin/connections/:id
 * Update a connection.
 */
router.put("/connections/:id", (req, res, next) => {
  try {
    const updated = ConnectionsService.update(req.params.id, req.body);
    res.json({
      success: true,
      connection: { ...updated, key: ConnectionsService.maskKey(updated.key) },
    });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/admin/connections/:id
 * Remove a connection.
 */
router.delete("/connections/:id", (req, res, next) => {
  try {
    ConnectionsService.remove(req.params.id);
    res.json({ success: true, message: "Connection removed" });
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/connections/:id/test
 * Test a Firebase connection.
 */
router.post("/connections/:id/test", async (req, res, next) => {
  try {
    const conn = ConnectionsService.get(req.params.id);
    const data = await FirebaseService.read(conn.url, conn.key, "clients");
    const deviceCount = data ? Object.keys(data).length : 0;

    ConnectionsService.update(conn.id, {
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
    res.json({ success: false, status: "error", message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * List all users.
 */
router.get("/users", (_req, res, next) => {
  try {
    const users = AuthService.listAllUsers();
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
});

/**
 * PUT /api/admin/users/:id/toggle
 * Toggle user active/inactive.
 */
router.put("/users/:id/toggle", (req, res, next) => {
  try {
    const user = AuthService.toggleUserActive(req.params.id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

/**
 * PUT /api/admin/users/:id/role
 * Change user role.
 */
router.put("/users/:id/role", (req, res, next) => {
  try {
    const { role } = req.body;
    const user = AuthService.setUserRole(req.params.id, role);
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user.
 */
router.delete("/users/:id", (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    AuthService.deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════
// System Stats
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * System-wide statistics.
 */
router.get("/stats", (_req, res, next) => {
  try {
    const totalUsers = AuthService.listAllUsers().length;
    const activeUsers = AuthService.listAllUsers().filter(u => u.isActive).length;
    const totalConnections = ConnectionsService.count();
    const activeConnections = ConnectionsService.activeCount();
    const allConns = ConnectionsService.listWithKeys();
    const totalDevices = allConns.reduce((sum, c) => sum + (c.deviceCount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalConnections,
        activeConnections,
        totalDevices,
        uptime: process.uptime(),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
