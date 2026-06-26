const path = require("path");
const fs = require("fs");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    const dbPath = path.join(__dirname, "..", "..", "main", "database.json");
    const raw = fs.readFileSync(dbPath, "utf8");
    const data = JSON.parse(raw);
    return res.json({ status: true, creator: "core.api", data });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Gagal baca: " + e.message });
  }
};
