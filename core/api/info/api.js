const db = require("../../../main/database.json");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    let totalEndpoint = 0;
    const endpointList = {};
    const categories = {};

    for (const [category, endpoints] of Object.entries(db)) {
      const names = Object.keys(endpoints);
      totalEndpoint += names.length;
      endpointList[category] = names;
      categories[category] = names.length;
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      url: `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`,
      endpoint: totalEndpoint,
      categories,
      endpointList
    }, null, 2));

  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      message: "Terjadi kesalahan",
      error: e.message
    }, null, 2));
  }
};
