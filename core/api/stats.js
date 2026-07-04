const os = require("os");

const startTime = Date.now();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const uptimeMs = Date.now() - startTime;
  const uptimeSec = Math.floor(uptimeMs / 1000);

  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.end(JSON.stringify({
    status: true,
    creator: "Nixx",
    result: {
      uptime: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      uptime_seconds: uptimeSec,
      platform: os.platform(),
      arch: os.arch(),
      cpu_model: os.cpus()[0]?.model || "Unknown",
      cpu_cores: os.cpus().length,
      memory_used_mb: (usedMem / 1024 / 1024).toFixed(2),
      memory_total_mb: (totalMem / 1024 / 1024).toFixed(2),
      memory_percent: ((usedMem / totalMem) * 100).toFixed(1),
      node_version: process.version,
      timestamp: new Date().toISOString()
    }
  }));
};
