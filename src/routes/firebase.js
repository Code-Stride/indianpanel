"use strict";

/**
 * Firebase proxy routes.
 * Server-side proxy for Firebase Realtime Database operations.
 */

const { Router } = require("express");
const FirebaseService = require("../services/firebase");
const { requireFields } = require("../middleware/validate");

const router = Router();

/**
 * POST /api/firebase/read
 * Read data from a Firebase path.
 *
 * Body: { url, key, path, params? }
 */
router.post("/read", requireFields("url", "key", "path"), async (req, res, next) => {
  try {
    const { url, key, path, params } = req.body;
    const data = await FirebaseService.read(url, key, path, params || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/firebase/write
 * Write data to a Firebase path.
 *
 * Body: { url, key, path, data }
 */
router.post("/write", requireFields("url", "key", "path", "data"), async (req, res, next) => {
  try {
    const { url, key, path, data } = req.body;
    const result = await FirebaseService.write(url, key, path, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/firebase/update
 * Update (PATCH) data at a Firebase path.
 *
 * Body: { url, key, path, data }
 */
router.post("/update", requireFields("url", "key", "path", "data"), async (req, res, next) => {
  try {
    const { url, key, path, data } = req.body;
    const result = await FirebaseService.update(url, key, path, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/firebase/delete
 * Delete data at a Firebase path.
 *
 * Body: { url, key, path }
 */
router.post("/delete", requireFields("url", "key", "path"), async (req, res, next) => {
  try {
    const { url, key, path } = req.body;
    const result = await FirebaseService.remove(url, key, path);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
