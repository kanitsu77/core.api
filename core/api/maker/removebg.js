const axios = require("axios");
const FormData = require("form-data");

class BgRemover {
  constructor() {
    this.token = "f81bc59e849e883ad50a876988956dbf";
    this.base = "https://img.caapis.com";
    this.ax = axios.create({ headers: { "User-Agent": "okhttp/4.11.0" } });
  }

  async fetchUrlToBuffer(url) {
    const { data } = await this.ax.get(url, { responseType: "arraybuffer" });
    return Buffer.from(data);
  }

  async up(buffer) {
    const form = new FormData();
    form.append("file_type", "bg_remover");
    form.append("file", buffer, { filename: "image.jpg" });
    form.append("hash", "");

    const { data } = await this.ax.post(`${this.base}/fileupload_new`, form, { headers: form.getHeaders() });
    return data?.hash || null;
  }

  async proc(hash) {
    const form = new FormData();
    form.append("access_token", this.token);
    form.append("hash", hash);

    const { data } = await this.ax.post(`${this.base}/image_bg_remove`, form, { headers: form.getHeaders() });
    return data?.download_url || null;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: "Nixx",
        message: "Parameter 'url' diperlukan"
      });
    }

    const api = new BgRemover();
    const buffer = await api.fetchUrlToBuffer(url);
    const hash = await api.up(buffer);

    if (!hash) throw new Error("Gagal mendapatkan hash upload");

    const resultUrl = await api.proc(hash);
    if (!resultUrl) throw new Error("Gagal menghapus background");

    return res.json({
      status: true,
      creator: "Nixx",
      result: {
        url: resultUrl
      }
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
