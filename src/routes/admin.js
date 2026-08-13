"use strict";

const { Router } = require("express");
const ConnectionsService = require("../services/connections");
const FirebaseService = require("../services/firebase");
const AuthService = require("../services/auth");
const { requireAdmin } = require("../middleware/auth");

const router = Router();
router.use(requireAdmin);

// ═══ Firebase Connections ═══════════════════════════

router.get("/connections", async (_req, res, next) => {
  try {
    const connections = await ConnectionsService.list();
    res.json({ success: true, count: connections.length, connections });
  } catch (err) { next(err); }
});

router.post("/connections", async (req, res, next) => {
  try {
    const { name, url, key } = req.body;
    const connection = await ConnectionsService.add({ name, url, key });
    res.status(201).json({
      success: true,
      connection: { ...connection, key: ConnectionsService.maskKey(connection.key) },
    });
  } catch (err) { next(err); }
});

router.put("/connections/:id", async (req, res, next) => {
  try {
    const updated = await ConnectionsService.update(req.params.id, req.body);
    res.json({
      success: true,
      connection: { ...updated, key: ConnectionsService.maskKey(updated.key) },
    });
  } catch (err) { next(err); }
});

router.delete("/connections/:id", async (req, res, next) => {
  try {
    await ConnectionsService.remove(req.params.id);
    res.json({ success: true, message: "Connection removed" });
  } catch (err) { next(err); }
});

router.post("/connections/:id/test", async (req, res, next) => {
  try {
    const conn = await ConnectionsService.get(req.params.id);
    const data = await FirebaseService.read(conn.url, conn.key, "clients");
    const deviceCount = data ? Object.keys(data).length : 0;

    await ConnectionsService.update(conn.id, {
      lastChecked: new Date().toISOString(),
      deviceCount,
    });

    res.json({
      success: true, status: "connected", deviceCount,
      message: `Connected! ${deviceCount} device(s) found.`,
    });
  } catch (err) {
    res.json({ success: false, status: "error", message: err.message });
  }
});

// ═══ User Management ════════════════════════════════

router.get("/users", async (_req, res, next) => {
  try {
    const users = await AuthService.listAllUsers();
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
});

router.put("/users/:id/toggle", async (req, res, next) => {
  try {
    const user = await AuthService.toggleUserActive(req.params.id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

router.put("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await AuthService.setUserRole(req.params.id, role);
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId)
      return res.status(400).json({ error: "Cannot delete yourself" });
    await AuthService.deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) { next(err); }
});

// ═══ System Stats ═══════════════════════════════════

router.get("/stats", async (_req, res, next) => {
  try {
    const users = await AuthService.listAllUsers();
    const totalConnections = await ConnectionsService.count();
    const activeConnections = await ConnectionsService.activeCount();
    const allConns = await ConnectionsService.listWithKeys();
    const totalDevices = allConns.reduce((sum, c) => sum + (c.deviceCount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        totalConnections,
        activeConnections,
        totalDevices,
        uptime: process.uptime(),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
