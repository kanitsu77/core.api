const fs = require("fs");
const path = require("path");

const BUILD_DB = path.join(__dirname, "..", "..", "database", "web2apk_builds.json");

function loadBuilds() {
  try {
    if (!fs.existsSync(BUILD_DB)) return {};
    return JSON.parse(fs.readFileSync(BUILD_DB, "utf8"));
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { projectId } = req.query;

  if (!projectId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'projectId' wajib diisi"
    }, null, 2));
  }

  try {
    const builds = loadBuilds();
    const build = builds[projectId];

    if (!build) {
      res.statusCode = 404;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        error: "Project ID tidak ditemukan"
      }, null, 2));
    }

    const result = {
      projectId,
      appName: build.appName,
      url: build.url,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      status: build.status,
      position: build.position,
      progress: build.progress,
      estimatedWaitTime: build.estimatedWaitTime,
      downloadUrl: build.downloadUrl || null,
      error: build.error || null,
      completedAt: build.completedAt || null
    };

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
