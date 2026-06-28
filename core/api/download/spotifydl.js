const axios = require("axios");

class SpotifyDL {
  constructor() {
    this.api = {
      meta: "https://spotify.dlapi.app/api/Gettrack",
      convert: "https://master.dlapi.app/api/v1/convert",
      task: "https://master.dlapi.app/api/v1/tasks"
    };
    this.client = axios.create({
      headers: {
        Authorization: "Bearer pGLXoCsVu0hcstAecIDwlrlbcrUzv0e1cWBJ0yuB",
        "Content-Type": "application/json",
        "User-Agent": "Spotmate/1.0"
      }
    });
  }

  valid(url) {
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/.test(url);
  }

  async meta(url) {
    const { data } = await this.client.get(this.api.meta, { params: { spotify_url: url } });
    if (!data) throw new Error("API Data Empty");
    return data;
  }

  async convert(url, format = "mp3") {
    const { data: init } = await this.client.post(this.api.convert, { url, format });
    if (init?.download_url) return init.download_url;
    const taskId = init?.task_id || init?.id;
    if (!taskId) throw new Error("No Task ID received");
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const { data: status } = await this.client.get(`${this.api.task}/${taskId}`);
      if (status?.status === "finished" || status?.status === "completed") {
        return status?.result?.download_url || status?.download_url;
      }
      if (status?.status === "failed") throw new Error("Server-side processing failed");
    }
    throw new Error("Task Timeout");
  }

  async download({ url, format = "mp3" }) {
    if (!this.valid(url)) throw new Error("Invalid Spotify URL");
    const data = await this.meta(url);
    const targetUrl = data?.external_urls?.spotify || url;
    const downloadUrl = await this.convert(targetUrl, format);
    return {
      title: data.name,
      artist: data.artists?.map(a => a.name).join(", "),
      album: data.album?.name,
      duration: data.duration_ms,
      cover: data.album?.images?.[0]?.url,
      download: downloadUrl
    };
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    const { url } = req.query;

    if (!url) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        message: "Parameter 'url' diperlukan"
      }, null, 2));
    }

    const api = new SpotifyDL();
    const result = await api.download({ url });

    return res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result
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
