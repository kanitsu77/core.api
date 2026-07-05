const axios = require("axios");
const cheerio = require("cheerio");

async function ssweb(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const { data: html, request } = await axios.get(url, {
    timeout: 20000,
    maxRedirects: 5,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36"
    }
  });

  const finalUrl = request.res.responseUrl || url;
  const $ = cheerio.load(html);

  const getMeta = (...names) => {
    for (const name of names) {
      const value =
        $(`meta[property="${name}"]`).attr("content") ||
        $(`meta[name="${name}"]`).attr("content");

      if (value?.trim()) return value.trim();
    }
    return null;
  };

  const absolute = (link) => {
    if (!link) return null;
    try {
      return new URL(link, finalUrl).href;
    } catch {
      return link;
    }
  };

  const clean = (obj) => {
    if (Array.isArray(obj)) {
      return obj
        .map(clean)
        .filter(v =>
          v != null &&
          v !== "" &&
          !(Array.isArray(v) && !v.length) &&
          !(typeof v === "object" &&
            !Array.isArray(v) &&
            !Object.keys(v).length)
        );
    }

    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj)
          .map(([k, v]) => [k, clean(v)])
          .filter(([_, v]) =>
            v != null &&
            v !== "" &&
            !(Array.isArray(v) && !v.length) &&
            !(typeof v === "object" &&
              !Array.isArray(v) &&
              !Object.keys(v).length)
          )
      );
    }

    return obj;
  };

  const screenshot = `https://image.thum.io/get/png/fullpage/${finalUrl}`;

  const thumbnail =
    absolute(
      getMeta("og:image") ||
      getMeta("og:image:url") ||
      getMeta("og:image:secure_url") ||
      getMeta("twitter:image") ||
      getMeta("twitter:image:src") ||
      $('meta[itemprop="image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href") ||
      $('link[rel="apple-touch-icon-precomposed"]').attr("href") ||
      $("img").first().attr("src")
    ) || screenshot;

  return clean({
    url,
    finalUrl,
    title:
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      $("title").text().trim(),

    description:
      getMeta("description") ||
      getMeta("og:description") ||
      getMeta("twitter:description"),

    favicon: absolute(
      $('link[rel*="icon"]').first().attr("href") ||
      "/favicon.ico"
    ),

    thumbnail,
    screenshot,

    website: {
      language: $("html").attr("lang") || getMeta("language"),
      author: getMeta("author"),
      keywords: getMeta("keywords"),
      generator: getMeta("generator")
    },

    og: {
      title: getMeta("og:title"),
      description: getMeta("og:description"),
      image: absolute(getMeta("og:image")),
      url: getMeta("og:url"),
      site_name: getMeta("og:site_name"),
      type: getMeta("og:type")
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const url = req.method === "GET"
    ? req.query.url
    : req.body.url;

  if (!url) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      status: false,
      creator: "Core API",
      result: "Parameter 'url' wajib diisi."
    }));
  }

  try {
    const result = await ssweb(url);

    res.end(JSON.stringify({
      status: true,
      creator: "Core API",
      result
    }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      status: false,
      creator: "Core API",
      result: e.message
    }));
  }
};
