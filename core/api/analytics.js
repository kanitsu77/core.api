const fs = require("fs");
const path = require("path");
const UAParser = require("ua-parser-js");

const LOG_FILE = path.join(__dirname, "..", "..", "data", "requests.jsonl");
const DB_FILE = path.join(__dirname, "..", "..", "main", "database.json");
const SERVER_START = Date.now();

function loadEntries() {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch (e) {}
  }
  return entries;
}

function loadEndpointMeta() {
  const map = {};
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    for (const [category, apis] of Object.entries(db)) {
      for (const [name, api] of Object.entries(apis)) {
        map["/" + api.path] = { name, category };
      }
    }
  } catch (e) {}
  return map;
}

function getPeriodRange(period, offsetPeriods = 0) {
  const now = new Date();
  let start, end, spanMs;

  if (period === "week") {
    spanMs = 7 * 86400000;
    end = new Date(now); end.setHours(23, 59, 59, 999);
    start = new Date(end.getTime() - spanMs + 1 - offsetPeriods * spanMs);
    end = new Date(end.getTime() - offsetPeriods * spanMs);
  } else if (period === "month") {
    spanMs = 30 * 86400000;
    end = new Date(now); end.setHours(23, 59, 59, 999);
    start = new Date(end.getTime() - spanMs + 1 - offsetPeriods * spanMs);
    end = new Date(end.getTime() - offsetPeriods * spanMs);
  } else {
    spanMs = 86400000;
    end = new Date(now); end.setHours(23, 59, 59, 999);
    start = new Date(now); start.setHours(0, 0, 0, 0);
    start = new Date(start.getTime() - offsetPeriods * spanMs);
    end = new Date(end.getTime() - offsetPeriods * spanMs);
  }
  return { start: start.getTime(), end: end.getTime() };
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function pctDelta(current, previous) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const period = ["today", "week", "month"].includes(req.query.period) ? req.query.period : "today";
  const { start, end } = getPeriodRange(period, 0);
  const prevRange = getPeriodRange(period, 1);

  const all = loadEntries();
  const inRange = all.filter(e => e.ts >= start && e.ts <= end);
  const prevInRange = all.filter(e => e.ts >= prevRange.start && e.ts <= prevRange.end);
  const meta = loadEndpointMeta();

  const total = inRange.length;
  const prevTotal = prevInRange.length;

  const byPath = {};
  for (const e of inRange) {
    if (!byPath[e.path]) byPath[e.path] = [];
    byPath[e.path].push(e);
  }

  const mid = start + (end - start) / 2;
  const ranking = Object.entries(byPath).map(([p, list]) => {
    const info = meta[p] || { name: p, category: "OTHER" };
    const errCount = list.filter(e => e.status >= 400).length;
    const avgResp = list.reduce((a, b) => a + b.responseTimeMs, 0) / list.length;
    const firstHalf = list.filter(e => e.ts < mid).length;
    const secondHalf = list.filter(e => e.ts >= mid).length;
    const trending = firstHalf > 0 ? (secondHalf / firstHalf) >= 1.5 : secondHalf >= 5;

    return {
      name: info.name,
      path: p,
      category: info.category,
      count: list.length,
      trending,
      resp: Math.round(avgResp) + "ms",
      err: ((errCount / list.length) * 100).toFixed(1) + "%"
    };
  }).sort((a, b) => b.count - a.count);

  const peak = ranking[0] || null;

  const uniqueIps = new Set(inRange.map(e => e.ip)).size;
  const prevUniqueIps = new Set(prevInRange.map(e => e.ip)).size;

  const avgRespAll = total ? Math.round(inRange.reduce((a, b) => a + b.responseTimeMs, 0) / total) : 0;
  const prevAvgRespAll = prevTotal ? Math.round(prevInRange.reduce((a, b) => a + b.responseTimeMs, 0) / prevTotal) : 0;

  const errCountAll = inRange.filter(e => e.status >= 400).length;
  const errorRate = total ? ((errCountAll / total) * 100).toFixed(1) : "0.0";

  const errGroups = {};
  for (const e of inRange) {
    if (e.status >= 400) {
      const label = STATUS_LABELS[e.status] || `${e.status}`;
      errGroups[label] = (errGroups[label] || 0) + 1;
    }
  }
  const errorBreakdown = Object.entries(errGroups).sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count }));

  const hourCounts = {};
  for (const e of inRange) {
    const h = new Date(e.ts).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }
  let peakHourNum = 0, peakHourCount = -1;
  for (const [h, c] of Object.entries(hourCounts)) {
    if (c > peakHourCount) { peakHourCount = c; peakHourNum = parseInt(h); }
  }
  const peakHour = total ? `${String(peakHourNum).padStart(2, "0")}:00 - ${String((peakHourNum + 1) % 24).padStart(2, "0")}:00` : "-";

  let timeline = { labels: [], data: [] };
  if (period === "today") {
    for (let h = 0; h < 24; h += 3) {
      const count = inRange.filter(e => {
        const eh = new Date(e.ts).getHours();
        return eh >= h && eh < h + 3;
      }).length;
      timeline.labels.push(String(h).padStart(2, "0"));
      timeline.data.push(count);
    }
  } else if (period === "week") {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end - i * 86400000);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const count = inRange.filter(e => e.ts >= dayStart.getTime() && e.ts <= dayEnd.getTime()).length;
      timeline.labels.push(days[d.getDay()]);
      timeline.data.push(count);
    }
  } else {
    for (let w = 0; w < 4; w++) {
      const wStart = start + w * 7 * 86400000;
      const wEnd = Math.min(wStart + 7 * 86400000, end);
      const count = inRange.filter(e => e.ts >= wStart && e.ts < wEnd).length;
      timeline.labels.push(`W${w + 1}`);
      timeline.data.push(count);
    }
  }

  const catCounts = {};
  for (const e of inRange) {
    const info = meta[e.path] || { category: "OTHER" };
    catCounts[info.category] = (catCounts[info.category] || 0) + 1;
  }
  const categories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, value: total ? Math.round((count / total) * 100) : 0 }));

  const deviceColors = { Android: "#4ade80", Windows: "#60a5fa", iOS: "#a78bfa", "Mac OS": "#fbbf24", Linux: "#f472b6" };
  const deviceCounts = {};
  for (const e of inRange) {
    const parsed = new UAParser(e.ua).getResult();
    const osName = parsed.os.name || "Unknown";
    deviceCounts[osName] = (deviceCounts[osName] || 0) + 1;
  }
  const devices = Object.entries(deviceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      pct: total ? Math.round((count / total) * 100) : 0,
      color: deviceColors[name] || "#6b6b80"
    }));

  const heatEnd = Date.now();
  const heatStart = heatEnd - 7 * 86400000;
  const heatEntries = all.filter(e => e.ts >= heatStart && e.ts <= heatEnd);
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of heatEntries) {
    const d = new Date(e.ts);
    const day = (d.getDay() + 6) % 7;
    heatmap[day][d.getHours()]++;
  }

  res.end(JSON.stringify({
    status: true,
    creator: "Nixx",
    result: {
      period,
      runtime: formatDuration(Date.now() - SERVER_START),
      runtime_seconds: Math.floor((Date.now() - SERVER_START) / 1000),
      total,
      totalDelta: pctDelta(total, prevTotal) + " dari periode sebelumnya",
      peak: peak ? peak.path : "-",
      peakCount: peak ? `${peak.count} requests` : "0 requests",
      unique: uniqueIps,
      uniqueDelta: pctDelta(uniqueIps, prevUniqueIps) + " dari periode sebelumnya",
      peakHour,
      respTime: `${avgRespAll}ms`,
      respDelta: pctDelta(avgRespAll, prevAvgRespAll) + " dari periode sebelumnya",
      errorRate: `${errorRate}%`,
      errorDelta: `${errCountAll} error dari ${total}`,
      timeline,
      ranking: ranking.slice(0, 10),
      categories,
      errorBreakdown,
      devices,
      heatmap
    }
  }, null, 2));
};

const STATUS_LABELS = {
  400: "400 Bad Request", 401: "401 Unauthorized", 403: "403 Forbidden",
  404: "404 Not Found", 405: "405 Method Not Allowed", 408: "408 Request Timeout",
  409: "409 Conflict", 413: "413 Payload Too Large", 415: "415 Unsupported Media Type",
  422: "422 Unprocessable Content", 429: "429 Too Many Requests",
  500: "500 Internal Server Error", 501: "501 Not Implemented",
  502: "502 Bad Gateway", 503: "503 Service Unavailable", 504: "504 Gateway Timeout"
};
