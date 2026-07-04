const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
  Accept: "application/json",
  "Accept-Language": "en-GB,en;q=0.9",
  Referer: "https://media.ytmp3.gg/",
  Origin: "https://media.ytmp3.gg"
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `Request failed: ${res.status}`);
  return json;
}

async function searchYouTube(query) {
  const data = await request(
    `https://yt-meta.convert1s.com/search?q=${encodeURIComponent(query)}`,
    { headers: DEFAULT_HEADERS }
  );
  return data?.items || [];
}

async function createDownload(url, type, bitrate = "128k") {
  const format = type === "audio" ? "mp3" : "mp4";
  return request("https://hub.ytconvert.org/api/download", {
    method: "POST",
    headers: { ...DEFAULT_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      os: "windows",
      output: { type, format },
      audio: { bitrate }
    })
  });
}

async function getStatus(statusUrl) {
  return request(statusUrl, { headers: DEFAULT_HEADERS });
}

async function ytmp3(url, options = {}) {
  const { type = "audio", bitrate = "128k", interval = 2000 } = options;
  const job = await createDownload(url, type, bitrate);

  while (true) {
    const status = await getStatus(job.statusUrl);
    if (status.status === "completed") {
      return { download: status.downloadUrl, duration: status.duration };
    }
    if (status.status === "failed") throw new Error("Conversion failed");
    await sleep(interval);
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const query = req.method === "GET" ? req.query.query : req.body.query;

  if (!query) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      result: "Parameter 'query' wajib diisi. Contoh: ?query=alan walker who i am"
    }));
  }

  try {
    const results = await searchYouTube(query);

    if (!results.length) {
      res.statusCode = 404;
      return res.end(JSON.stringify({
        status: false,
        creator: "Nixx",
        result: "Video tidak ditemukan."
      }));
    }

    const video = results[0];
    const videoUrl = `https://youtube.com/watch?v=${video.id}`;

    const audio = await ytmp3(videoUrl, { type: "audio", bitrate: "128k" });

    res.end(JSON.stringify({
      status: true,
      creator: "Nixx",
      result: {
        title: video.title,
        thumbnail: video.thumbnailUrl,
        duration: audio.duration || video.duration,
        uploader: video.uploaderName,
        url: videoUrl,
        download_url: audio.download
      }
    }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Nixx",
      result: error.message
    }));
  }
};
