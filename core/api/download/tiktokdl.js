const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url } = req.query;

  if (!url) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'url' wajib diisi"
    }, null, 2));
  }

  try {
    const response = await axios.get("https://www.tikwm.com/api/", {
      params: { url, hd: 1 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const data = response.data && response.data.data;

    if (!data) {
      res.statusCode = 404;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        error: "Video tidak ditemukan atau url tidak valid"
      }, null, 2));
    }

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result: {
        id: data.id,
        title: data.title,
        duration: data.duration,
        author: {
          username: data.author?.unique_id,
          nickname: data.author?.nickname,
          avatar: data.author?.avatar
        },
        cover: data.cover,
        music: data.music,
        video: {
          nowm: data.play,
          wm: data.wmplay,
          hd: data.hdplay
        },
        size: {
          nowm: data.size,
          hd: data.hd_size
        },
        stats: {
          play: data.play_count,
          likes: data.digg_count,
          comments: data.comment_count,
          shares: data.share_count,
          downloads: data.download_count
        }
      }
    }, null, 2));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: e.message
    }, null, 2));
  }
};
