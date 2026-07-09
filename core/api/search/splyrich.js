const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const { title, artist } = req.query;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'title' wajib diisi."
      });
    }

    if (!artist) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'artist' wajib diisi."
      });
    }

    const { data } = await axios.get("https://lrclib.net/api/search", {
      params: {
        track_name: title,
        artist_name: artist
      }
    });

    if (!data.length) {
      return res.status(404).json({
        status: false,
        message: "Lirik tidak ditemukan."
      });
    }

    const song = data[0];

    return res.json({
      status: true,
      result: {
        title: song.trackName,
        artist: song.artistName,
        album: song.albumName,
        duration: song.duration,
        instrumental: song.instrumental,
        plainLyrics: song.plainLyrics,
        syncedLyrics: song.syncedLyrics
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};
