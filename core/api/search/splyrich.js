const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { title, artist } = req.query;

  if (!title) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'title' wajib diisi"
    }, null, 2));
  }
  if (!artist) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      error: "Parameter 'artist' wajib diisi"
    }, null, 2));
  }

  try {
    const { data } = await axios.get("https://lrclib.net/api/search", {
      params: {
        track_name: title,
        artist_name: artist
      }
    });

    if (!data.length) {
      res.statusCode = 404;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        error: "Lirik tidak ditemukan"
      }, null, 2));
    }

    const song = data[0];

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result: {
        title: song.trackName,
        artist: song.artistName,
        album: song.albumName,
        duration: song.duration,
        instrumental: song.instrumental,
        plainLyrics: song.plainLyrics,
        syncedLyrics: song.syncedLyrics
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
