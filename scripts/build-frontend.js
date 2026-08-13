#!/usr/bin/env node
"use strict";

/**
 * Build script: prepares the public/ directory for the Express server.
 *
 * Copies the monolithic index.html and all route assets into public/
 * so the server can serve them as static files.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

// Directories to copy
const COPY_DIRS = [
  "dashboard",
  "settings",
  "accounts",
  "get-accounts",
  "profile",
  "about",
  "support",
  "privacy",
  "terms",
  "copyright",
  "changelog",
  "status",
  "docs",
  "route-assets",
  "logo-options",
  "login",
  "register",
  "connections",
  "assets",
];

// Individual files to copy
const COPY_FILES = [
  "index.html",
  "pronxt-logo.svg",
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log("🔨 Building public/ directory...\n");

  let fileCount = 0;

  // Ensure public/ and public/js/ exist (js/ holds our custom client files)
  fs.mkdirSync(PUBLIC, { recursive: true });
  fs.mkdirSync(path.join(PUBLIC, "js"), { recursive: true });

  // Copy custom client-side JavaScript files
  const clientJsDir = path.join(ROOT, "client-js");
  if (fs.existsSync(clientJsDir)) {
    for (const file of fs.readdirSync(clientJsDir)) {
      fs.copyFileSync(path.join(clientJsDir, file), path.join(PUBLIC, "js", file));
      fileCount++;
      console.log(`  ✅ js/${file}`);
    }
  }

  // Copy files
  for (const file of COPY_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(PUBLIC, file));
      fileCount++;
      console.log(`  ✅ ${file}`);
    }
  }

  // Copy directories
  for (const dir of COPY_DIRS) {
    const src = path.join(ROOT, dir);
    const dest = path.join(PUBLIC, dir);
    if (fs.existsSync(src)) {
      // Remove old directory first
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      copyRecursive(src, dest);
      const count = countFiles(dest);
      fileCount += count;
      console.log(`  ✅ ${dir}/ (${count} files)`);
    }
  }

  console.log(`\n✨ Build complete: ${fileCount} files in public/\n`);
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

build();
