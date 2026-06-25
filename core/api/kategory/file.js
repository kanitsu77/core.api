const db = require("../../database.json");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { kategory } = req.query;

  if (!kategory) {
    const summary = {};
    for (const [cat, apis] of Object.entries(db)) {
      summary[cat] = {
        total: Object.keys(apis).length,
        active: Object.values(apis).filter((a) => a.status).length,
        apis: Object.keys(apis),
      };
    }
    return res.json({
      status: true,
      creator: "core.api",
      message: "API kategory list",
      data: summary,
    });
  }

  const key = kategory.toUpperCase();
  if (!db[key]) {
    return res.status(404).json({
      status: false,
      creator: "core.api",
      message: `Kategory '${kategory}' tidak ditemukan`,
      available: Object.keys(db),
    });
  }

  return res.json({
    status: true,
    creator: "core.api",
    kategory: key,
    total: Object.keys(db[key]).length,
    data: db[key],
  });
};
