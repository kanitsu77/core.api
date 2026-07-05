const sharp = require("sharp");

const HEADERS = {
  origin: "https://imageprompt.org",
  referer: "https://imageprompt.org/image-to-prompt",
  accept: "*/*",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
};

async function imageToPrompt(url) {
  const buffer = await fetch(url).then(r => r.arrayBuffer());

  const image = await sharp(Buffer.from(buffer))
    .resize({
      width: 1024,
      withoutEnlargement: true
    })
    .webp({
      quality: 85
    })
    .toBuffer();

  const { cache } = await fetch("https://s.imageprompt.org/api/send", {
    method: "POST",
    headers: {
      ...HEADERS,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: "fddb9311-c53c-40fc-85ff-5f0c43971d90",
        screen: "1280x800",
        language: "en-US",
        title: "Free Image to Prompt Generator | ImagePrompt.org",
        hostname: "imageprompt.org",
        url: "https://imageprompt.org/image-to-prompt",
        referrer: "",
        name: "image_to_prompt",
        data: {
          props: {
            image_model: 0,
            prompt_language: "en"
          }
        }
      }
    })
  }).then(r => r.json());

  return fetch("https://imageprompt.org/api/ai/prompts/image", {
    method: "POST",
    headers: {
      ...HEADERS,
      "content-type": "application/json",
      "x-umami-cache": cache
    },
    body: JSON.stringify({
      base64Url: `data:image/webp;base64,${image.toString("base64")}`
    })
  }).then(r => r.json());
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
      creator: "Nixx",
      result: "Parameter 'url' wajib diisi."
    }));
  }

  try {
    const result = await imageToPrompt(url);

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
