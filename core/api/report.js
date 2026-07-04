const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

exports.post = async (req, res) => {
  const { type, message, name } = req.body || {};

  if (!type || !message) {
    res.statusCode = 400;
    res.end(JSON.stringify({ status: false, creator: "Nixx", error: "type dan message wajib diisi" }, null, 2));
    return;
  }

  const time = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const text =
    `📩 *Laporan Baru — core.api*\n\n` +
    `*Jenis:* ${type}\n` +
    `*Nama:* ${name || "Anonim"}\n` +
    `*Waktu:* ${time}\n\n` +
    `*Pesan:*\n${message}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown"
      })
    });

    const tgJson = await tgRes.json();

    if (!tgJson.ok) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: false, creator: "Nixx", error: tgJson.description || "Gagal kirim ke Telegram" }, null, 2));
      return;
    }

    res.end(JSON.stringify({ status: true, creator: "Nixx", message: "Laporan terkirim" }, null, 2));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ status: false, creator: "Nixx", error: e.message }, null, 2));
  }
};
