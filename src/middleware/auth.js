"use strict";

const AuthService = require("../services/auth");

function extractToken(req) {
  if (req.cookies && req.cookies.cyrus_token) return req.cookies.cyrus_token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Populate req.user from JWT (sync — no DB lookup).
 * Used by optionalAuth and as first step for requireAuth/requireAdmin.
 */
function decodeToken(req) {
  const token = extractToken(req);
  if (!token) return null;
  const decoded = AuthService.verifyToken(token);
  return decoded; // { userId, username, role, iat, exp }
}

/**
 * Require authentication. Uses JWT claims (fast, no DB hit).
 * For role checks, use requireAdmin which does a DB verification.
 */
function requireAuth(req, res, next) {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(401).json({ error: "Authentication required. Please log in." });
  req.user = decoded;
  next();
}

/**
 * Require admin role. Verifies role from database to prevent
 * stale JWT issues (e.g., user promoted after login, or admin demoted).
 */
async function requireAdmin(req, res, next) {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(401).json({ error: "Authentication required." });

  // Quick check: JWT must claim admin
  if (decoded.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  // Verify from database: user must still exist and still be admin
  try {
    const user = await AuthService.getUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: "Account not found." });
    if (!user.isActive) return res.status(403).json({ error: "Account is deactivated." });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin access required. Your role may have changed — please log in again." });

    req.user = { ...decoded, verifiedRole: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth — sets req.user if valid token present.
 */
function optionalAuth(req, res, next) {
  const decoded = decodeToken(req);
  if (decoded) req.user = decoded;
  next();
}

/**
 * API key authentication.
 */
async function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"] || req.query.key;
  if (!apiKey) return res.status(401).json({ error: "API key required." });
  const user = await AuthService.getUserByApiKey(apiKey);
  if (!user) return res.status(401).json({ error: "Invalid API key." });
  req.user = user;
  req.apiKeyAuth = true;
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth, requireApiKey };
