const crypto = require("crypto");

const API = "https://api.overchat.ai/v1/chat/completions";
const MODEL = "openai/gpt-4o";
const PERSONA_ID = "gpt-4o-landing";

global.sessions = global.sessions || {};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { text, sessionId = "1" } = req.query;

  if (!text) {
    return res.status(400).json({
      status: false,
      creator: "Nixx",
      message: "Parameter 'text' diperlukan"
    });
  }

  try {
    if (!global.sessions[sessionId]) {
      global.sessions[sessionId] = {
        chatId: crypto.randomUUID(),
        deviceId: crypto.randomUUID(),
        messages: []
      };
    }

    const session = global.sessions[sessionId];

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };

    const systemMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content:
        "Ikuti bahasa user dan jawab dengan gaya natural, singkat, dan jelas."
    };

    const body = {
      chatId: session.chatId,
      model: MODEL,
      messages: [
        ...session.messages,
        userMessage,
        systemMessage
      ],
      personaId: PERSONA_ID,
      frequency_penalty: 0,
      max_tokens: 4000,
      presence_penalty: 0,
      stream: true,
      temperature: 0.5,
      top_p: 0.95
    };

    const response = await fetch(API, {
      method: "POST",
      headers: {
        "sec-ch-ua-platform": `"Android"`,
        "x-device-uuid": session.deviceId,
        "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
        "sec-ch-ua-mobile": "?1",
        "x-device-language": "id-ID",
        "x-device-platform": "web",
        "x-device-version": "1.0.44",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://overchat.ai",
        referer: "https://overchat.ai/",
        "accept-language":
          "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return res.status(response.status).json({
        status: false,
        creator: "Nixx",
        message: await response.text()
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let answer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true
      });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();

        if (!data || data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const content =
            json.choices?.[0]?.delta?.content;

          if (typeof content === "string") {
            answer += content;
          }
        } catch {}
      }
    }

    session.messages.push(userMessage);

    session.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      content: answer
    });

    return res.json({
      status: true,
      creator: "Nixx",
      sessionId,
      result: answer
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
      creator: "Nixx",
      message: "Terjadi kesalahan",
      error: e.message
    });
  }
};
