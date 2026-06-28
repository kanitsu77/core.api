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

    return res.json({
      status: true,
      creator: "Nixx",
      url: `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`,
      endpoint: totalEndpoint,
      categories,
      endpointList      
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
