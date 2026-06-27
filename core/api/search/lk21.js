const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { query, page = 1 } = req.query;

  if (!query) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "Parameter 'query' diperlukan"
    });
  }

  try {
    const { data } = await axios.get(
      "https://gudangvape.com/search.php",
      {
        params: {
          s: query,
          page
        },
        headers: {
          Referer: "https://tv11.lk21official.cc/",
          Origin: "https://tv11.lk21official.cc",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36"
        }
      }
    );

    const thumbnail =
      "https://poster.showcdnx.com/wp-content/uploads/";

    return res.json({
      status: true,
      creator: "Nixx",
      page: Number(page),
      totalPages: data.totalPages,
      total: data.data.length,
      result: data.data.map(v => ({
        title: v.title,
        slug: v.slug,
        url: `https://tv11.lk21official.cc/${v.slug}`,
        poster: thumbnail + v.poster,
        rating: v.rating,
        quality: v.quality,
        runtime: v.runtime,
        episode: v.episode,
        season: v.season,
        year: v.year,
        isComplete: v.is_complete
      }))
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Gagal mencari film",
      error: e.message
    });
  }
};
