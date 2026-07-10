const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "..", "uploads");
const META_FILE = path.join(__dirname, "..", "..", "..", "data", "uploads_meta.json");
const MAX_SIZE = 50 * 1024 * 1024;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

function ensureDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const metaDir = path.dirname(META_FILE);
  if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir, { recursive: true });
  if (!fs.existsSync(META_FILE)) fs.writeFileSync(META_FILE, "{}");
}

function loadMeta() {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveMeta(meta) {
  ensureDirs();
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirs();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname) || "";
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => cb(null, true)
});

const handler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  upload.single("file")(req, res, (err) => {
    if (err) {
      res.statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        error: err.code === "LIMIT_FILE_SIZE"
          ? "File terlalu besar, maksimal 50MB"
          : err.message
      }, null, 2));
    }

    if (!req.file) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        error: "Parameter 'file' wajib diisi (multipart/form-data)"
      }, null, 2));
    }

    const meta = loadMeta();
    const now = Date.now();
    const expiresAt = now + EXPIRY_MS;

    meta[req.file.filename] = {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: now,
      expiresAt
    };
    saveMeta(meta);

    const base = `${req.protocol}://${req.get("host")}`;

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `${base}/uploads/${req.file.filename}`,
        uploadedAt: new Date(now).toISOString(),
        expiresAt: new Date(expiresAt).toISOString()
      }
    }, null, 2));
  });
};

function cleanupExpired() {
  ensureDirs();
  const meta = loadMeta();
  const now = Date.now();
  let changed = false;

  for (const [filename, info] of Object.entries(meta)) {
    if (info.expiresAt < now) {
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      delete meta[filename];
      changed = true;
    }
  }

  if (changed) saveMeta(meta);
}

module.exports = handler;
module.exports.cleanupExpired = cleanupExpired;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
