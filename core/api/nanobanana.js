const axios = require("axios");
const crypto = require("crypto");

const CONFIG = {
  UA: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  TIMEOUT: 60000,
  MAX_RETRIES: 3,
  AES_KEY: Buffer.from("651cc172938d5b7799a23ac245e539a6", "utf-8"),
  AES_IV: Buffer.from("35e5cd2d684e5c65", "utf-8"),
  SOFT_ID: "imgedit_web",
  DRAW_HOST: "https://imgedit.ai",
  UPLOAD_HOST: "https://upload.imgedit.ai"
};

const HDR = {
  "Content-Type": "application/json",
  "Origin": "https://imgedit.ai",
  "Referer": "https://imgedit.ai/",
  "User-Agent": CONFIG.UA
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateEkey() {
  const l1 = ["a","d","g","h","k","o","4","5","6","7","8"];
  const l2 = ["0","1","2","3","8","9","a","b","c","d","u","i","o","p","m","n"];
  let s = String(Math.floor(Math.random() * 3000) + 7000);
  for (let i = 0; i < 4; i++) s += l1[Math.floor(Math.random() * l1.length)];
  for (let i = 0; i < 4; i++) s += l2[Math.floor(Math.random() * l2.length)];
  s += String(1000 + Math.floor(Math.random() * 3000));
  return s;
}

function decrypt(data) {
  if (!data) return null;
  try {
    const dec = crypto.createDecipheriv("aes-256-cbc", CONFIG.AES_KEY, CONFIG.AES_IV);
    const ct = Buffer.from(data, "base64");
    const out = Buffer.concat([dec.update(ct), dec.final()]);
    return JSON.parse(out.toString("utf-8"));
  } catch (e) {
    return null;
  }
}

function commonParams() {
  return { ekey: generateEkey(), soft_id: CONFIG.SOFT_ID };
}

function detectMime(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  return "image/jpeg";
}

async function requestWithRetry(config, label, attempts = CONFIG.MAX_RETRIES) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await axios({
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true,
        ...config
      });
      return response;
    } catch (e) {
      lastError = e;
      if (i === attempts) throw new Error(`${label} gagal: ${e.message}`);
      await sleep(1000 * i);
    }
  }
  throw lastError;
}

async function downloadAsBase64(url) {
  const response = await requestWithRetry({
    method: "get",
    url: url,
    responseType: "arraybuffer",
    maxRedirects: 5,
    headers: { "User-Agent": CONFIG.UA }
  }, "download image");

  const buf = Buffer.from(response.data);
  const mime = detectMime(buf);
  return `data:${mime};base64,` + buf.toString("base64");
}

async function uploadBase64(dataUri) {
  const response = await requestWithRetry({
    method: "post",
    url: `${CONFIG.UPLOAD_HOST}/api/v1/files/uploadImgs`,
    data: { files_base64: dataUri },
    params: commonParams(),
    headers: HDR
  }, "upload image");

  const payload = decrypt(response.data && response.data.data);
  if (!payload || payload.code !== 0) {
    const msg = (payload && payload.msg) || (response.data && response.data.msg) || "Upload gagal";
    throw new Error(`Upload error: ${msg}`);
  }
  const paths = payload.data && payload.data.paths;
  if (!Array.isArray(paths) || !paths.length) {
    throw new Error("Upload tidak mengembalikan path gambar");
  }
  return paths[0];
}

async function createNanoTask(imageKey, prompt) {
  const body = {
    layout: 9,
    action: 145,
    prompt_text: prompt,
    image_key_type: 3,
    task_params: { input_image: [imageKey] }
  };

  const response = await requestWithRetry({
    method: "post",
    url: `${CONFIG.DRAW_HOST}/api/v1/draw-task/nano`,
    data: body,
    params: commonParams(),
    headers: HDR
  }, "create task");

  const payload = decrypt(response.data && response.data.data);
  if (!payload || payload.code !== 0) {
    const msg = (payload && payload.msg) || (response.data && response.data.msg) || "Create task gagal";
    throw new Error(`Create task error: ${msg}`);
  }
  const serialNo = payload.data && payload.data.serial_no;
  if (!serialNo) throw new Error("Task tidak mengembalikan serial_no");
  return serialNo;
}

async function pollTask(serialNo, { maxTries = 90, intervalMs = 2000 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    await sleep(intervalMs);

    const response = await requestWithRetry({
      method: "get",
      url: `${CONFIG.DRAW_HOST}/api/v1/draw-task/${serialNo}`,
      params: commonParams(),
      headers: HDR
    }, "poll task");

    const payload = decrypt(response.data && response.data.data);
    const detail = payload && payload.data && payload.data.detail;
    if (!detail) continue;

    if (detail.status === 2) {
      let paths;
      try { paths = JSON.parse(detail.path); } catch (e) { paths = null; }
      if (!Array.isArray(paths) || !paths.length) {
        throw new Error("Task selesai tapi path kosong");
      }
      return paths;
    }
    if (detail.status === 3) {
      throw new Error("Task gagal: " + (detail.fail_msg || "unknown"));
    }
  }
  throw new Error("Task timeout — tidak selesai dalam waktu yang ditentukan");
}

async function nanoBananaEditor(imageUrl, prompt) {
  if (!imageUrl) throw new Error("url wajib diisi");
  if (!prompt) throw new Error("prompt wajib diisi");

  const dataUri = await downloadAsBase64(imageUrl);
  const imageKey = await uploadBase64(dataUri);
  const serial = await createNanoTask(imageKey, prompt);
  const results = await pollTask(serial);

  return {
    serial_no: serial,
    image_key: imageKey,
    prompt: prompt,
    source_image: imageUrl,
    images: results,
    image: results[0]
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url, prompt } = req.query;

  if (!url) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'url' wajib diisi"
    }, null, 2));
  }
  if (!prompt) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'prompt' wajib diisi"
    }, null, 2));
  }

  try {
    const result = await nanoBananaEditor(url, prompt);

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result
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
