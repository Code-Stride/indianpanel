"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { getDatabase } = require("../database");
const config = require("../config");

const SALT_ROUNDS = 12;
const JWT_EXPIRY = "7d";

let _usersDb = null;
async function db() {
  if (!_usersDb) _usersDb = await getDatabase("users");
  return _usersDb;
}

class AuthService {
  static async bootstrapAdmin() {
    const adminUser = config.admin.username;
    const adminPass = config.admin.password;
    if (!adminUser || !adminPass) return;

    const usersDb = await db();
    const existing = await usersDb.findOne({ username: adminUser });
    if (existing) {
      if (existing.role !== "admin") {
        await usersDb.update(existing.id, { role: "admin" });
        console.log(`  👑 Promoted ${adminUser} to admin`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPass, SALT_ROUNDS);
    await usersDb.insert({
      username: adminUser,
      email: config.admin.email || `${adminUser}@admin.local`,
      password: hashedPassword,
      apiKey: AuthService.generateApiKey(),
      role: "admin",
      avatar: "", bio: "System Administrator", phone: "",
      isActive: true, lastLogin: null,
    });
    console.log(`  👑 Admin account created: ${adminUser}`);
  }

  static async register({ username, email, password }) {
    if (!username || username.length < 3)
      throw Object.assign(new Error("Username must be at least 3 characters"), { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw Object.assign(new Error("Valid email is required"), { status: 400 });
    if (!password || password.length < 6)
      throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });

    const usersDb = await db();
    if (await usersDb.findOne({ username }))
      throw Object.assign(new Error("Username already taken"), { status: 409 });
    if (await usersDb.findOne({ email }))
      throw Object.assign(new Error("Email already registered"), { status: 409 });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const apiKey = AuthService.generateApiKey();

    const allUsers = await usersDb.findAll();
    const isFirstUser = allUsers.length === 0;
    const role = isFirstUser ? "admin" : "user";

    const user = await usersDb.insert({
      username, email, password: hashedPassword, apiKey, role,
      avatar: "", bio: "", phone: "", isActive: true, lastLogin: null,
    });

    if (isFirstUser) console.log(`  👑 First user "${username}" registered as admin`);
    return AuthService.sanitizeUser(user);
  }

  static async login({ login, password }) {
    if (!login || !password)
      throw Object.assign(new Error("Login and password are required"), { status: 400 });

    const usersDb = await db();
    const user = (await usersDb.findOne({ username: login })) || (await usersDb.findOne({ email: login }));
    if (!user) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    if (!user.isActive) throw Object.assign(new Error("Account is deactivated. Contact admin."), { status: 403 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

    await usersDb.update(user.id, { lastLogin: new Date().toISOString() });
    return { user: AuthService.sanitizeUser(user), token: AuthService.generateToken(user) };
  }

  static generateToken(user) {
    return jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.session.secret, { expiresIn: JWT_EXPIRY }
    );
  }

  static verifyToken(token) {
    try { return jwt.verify(token, config.session.secret); } catch { return null; }
  }

  static generateApiKey() { return "cp_" + crypto.randomBytes(24).toString("hex"); }

  static async regenerateApiKey(userId) {
    const newKey = AuthService.generateApiKey();
    await (await db()).update(userId, { apiKey: newKey });
    return newKey;
  }

  static async updateProfile(userId, updates) {
    const allowed = ["avatar", "bio", "phone", "email"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    const updated = await (await db()).update(userId, safe);
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return AuthService.sanitizeUser(updated);
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const usersDb = await db();
    const user = await usersDb.findOne({ id: userId });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    if (!(await bcrypt.compare(currentPassword, user.password)))
      throw Object.assign(new Error("Current password is incorrect"), { status: 401 });
    if (!newPassword || newPassword.length < 6)
      throw Object.assign(new Error("New password must be at least 6 characters"), { status: 400 });
    await usersDb.update(userId, { password: await bcrypt.hash(newPassword, SALT_ROUNDS) });
    return true;
  }

  static async getUserById(userId) {
    const user = await (await db()).findOne({ id: userId });
    return user ? AuthService.sanitizeUser(user) : null;
  }

  static async getUserByApiKey(apiKey) {
    const user = await (await db()).findOne({ apiKey });
    return user ? AuthService.sanitizeUser(user) : null;
  }

  static async listAllUsers() {
    return (await (await db()).findAll()).map(AuthService.sanitizeUser);
  }

  static async toggleUserActive(userId) {
    const usersDb = await db();
    const user = await usersDb.findOne({ id: userId });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    return AuthService.sanitizeUser(await usersDb.update(userId, { isActive: !user.isActive }));
  }

  static async setUserRole(userId, role) {
    if (!["user", "admin"].includes(role))
      throw Object.assign(new Error("Invalid role"), { status: 400 });
    const updated = await (await db()).update(userId, { role });
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return AuthService.sanitizeUser(updated);
  }

  static async deleteUser(userId) { return (await db()).delete(userId); }

  static sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
  }
}

module.exports = AuthService;
