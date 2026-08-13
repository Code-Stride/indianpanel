"use strict";

/**
 * JWT Authentication middleware.
 * Extracts and verifies JWT tokens from cookies or Authorization header.
 */

const AuthService = require("../services/auth");

/**
 * Require authentication. Rejects unauthenticated requests.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication. Sets req.user if token is valid, continues otherwise.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

/**
 * API key authentication for the OTP API.
 * Checks X-API-Key header or ?key= query parameter.
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"] || req.query.key;
  if (!apiKey) {
    return res.status(401).json({ error: "API key required. Pass it as X-API-Key header or ?key= parameter." });
  }

  const user = AuthService.getUserByApiKey(apiKey);
  if (!user) {
    return res.status(401).json({ error: "Invalid API key." });
  }

  req.user = user;
  req.apiKeyAuth = true;
  next();
}

/**
 * Optional API key auth — if key provided, validate it.
 */
function optionalApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"] || req.query.key;
  if (apiKey) {
    const user = AuthService.getUserByApiKey(apiKey);
    if (user) {
      req.user = user;
      req.apiKeyAuth = true;
    }
  }
  next();
}

/**
 * Extract JWT token from cookie or Authorization header.
 */
function extractToken(req) {
  // Check cookie first
  if (req.cookies && req.cookies.cyrus_token) {
    return req.cookies.cyrus_token;
  }

  // Check Authorization header
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  return null;
}

module.exports = { requireAuth, optionalAuth, requireApiKey, optionalApiKey };
