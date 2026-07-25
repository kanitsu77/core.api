class VidsSave {
  constructor() {
    this.baseUrl = "https://api.vidssave.com/api/contentsite_api";
    this.auth = "20250901majwlqo";
    this.domain = "api-ak.vidssave.com";
  }

  async download(url) {
    if (!url) throw new Error("URL is required");

    const payload = new URLSearchParams({
      auth: this.auth,
      domain: this.domain,
      origin: "source",
      link: url
    });

    const res = await fetch(`${this.baseUrl}/media/parse`, {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://vidssave.com",
        pragma: "no-cache",
        referer: "https://vidssave.com/",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      body: payload.toString()
    });

    const data = await res.json();
    return data?.data || data;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const url = req.method === "GET"
    ? req.query.url
    : req.body?.url;

  if (!url) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      result: "Parameter 'url' wajib diisi."
    }));
  }

  try {
    const api = new VidsSave();
    const result = await api.download(url);

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result
    }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      result: e.message
    }));
  }
};
