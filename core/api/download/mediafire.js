const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      creator: "core.api",
      message: "Parameter 'url' diperlukan",
    });
  }

  if (!url.includes("mediafire.com")) {
    return res.status(400).json({
      status: false,
      creator: "core.api",
      message: "URL bukan dari mediafire.com",
    });
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    const downloadUrl = $("#downloadButton").attr("href") ||
      $("a.input[aria-label='Download file']").attr("href") ||
      $("a[id='downloadButton']").attr("href");

    const fileName = $(".filename").text().trim() ||
      $(".dl-btn-label").text().trim() ||
      "unknown";

    const fileSize = $(".details li:nth-child(3) span").text().trim() ||
      $(".file-size").text().trim() || "";

    const fileType = $(".details li:nth-child(2) span").text().trim() ||
      $(".filetype").text().trim() || "";

    if (!downloadUrl) {
      return res.status(404).json({
        status: false,
        creator: "core.api",
        message: "Gagal mendapatkan link download. File mungkin sudah dihapus atau private.",
      });
    }

    return res.json({
      status: true,
      creator: "core.api",
      result: {
        fileName,
        fileSize,
        fileType,
        downloadUrl,
        source: url,
      },
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "core.api",
      message: "Gagal fetch halaman MediaFire",
      error: e.message,
    });
  }
};
