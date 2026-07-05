const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "data");
const LOG_FILE = path.join(LOG_DIR, "requests.jsonl");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const EXCLUDED_PATHS = ["/api/analytics", "/api/stats", "/api/laporan", "/api/list", "/favicon.ico"];

function requestTracker(req, res, next) {
  if (!req.path.startsWith("/api/") || EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  const start = Date.now();

  res.on("finish", () => {
    const entry = {
      ts: start,
      method: req.method,
      path: req.path,
      ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").replace("::ffff:", ""),
      status: res.statusCode,
      responseTimeMs: Date.now() - start,
      ua: req.headers["user-agent"] || ""
    };

    fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", (err) => {
      if (err) console.error("Gagal menulis request log:", err.message);
    });
  });

  next();
}

module.exports = requestTracker;
