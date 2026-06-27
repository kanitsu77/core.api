const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "Parameter 'username' diperlukan"
    });
  }

  const url = `https://instaanalyzer.com/report/${encodeURIComponent(username)}/instagram`;

  const headers = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    referer: "https://instaanalyzer.com/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
  };

  try {
    const { data: html } = await axios.get(url, { headers });

    const $ = cheerio.load(html);

    const profileInfo = $(
      ".d-flex.flex-column.flex-sm-row.flex-wrap.margin-bottom-6"
    );

    const result = {
      username: profileInfo
        .find(".col-sm-8 a.text-dark")
        .text()
        .trim(),
      fullName: profileInfo
        .find(".col-sm-8 h1")
        .text()
        .trim(),
      avatar: profileInfo
        .find("img.instagram-avatar")
        .attr("src") || null,
      description: profileInfo
        .find(".col-sm-8 small.text-muted")
        .text()
        .trim()
    };

    const stats = $(".col-md-12.col-lg-4 .col");

    result.followers = stats
      .eq(0)
      .find(".report-header-number")
      .text()
      .trim();

    result.uploads = stats
      .eq(1)
      .find(".report-header-number")
      .text()
      .trim();

    result.engagement = stats
      .eq(2)
      .find(".report-header-number")
      .text()
      .trim();

    const numbers = $(".report-content-number")
      .map((_, el) => $(el).text().trim())
      .get();

    result.engagementRate = numbers[0] || null;
    result.averageLikes = numbers[1] || null;
    result.averageComments = numbers[2] || null;

    result.futureProjections = $("table tbody tr")
      .map((_, el) => {
        const td = $(el).find("td");

        if (!td.length) return null;

        return {
          timeUntil: td.eq(0).text().trim(),
          date: td.eq(1).text().trim(),
          followers: td.eq(2).text().trim(),
          uploads: td.eq(3).text().trim()
        };
      })
      .get()
      .filter(v => v && v.timeUntil);

    return res.json({
      status: true,
      creator: "Nixx",
      result
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Gagal mengambil data Instagram",
      error: e.message
    });
  }
};
