export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ status: false, message: "Method not allowed" });

  const { messages, dat } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ status: false, message: "Parameter 'messages' wajib diisi" });
  }

  const apiKey = process.env.apikey;
  if (!apiKey) return res.status(500).json({ status: false, message: "GROQ_KEY belum diset di environment Vercel" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `Kamu adalah support assistant untuk core.api — sebuah REST API documentation platform. Jawab pertanyaan tentang endpoint, cara pakai, error, dll. Singkat dan jelas. Pakai bahasa Indonesia casual.\n\nData endpoint yang tersedia:\n${JSON.stringify(dat || {}, null, 2)}`
          },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ status: false, message: data?.error?.message || "Groq error" });
    }

    const reply = data.choices?.[0]?.message?.content || "Maaf, ga bisa jawab sekarang.";
    return res.json({ status: true, result: reply });

  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
}
