const axios = require("axios");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendLog(data) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: data,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error("Gagal kirim log ke Telegram:", e.message);
  }
}

function apiLogger(req, res, next) {
  if (req.path.startsWith("/api") && req.path !== "/api/laporan") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] || "unknown";
    const method = req.method;
    const endpoint = req.originalUrl;
    const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const message = `📡 *Endpoint Used*\n\n` +
      `🔗 Endpoint: \`${endpoint}\`\n` +
      `🌐 IP: \`${ip}\`\n` +
      `📱 Method: \`${method}\`\n` +
      `🕒 Waktu: ${time}\n` +
      `🧭 User-Agent: \`${userAgent}\``;

    sendLog(message);
  }
  next();
}

module.exports = apiLogger;
