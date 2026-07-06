const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

const BUILD_DB = path.join(__dirname, "..", "..", "database", "web2apk_builds.json");

function ensureBuildDB() {
  const dir = path.dirname(BUILD_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(BUILD_DB)) fs.writeFileSync(BUILD_DB, "{}");
}

function loadBuilds() {
  ensureBuildDB();
  try {
    return JSON.parse(fs.readFileSync(BUILD_DB, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveBuilds(data) {
  ensureBuildDB();
  fs.writeFileSync(BUILD_DB, JSON.stringify(data, null, 2));
}

function getBuild(projectId) {
  const builds = loadBuilds();
  return builds[projectId];
}

function saveBuild(projectId, data) {
  const builds = loadBuilds();
  builds[projectId] = { ...builds[projectId], ...data };
  saveBuilds(builds);
}

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
    if (!this.isValidUrl(url)) throw new Error("URL harus diawali dengan http:// atau https://");
    if (!appName) throw new Error("Nama aplikasi tidak boleh kosong.");
    if (!iconBuffer) throw new Error("Icon aplikasi wajib disertakan.");

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
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": this.baseUrl,
          "Referer": `${this.baseUrl}/`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const data = response.data;

      if (data.queued) {
        return {
          queued: true,
          projectId: data.projectId,
          statusUrl: data.statusUrl,
          position: data.queueInfo?.position || "?",
          estimatedWaitTime: data.estimatedWaitTime,
          message: data.message
        };
      }

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

  async checkStatus(statusUrl) {
    const response = await axios.get(`${this.baseUrl}${statusUrl}`);
    return response.data;
  }
}

async function pollBuildStatus(projectId, statusUrl, maxRetries = 60, interval = 5000) {
  const service = new Web2ApkService();
  let retries = 0;

  const poll = async () => {
    try {
      const status = await service.checkStatus(statusUrl);

      if (status.success) {
        const downloadUrl = `${service.baseUrl}${status.downloadUrl}`;
        saveBuild(projectId, {
          status: "completed",
          downloadUrl,
          completedAt: new Date().toISOString()
        });
        console.log(`[Web2APK] Build ${projectId} completed:`, downloadUrl);
        return;
      }

      if (status.building) {
        saveBuild(projectId, {
          status: "building",
          progress: status.buildProgress || 0,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Web2APK] Build ${projectId} progress:`, status.buildProgress);
      } else if (status.queued) {
        saveBuild(projectId, {
          status: "queued",
          position: status.queueInfo?.position,
          updatedAt: new Date().toISOString()
        });
      }

      retries++;
      if (retries < maxRetries) {
        setTimeout(poll, interval);
      } else {
        saveBuild(projectId, {
          status: "timeout",
          error: "Build timeout after " + (maxRetries * interval / 1000) + "s"
        });
        console.log(`[Web2APK] Build ${projectId} timeout`);
      }
    } catch (e) {
      saveBuild(projectId, {
        status: "error",
        error: e.message
      });
      console.error(`[Web2APK] Build ${projectId} error:`, e.message);
    }
  };

  poll();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url, appName, icon } = req.query;

  if (!url || !appName || !icon) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'url', 'appName', 'icon' wajib diisi"
    }, null, 2));
  }

  try {
    const iconRes = await axios.get(icon, { responseType: "arraybuffer" });
    const iconBuffer = Buffer.from(iconRes.data);

    const service = new Web2ApkService();
    const result = await service.build({ url, appName, iconBuffer });

    if (result.queued) {
      const projectId = result.projectId;
      const statusUrl = result.statusUrl;

      saveBuild(projectId, {
        appName,
        url,
        createdAt: new Date().toISOString(),
        status: "queued",
        position: result.position,
        estimatedWaitTime: result.estimatedWaitTime
      });

      pollBuildStatus(projectId, statusUrl);

      res.end(JSON.stringify({
        status: true,
        creator: "Nixx",
        result: {
          queued: true,
          projectId,
          appName,
          position: result.position,
          estimatedWaitTime: result.estimatedWaitTime,
          message: result.message,
          checkStatusUrl: `/api/tools/status?projectId=${projectId}`
        }
      }, null, 2));
    } else {
      res.end(JSON.stringify({
        status: true,
        creator: "Nixx",
        result
      }, null, 2));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: e.message
    }, null, 2));
  }
};
