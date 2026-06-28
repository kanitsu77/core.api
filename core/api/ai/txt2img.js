const axios = require("axios");
const crypto = require("crypto");

class NanoBananaAI {
  constructor() {
    this.key = "nV2t6sQ8JzWyXCMkURa4BEfDq1oZLgMb";
    this.iv = "W9pYdK3eRuBvMzQ2";
    this.pkg = "com.nano.art.ai.generator";
    this.devId = crypto.randomBytes(8).toString("hex");
    this.fcm = `${crypto.randomBytes(16).toString("base64url")}:${crypto.randomBytes(100).toString("base64url")}`;
    this.base = "https://nano-banana.leansoft-ai.com";
  }

  auth() {
    const now = Math.floor(Date.now() / 1e3);
    const exp = now + 60;
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.key, "utf8"), Buffer.from(this.iv, "utf8"));
    return Buffer.concat([cipher.update(`${now}||${this.pkg}||${exp}`, "utf8"), cipher.final()]).toString("base64");
  }

  hdrs(extra = {}) {
    return {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "x-client-auth": this.auth(),
      "device-id": this.devId,
      "app-user-id": "",
      "app-version": "1.7.4",
      "version-code": "74",
      "language-code": "en",
      "app-id": this.pkg,
      "os-type": "android",
      ...extra
    };
  }

  async generate(prompt) {
    const res = await axios.post(`${this.base}/image/createTask`, {
      materialId: prompt,
      ratio: "1:1"
    }, {
      headers: this.hdrs({
        "Content-Type": "application/json",
        fcm_token: this.fcm
      })
    });

    const taskId = res.data?.data?.taskId;
    if (!taskId) {
      throw new Error(`Gagal memperoleh ID Task: ${JSON.stringify(res.data)}`);
    }

    return await this.poll(taskId);
  }

  async poll(taskId) {
    for (let i = 0; i < 30; i++) {
      try {
        const res = await axios.post(`${this.base}/image/checkTask`, {
          accessKey: "",
          is_regenerate: false,
          model_type: "v_fuse",
          secretKey: "",
          taskId
        }, {
          headers: this.hdrs({ "Content-Type": "application/json" })
        });

        const data = res.data?.data || {};
        const state = data.state || "processing";

        if (state === "success" && data.resultJson) {
          const urls = JSON.parse(data.resultJson)?.resultUrls || [];
          return { taskId, urls };
        }

        if (state === "failed") {
          throw new Error("Pemrosesan task digagalkan oleh server");
        }
      } catch (err) {
        if (err.message === "Pemrosesan task digagalkan oleh server") throw err;
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    throw new Error("Timeout: polling antrean berakhir");
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {  

    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: "Nixx",
        message: "Parameter 'prompt' diperlukan"
      });
    }

    const api = new NanoBananaAI();
    const result = await api.generate(prompt);

    return res.json({
      status: true,
      creator: "Nixx",
      result
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Terjadi kesalahan",
      error: e.message
    });
  }
};
