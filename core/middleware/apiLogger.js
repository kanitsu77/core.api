const axios = require("axios");
const UAParser = require("ua-parser-js");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
  if (req.path.startsWith("/api") && req.path !== "/api/laporan") {
    const ua = new UAParser(req.headers["user-agent"]).getResult();
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").replace("::ffff:", "");
    const time = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const queryString = Object.keys(req.query).length
      ? Object.entries(req.query).map(([k, v]) => `${k}=${v}`).join(", ")
      : "-";

    const message = `📡 *Endpoint Used*\n\n` +
      `🔗 *Endpoint:* \`${req.path}\`\n` +
      `🔍 *Query:* ${queryString}\n` +
      `🌐 *IP:* \`${ip}\`\n` +
      `📱 *Method:* ${req.method}\n` +
      `📲 *Device:* ${ua.os.name || "Unknown"} ${ua.os.version || ""} · ${ua.browser.name || "Unknown"}\n` +
      `🕒 *Waktu:* ${time} WIB`;

    sendLog(message);
  }
  next();
}

module.exports = apiLogger;
