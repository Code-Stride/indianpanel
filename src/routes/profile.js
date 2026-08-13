"use strict";

/**
 * Profile routes.
 * User profile management.
 */

const { Router } = require("express");
const AuthService = require("../services/auth");
const ConnectionsService = require("../services/connections");
const { requireAuth } = require("../middleware/auth");

const router = Router();

router.use(requireAuth);

/**
 * GET /api/profile
 * Get the current user's profile with stats.
 */
router.get("/", (req, res, next) => {
  try {
    const user = AuthService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const connectionCount = ConnectionsService.count(req.user.userId);

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
 * Update profile fields.
 */
router.put("/", (req, res, next) => {
  try {
    const user = AuthService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/profile/regenerate-key
 * Regenerate the API key.
 */
router.post("/regenerate-key", (req, res, next) => {
  try {
    const newKey = AuthService.regenerateApiKey(req.user.userId);
    res.json({ success: true, apiKey: newKey });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
