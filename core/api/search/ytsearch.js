const yts = require("yt-search");

module.exports = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ status: false, message: "Query required" });

  try {
    const { videos } = await yts(q);
    const results = videos.slice(0, 10).map(v => ({
      title: v.title,
      link: v.url,
      thumbnail: v.thumbnail,
      duration: v.timestamp,
      channel: v.author.name,
      views: v.views
    }));

    res.json({ 
      status: true, 
      creator: "Nixx"
      total: results.length, 
      results 
    });

  } catch (e) {
    res.status(500).json({ 
      status: false, 
      creator: "Nixx"
      message: e.message 
    });
  }
};
