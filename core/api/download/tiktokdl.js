const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'Nixx',
        message: 'Parameter url wajib diisi'
      });
    }

    try {
      const response = await axios.get('https://www.tikwm.com/api/', {
        params: { url, hd: 1 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data && response.data.data;

      if (!data) {
        return res.status(404).json({
          status: false,
          creator: 'Nixx',
          message: 'Video tidak ditemukan atau url tidak valid'
        });
      }

      res.json({
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
        }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'Nixx',
        message: 'Terjadi kesalahan saat mengambil data',
        error: err.message
      });
    }
  });
};
