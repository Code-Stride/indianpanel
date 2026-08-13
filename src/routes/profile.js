"use strict";

const { Router } = require("express");
const AuthService = require("../services/auth");
const ConnectionsService = require("../services/connections");
const { requireAuth } = require("../middleware/auth");

const router = Router();
router.use(requireAuth);

/**
 * GET /api/profile
 */
router.get("/", async (req, res, next) => {
  try {
    const user = await AuthService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const connectionCount = await ConnectionsService.count();

    res.json({
      success: true,
      user,
      stats: {
        connections: connectionCount,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile
 */
router.put("/", async (req, res, next) => {
  try {
    const user = await AuthService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/profile/regenerate-key
 */
router.post("/regenerate-key", async (req, res, next) => {
  try {
    const newKey = await AuthService.regenerateApiKey(req.user.userId);
    res.json({ success: true, apiKey: newKey });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
