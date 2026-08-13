"use strict";

/**
 * Authentication service.
 * Handles user registration, login, JWT tokens, and API key generation.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Database = require("../database");
const config = require("../config");

const usersDb = new Database("users");

const SALT_ROUNDS = 12;
const JWT_EXPIRY = "7d";

class AuthService {
  /**
   * Register a new user.
   */
  static async register({ username, email, password }) {
    // Validate inputs
    if (!username || username.length < 3) {
      throw Object.assign(new Error("Username must be at least 3 characters"), { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error("Valid email is required"), { status: 400 });
    }
    if (!password || password.length < 6) {
      throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
    }

    // Check uniqueness
    if (usersDb.findOne({ username })) {
      throw Object.assign(new Error("Username already taken"), { status: 409 });
    }
    if (usersDb.findOne({ email })) {
      throw Object.assign(new Error("Email already registered"), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const apiKey = AuthService.generateApiKey();

    const user = usersDb.insert({
      username,
      email,
      password: hashedPassword,
      apiKey,
      role: "user",
      avatar: "",
      bio: "",
      phone: "",
      isActive: true,
      lastLogin: null,
    });

    return AuthService.sanitizeUser(user);
  }

  /**
   * Login a user with username/email + password.
   */
  static async login({ login, password }) {
    if (!login || !password) {
      throw Object.assign(new Error("Login and password are required"), { status: 400 });
    }

    const user = usersDb.findOne({ username: login }) || usersDb.findOne({ email: login });
    if (!user) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }
    if (!user.isActive) {
      throw Object.assign(new Error("Account is deactivated"), { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }

    // Update last login
    usersDb.update(user.id, { lastLogin: new Date().toISOString() });

    const token = AuthService.generateToken(user);
    return {
      user: AuthService.sanitizeUser(user),
      token,
    };
  }

  /**
   * Generate a JWT token for a user.
   */
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      config.session.secret,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Verify a JWT token.
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.session.secret);
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique API key.
   */
  static generateApiKey() {
    return "cp_" + crypto.randomBytes(24).toString("hex");
  }

  /**
   * Regenerate a user's API key.
   */
  static regenerateApiKey(userId) {
    const newKey = AuthService.generateApiKey();
    usersDb.update(userId, { apiKey: newKey });
    return newKey;
  }

  /**
   * Update user profile fields.
   */
  static updateProfile(userId, updates) {
    const allowed = ["avatar", "bio", "phone", "email"];
    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }
    const updated = usersDb.update(userId, safeUpdates);
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return AuthService.sanitizeUser(updated);
  }

  /**
   * Change password.
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = usersDb.findOne({ id: userId });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw Object.assign(new Error("Current password is incorrect"), { status: 401 });

    if (!newPassword || newPassword.length < 6) {
      throw Object.assign(new Error("New password must be at least 6 characters"), { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    usersDb.update(userId, { password: hashed });
    return true;
  }

  /**
   * Get user by ID (sanitized).
   */
  static getUserById(userId) {
    const user = usersDb.findOne({ id: userId });
    if (!user) return null;
    return AuthService.sanitizeUser(user);
  }

  /**
   * Get user by API key.
   */
  static getUserByApiKey(apiKey) {
    const user = usersDb.findOne({ apiKey });
    if (!user) return null;
    return AuthService.sanitizeUser(user);
  }

  /**
   * Remove sensitive fields from user object.
   */
  static sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
  }
}

module.exports = AuthService;
