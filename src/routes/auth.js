"use strict";

const { Router } = require("express");
const AuthService = require("../services/auth");
const { requireAuth } = require("../middleware/auth");

const router = Router();

/**
 * POST /api/auth/register
 */
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const user = await AuthService.register({ username, email, password });

    const token = AuthService.generateToken(user);
    res.cookie("cyrus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res, next) => {
  try {
    const { login, password } = req.body;
    const result = await AuthService.login({ login, password });

    res.cookie("cyrus_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  res.clearCookie("cyrus_token");
  res.json({ success: true, message: "Logged out" });
});

/**
 * GET /api/auth/me
 * Returns the CURRENT user from database (fresh role, not from JWT).
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If role changed since token was issued, regenerate token
    if (user.role !== req.user.role) {
      const newToken = AuthService.generateToken(user);
      res.cookie("cyrus_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/password
 */
router.put("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
