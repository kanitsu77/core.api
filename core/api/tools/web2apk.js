const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

class Web2ApkService {
  constructor({ apiUrl = "https://webappcreator.amethystlab.org/api/build-apk", baseUrl = "https://webappcreator.amethystlab.org" } = {}) {
    this.apiUrl = apiUrl;
    this.baseUrl = baseUrl;
  }

  isValidUrl(url) {
    return /^https?:\/\//i.test(url);
  }

  buildPackageName(appName) {
    const cleaned = appName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `com.${cleaned || "app"}.web2apk`;
  }

  saveIconBuffer(buffer) {
    const tempDir = path.join(os.tmpdir(), "web2apk");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const iconPath = path.join(tempDir, `icon_${Date.now()}.png`);
    fs.writeFileSync(iconPath, buffer);
    return iconPath;
  }

  async build({ url, appName, iconBuffer, versionName = "1.0.0", versionCode = 1 }) {
    if (!this.isValidUrl(url)) {
      throw new Error("URL harus diawali dengan http:// atau https://");
    }
    if (!appName) {
      throw new Error("Nama aplikasi tidak boleh kosong.");
    }
    if (!iconBuffer) {
      throw new Error("Icon aplikasi wajib disertakan.");
    }

    const packageName = this.buildPackageName(appName);
    const iconPath = this.saveIconBuffer(iconBuffer);

    try {
      const FormDataNode = require("form-data");
      const form = new FormDataNode();

      form.append("websiteUrl", url);
      form.append("appName", appName);
      form.append("icon", fs.createReadStream(iconPath));
      form.append("packageName", packageName);
      form.append("versionName", versionName);
      form.append("versionCode", versionCode);

      const response = await axios.post(this.apiUrl, form, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": this.baseUrl,
          "Referer": `${this.baseUrl}/`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Gagal mem-build APK dari server.");
      }

      return {
        success: true,
        appName,
        packageName,
        downloadUrl: `${this.baseUrl}${data.downloadUrl}`
      };
    } finally {
      if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
    }
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url, appName, icon } = req.query;

  if (!url) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'url' wajib diisi"
    }, null, 2));
  }
  if (!appName) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'appName' wajib diisi"
    }, null, 2));
  }
  if (!icon) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'icon' (URL gambar icon) wajib diisi"
    }, null, 2));
  }

  try {
    const iconRes = await axios.get(icon, { responseType: "arraybuffer" });
    const iconBuffer = Buffer.from(iconRes.data);

    const service = new Web2ApkService();
    const result = await service.build({ url, appName, iconBuffer });

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
