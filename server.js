const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "main")));

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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "main", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n⬡ core.api running on http://localhost:${PORT}\n`);
});
