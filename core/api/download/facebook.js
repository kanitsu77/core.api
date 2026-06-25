const axios = require("axios");
const cheerio = require("cheerio");

const API_CHALLENGE = "https://fsaver.net/api/challenge";
const API_DOWNLOAD = "https://fsaver.net/en/download";

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

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

  try {
    const challenge = await axios.post(
      API_CHALLENGE,
      { url },
      {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://fsaver.net",
          "user-agent": UA
        }
      }
    );

    const token = challenge.data?.token;

    if (!token) {
      return res.status(500).json({
        status: false,
        creator: "Nixx",
        message: "Token tidak ditemukan"
      });
    }

    const body = new URLSearchParams({
      url,
      token
    });

    const page = await axios.post(
      API_DOWNLOAD,
      body.toString(),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": UA
        }
      }
    );

    const $ = cheerio.load(page.data);

    const result = [];

    $("table tr").each((_, el) => {
      const quality = $(el)
        .find("td")
        .eq(0)
        .text()
        .trim();

      const href = $(el)
        .find("a[download]")
        .attr("href");

      if (!href) return;

      result.push({
        quality,
        url: href
      });
    });

    const title =
      $(".download__item__profile_pic div")
        .first()
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim() || null;

    const thumbnail =
      $(".download__item__profile_pic img").attr("src") ||
      null;

    return res.json({
      status: result.length > 0,
      creator: "Nixx",
      input: url,
      metadata: {
        title,
        thumbnail
      },
      result
    });

  } catch (e) {
    return res.status(
      e.response?.status || 500
    ).json({
      status: false,
      creator: "Nixx",
      input: url,
      message: e.message
    });
  }
};
