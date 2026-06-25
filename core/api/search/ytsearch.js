const yts = require("yt-search");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "Parameter 'query' diperlukan"
    });
  }

  try {
    const { videos } = await yts(query);

    if (!videos.length) {
      return res.status(404).json({
        status: false,
        creator: "Nixx",
        message: "Tidak ada hasil ditemukan"
      });
    }

    const results = videos.slice(0, 10).map(v => ({
      title: v.title,
      link: v.url,
      thumbnail: v.thumbnail,
      duration: v.timestamp,
      channel: v.author?.name || "Unknown",
      views: v.views
    }));

    return res.json({
      status: true,
      creator: "Nixx",
      total: results.length,
      result: results
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Gagal mengambil data YouTube",
      error: e.message
    });
  }
};
