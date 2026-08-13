"use strict";

const AuthService = require("../services/auth");

function extractToken(req) {
  if (req.cookies && req.cookies.cyrus_token) return req.cookies.cyrus_token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required. Please log in." });

  const decoded = AuthService.verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token. Please log in again." });

  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required." });

  const decoded = AuthService.verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token." });
  if (decoded.role !== "admin") return res.status(403).json({ error: "Admin access required." });

  req.user = decoded;
  next();
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

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
