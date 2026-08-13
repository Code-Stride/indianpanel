"use strict";

/**
 * Authentication service.
 * Handles user registration, login, JWT tokens, and API key generation.
 *
 * Admin seeding:
 *   - First registered user automatically gets role: "admin"
 *   - .env ADMIN_USERNAME + ADMIN_PASSWORD can bootstrap/recover admin
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
   * Bootstrap admin from .env if configured and no admin exists.
   * Called once on server startup.
   */
  static async bootstrapAdmin() {
    const adminUser = config.admin.username;
    const adminPass = config.admin.password;
    if (!adminUser || !adminPass) return;

    // Check if this admin already exists
    const existing = usersDb.findOne({ username: adminUser });
    if (existing) {
      // Ensure they have admin role
      if (existing.role !== "admin") {
        usersDb.update(existing.id, { role: "admin" });
        console.log(`  👑 Promoted ${adminUser} to admin`);
      }
      return;
    }

    // Create admin from env
    const hashedPassword = await bcrypt.hash(adminPass, SALT_ROUNDS);
    usersDb.insert({
      username: adminUser,
      email: config.admin.email || `${adminUser}@admin.local`,
      password: hashedPassword,
      apiKey: AuthService.generateApiKey(),
      role: "admin",
      avatar: "",
      bio: "System Administrator",
      phone: "",
      isActive: true,
      lastLogin: null,
    });
    console.log(`  👑 Admin account created: ${adminUser}`);
  }

  /**
   * Register a new user.
   * First user to register automatically gets admin role.
   */
  static async register({ username, email, password }) {
    if (!username || username.length < 3) {
      throw Object.assign(new Error("Username must be at least 3 characters"), { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error("Valid email is required"), { status: 400 });
    }
    if (!password || password.length < 6) {
      throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
    }

    if (usersDb.findOne({ username })) {
      throw Object.assign(new Error("Username already taken"), { status: 409 });
    }
    if (usersDb.findOne({ email })) {
      throw Object.assign(new Error("Email already registered"), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const apiKey = AuthService.generateApiKey();

    // First user = admin
    const allUsers = usersDb.findAll();
    const isFirstUser = allUsers.length === 0;
    const role = isFirstUser ? "admin" : "user";

    const user = usersDb.insert({
      username,
      email,
      password: hashedPassword,
      apiKey,
      role,
      avatar: "",
      bio: "",
      phone: "",
      isActive: true,
      lastLogin: null,
    });

    if (isFirstUser) {
      console.log(`  👑 First user "${username}" registered as admin`);
    }

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
      throw Object.assign(new Error("Account is deactivated. Contact admin."), { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }

    usersDb.update(user.id, { lastLogin: new Date().toISOString() });

    const token = AuthService.generateToken(user);
    return {
      user: AuthService.sanitizeUser(user),
      token,
    };
  }

  static generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.session.secret,
      { expiresIn: JWT_EXPIRY }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.session.secret);
    } catch {
      return null;
    }
  }

  static generateApiKey() {
    return "cp_" + crypto.randomBytes(24).toString("hex");
  }

  static regenerateApiKey(userId) {
    const newKey = AuthService.generateApiKey();
    usersDb.update(userId, { apiKey: newKey });
    return newKey;
  }

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

  static getUserById(userId) {
    const user = usersDb.findOne({ id: userId });
    if (!user) return null;
    return AuthService.sanitizeUser(user);
  }

  static getUserByApiKey(apiKey) {
    const user = usersDb.findOne({ apiKey });
    if (!user) return null;
    return AuthService.sanitizeUser(user);
  }

  // ─── Admin user management ────────────────────────────

  static listAllUsers() {
    return usersDb.findAll().map((u) => AuthService.sanitizeUser(u));
  }

  static toggleUserActive(userId) {
    const user = usersDb.findOne({ id: userId });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    const updated = usersDb.update(userId, { isActive: !user.isActive });
    return AuthService.sanitizeUser(updated);
  }

  static setUserRole(userId, role) {
    if (!["user", "admin"].includes(role)) {
      throw Object.assign(new Error("Invalid role"), { status: 400 });
    }
    const updated = usersDb.update(userId, { role });
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return AuthService.sanitizeUser(updated);
  }

  static deleteUser(userId) {
    return usersDb.delete(userId);
  }

  static sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
  }
}

module.exports = AuthService;
