const axios = require("axios");
const qs = require("qs");
const cheerio = require("cheerio");

const BASE_URL = "https://youtubemp4.to";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9",
  Referer: `${BASE_URL}/HAOT/`,
  Origin: BASE_URL
};

async function fetchCookies() {
  try {
    const res = await axios.head(`${BASE_URL}/HAOT/`, {
      headers: HEADERS
    });

    return res.headers["set-cookie"]
      ? res.headers["set-cookie"].join("; ")
      : "";
  } catch {
    return "";
  }
}

function parseDownloadPage(data) {
  const $ = cheerio.load(data?.result || "");

  const title =
    $(".meta h2").text().trim() || "Unknown";

  const thumbnail =
    $(".poster img").attr("src") || "";

  const allFormats = [];

  $(".results-other table tbody tr").each((_, el) => {
    const quality = $(el)
      .find("td")
      .eq(0)
      .text()
      .trim();

    const size = $(el)
      .find("td")
      .eq(1)
      .text()
      .trim();

    const link = $(el)
      .find("td a")
      .attr("href");

    if (link) {
      allFormats.push({
        quality,
        size,
        link
      });
    }
  });

  const audio =
    allFormats.find(f =>
      /audio|mp3|kbps|kbit/i.test(f.quality)
    ) || null;

  const video = allFormats.filter(f => {
    if (/audio|mp3|kbps|kbit/i.test(f.quality))
      return false;

    const match = f.quality.match(/\d+/);

    return (
      match &&
      ["480", "720", "1080"].includes(match[0])
    );
  });

  return {
    title,
    thumbnail,
    audio,
    video
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "Parameter 'url' diperlukan"
    });
  }

  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "URL YouTube tidak valid"
    });
  }

  try {
    const cookies = await fetchCookies();

    const headers = {
      ...HEADERS,
      Cookie: cookies,
      "Content-Type":
        "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest"
    };

    const { data } = await axios.post(
      `${BASE_URL}/download_ajax/`,
      qs.stringify({ url }),
      {
        headers
      }
    );

    const result = parseDownloadPage(data);

    return res.json({
      status: true,
      creator: "Nixx",
      result
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Gagal mengambil data",
      error: e.message
    });
  }
};
