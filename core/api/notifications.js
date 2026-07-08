const fs = require("fs");
const path = require("path");

const NOTIF_FILE = path.join(__dirname, "..", "..", "data", "notifikasi.json");

function ensureNotifFile() {
  const dir = path.dirname(NOTIF_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(NOTIF_FILE)) fs.writeFileSync(NOTIF_FILE, "[]");
}

function loadNotifs() {
  ensureNotifFile();
  try {
    return JSON.parse(fs.readFileSync(NOTIF_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    const notifs = loadNotifs();
    const sorted = notifs.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result: sorted
    }, null, 2));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: e.message
    }, null, 2));
  }
};
