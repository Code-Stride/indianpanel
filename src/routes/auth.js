"use strict";

/**
 * Authentication routes.
 * Login, register, logout, and session management.
 */

const { Router } = require("express");
const AuthService = require("../services/auth");
const { requireAuth } = require("../middleware/auth");

const router = Router();

/**
 * POST /api/auth/register
 * Create a new account.
 */
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const user = await AuthService.register({ username, email, password });

    // Generate token and set cookie
    const token = AuthService.generateToken(user);
    res.cookie("cyrus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Login with username/email + password.
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
 * Clear the auth cookie.
 */
router.post("/logout", (_req, res) => {
  res.clearCookie("cyrus_token");
  res.json({ success: true, message: "Logged out" });
});

/**
 * GET /api/auth/me
 * Get the currently authenticated user.
 */
router.get("/me", requireAuth, (req, res, next) => {
  try {
    const user = AuthService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/password
 * Change password.
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
