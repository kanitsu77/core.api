const axios = require("axios")

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  const { username } = req.query

  if (!username) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'username' wajib diisi"
    })
  }

  try {
    let url

  if (user.startsWith("http")) {
      url = username
    } else if (
     username.startsWith("@") ||
     username.startsWith("channel/") ||
     username.startsWith("c/") ||
     username.startsWith("user/")
    ) {
     url = "https://www.youtube.com/" + username
    } else {
      url = "https://www.youtube.com/@" + username
     }

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    })

    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)
    if (!match) throw new Error("Metadata tidak ditemukan")

    const data = JSON.parse(match[1])

    const flatText = (node) => {
      if (!node) return null
      if (typeof node === "string") return node
      if (node.simpleText) return node.simpleText
      if (Array.isArray(node.runs)) return node.runs.map(v => v.text).join("")
      return null
    }

    const findAll = (obj, key, results = []) => {
      if (obj && typeof obj === "object") {
        if (Array.isArray(obj)) {
          obj.forEach(v => findAll(v, key, results))
        } else {
          if (Object.prototype.hasOwnProperty.call(obj, key))
            results.push(obj[key])
          Object.values(obj).forEach(v => findAll(v, key, results))
        }
      }
      return results
    }

    const header =
      data?.header?.pageHeaderRenderer ||
      data?.header?.c4TabbedHeaderRenderer

    const meta = data?.metadata?.channelMetadataRenderer || {}

    const title =
      meta.title ||
      flatText(findAll(data, "title").find(v => flatText(v))) ||
      null

    const handleRaw = findAll(data, "canonicalBaseUrl").find(
      v => typeof v === "string" && v.startsWith("/@")
    )

    const avatarThumbs = findAll(data, "avatar").flatMap(
      v => v?.thumbnails || v?.sources || []
    )

    const bannerThumbs =
      header?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources ||
      header?.banner?.thumbnails ||
      []

    res.json({
      status: true,
      creator: "Core API",
      result: {
        title,
        handle: handleRaw ? handleRaw.replace("/", "") : null,
        channelId: meta.externalId || null,
        canonicalUrl: meta.channelUrl || null,
        description: meta.description || null,
        keywords: meta.keywords || null,
        isFamilySafe: meta.isFamilySafe ?? null,
        avatar: avatarThumbs.at(-1)?.url || null,
        banner: bannerThumbs.at(-1)?.url || null
      }
    })
  } catch (e) {
    res.status(500).json({
      status: false,
      creator: "Core API",
      message: e.message
    })
  }
}
