const axios = require("axios");
const UAParser = require("ua-parser-js");
const fs = require("fs");
const path = require("path");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LOG_FILE = path.join(__dirname, "..", "..", "data", "requests.jsonl");
const DB_FILE = path.join(__dirname, "..", "..", "main", "database.json");

const EXCLUDED_PATHS = [
  "/api/laporan",
  "/api/list",
  "/api/stats",
  "/api/chat",
  "/api/analytics",
  "/api/notifications",
  "/favicon.ico"
];

let registeredPaths = null;
let registeredPathsLoadedAt = 0;
const CACHE_TTL = 60000;

function loadRegisteredPaths() {
  const now = Date.now();
  if (registeredPaths && now - registeredPathsLoadedAt < CACHE_TTL) {
    return registeredPaths;
  }
  const set = new Set();
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    for (const apis of Object.values(db)) {
      for (const api of Object.values(apis)) {
        set.add("/" + api.path);
      }
    }
  } catch (e) {}
  registeredPaths = set;
  registeredPathsLoadedAt = now;
  return set;
}

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeRequestLog(entry) {
  ensureLogDir();
  fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", (err) => {
    if (err) console.error("Gagal nulis log request:", err.message);
  });
}

async function sendLog(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error("Gagal kirim log ke Telegram:", e.message);
  }
}

function apiLogger(req, res, next) {
  const start = Date.now();
  const isApiRequest = req.path.startsWith("/api/");
  const isExcluded = EXCLUDED_PATHS.some(p => req.path === p);
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2|ttf|map)$/.test(req.path);
  const isRegistered = loadRegisteredPaths().has(req.path);

  if (isApiRequest && !isExcluded && !isStaticAsset) {
    const ua = new UAParser(req.headers["user-agent"]).getResult();
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").replace("::ffff:", "");

    res.on("finish", () => {
      writeRequestLog({
        ts: Date.now(),
        path: req.path,
        status: res.statusCode,
        responseTimeMs: Date.now() - start,
        ip,
        ua: req.headers["user-agent"] || ""
      });
    });

    if (isRegistered) {
      const time = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const queryString = Object.keys(req.query).length
        ? Object.entries(req.query).map(([k, v]) => `${k}: ${v}`).join("\n▫️ ")
        : "-";

      const deviceInfo = `${ua.os.name || "Unknown"} ${ua.os.version || ""}`.trim();
      const browserInfo = ua.browser.name ? `${ua.browser.name} ${ua.browser.version || ""}`.trim() : "Unknown";

      const message =
        `🔔 *NEW REQUEST*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📍 *Endpoint*\n\`${req.path}\`\n\n` +
        `⚙️ *Method:* \`${req.method}\`\n\n` +
        `🔎 *Query Params*\n${queryString === "-" ? "▫️ -" : "▫️ " + queryString}\n\n` +
        `🌐 *IP Address*\n\`${ip}\`\n\n` +
        `💻 *Device*\n▫️ OS: ${deviceInfo}\n▫️ Browser: ${browserInfo}\n\n` +
        `🕒 *Time*\n${time} WIB\n` +
        `━━━━━━━━━━━━━━━━━━`;

      sendLog(message);
    }
  }

  next();
}

module.exports = apiLogger;
