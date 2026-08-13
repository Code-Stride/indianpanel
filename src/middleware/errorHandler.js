"use strict";

/**
 * Express error-handling middleware.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status >= 500 ? "Internal server error" : err.message);

  if (process.env.NODE_ENV !== "test") {
    console.error(`[ERROR] ${req.method} ${req.path} - ${status}: ${err.message}`);
    if (status >= 500) console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown API routes.
 */
function notFoundHandler(req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  }
  // For non-API 404s, send the SPA shell
  res.status(404).sendFile(require("path").join(__dirname, "../../public/index.html"));
}

module.exports = { errorHandler, notFoundHandler };
