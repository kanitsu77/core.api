const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const apiLogger = require("./core/middleware/apiLogger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "main")));
app.use("/src", express.static(path.join(__dirname, "src")));
app.use(apiLogger)

function wrapHandler(handler) {
  return async (req, res) => {
    const _end = res.end.bind(res);
    res.end = (data) => {
      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          return _end(JSON.stringify(parsed, null, 2));
        } catch {
          return _end(data);
        }
      }
      return _end(data);
    };
    await handler(req, res);
  };
}

function loadRoutes(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadRoutes(fullPath, `${prefix}/${entry.name}`);
    } else if (entry.name.endsWith(".js")) {
      const routeName = entry.name.replace(".js", "");
      const routePath = `/api${prefix}/${routeName}`;
      try {
        const handler = require(fullPath);
        app.all(routePath, wrapHandler(handler));;
        console.log(`  ✔ ${routePath}`);
      } catch (e) {
        console.error(`  ✘ ${routePath} — ${e.message}`);
      }
    }
  }
}

console.log("\n⬡ core.api — Loading routes...\n");
loadRoutes(path.join(__dirname, "core", "api"));

app.post("/api/laporan", require("./core/api/report").post);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main", "main.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "main", "dashboard.html"));
});

app.get("/uploader", (req, res) => {
  res.sendFile(path.join(__dirname, "main", "uploader.html"));
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404);
    return res.sendFile(path.join(__dirname, "main", "error.html"));
  }
  res.sendFile(path.join(__dirname, "main", "main.html"));
});

app.listen(PORT, () => {
  console.log(`\n⬡ core.api running on http://localhost:${PORT}\n`);
});
