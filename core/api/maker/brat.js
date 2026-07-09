module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const imageUrl = "https://c.termai.cc/i118/MqbGxGu.jpg";

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(404).json({
        status: false,
        message: "Image not found"
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.writeHead(200, {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400"
    });

    return res.end(buffer);
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: e.message
    });
  }
};
