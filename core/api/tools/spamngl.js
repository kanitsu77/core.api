const spamNGL = async (username, message, count = 1) => {
    try {
        count = Number(count) || 1;
        if (count < 1) count = 1;
        if (count > 15) count = 15;

        let success = 0;
        let failed = 0;
        const results = [];

        for (let i = 0; i < count; i++) {
            try {
                const deviceId =
                    "web-" +
                    Math.random().toString(36).slice(2) +
                    "-" +
                    Date.now();

                const payload = new URLSearchParams({
                    username,
                    question: message,
                    deviceId,
                    gameSlug: "",
                    referrer: `https://ngl.link/${username}`
                });

                const res = await fetch("https://ngl.link/api/submit", {
                    method: "POST",
                    headers: {
                        Host: "ngl.link",
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "User-Agent":
                            "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
                        Accept: "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.9",
                        Origin: "https://ngl.link",
                        Referer: `https://ngl.link/${username}`
                    },
                    body: payload.toString()
                });

                const response = await res.text();

                const ok =
                    res.ok ||
                    response.toLowerCase().includes("success") ||
                    response.toLowerCase().includes("submitted");

                if (ok) success++;
                else failed++;

                results.push({
                    success: ok,
                    status: res.status,
                    response
                });
            } catch (err) {
                failed++;
                results.push({
                    success: false,
                    error: err.message
                });
            }

            if (i < count - 1) {
                await new Promise(r =>
                    setTimeout(r, 1800 + Math.random() * 1200)
                );
            }
        }

        return {
            status: true,
            username,
            message,
            total: count,
            success,
            failed,
            results
        };
    } catch (err) {
        return {
            status: false,
            message: err.message
        };
    }
};


module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  
  const { username, message, total } = req.query;
  
  if (!username) {
  res.statusCode = 400;
   return res.end(JSON.stringify({
     status: false,
     creator: "Nixx",
     error: "Parameter 'username' harus di isi!
   }, null, 2))
  }
  
  if (!message) {
  res.statusCode = 400;
   return res.end(JSON.stringify({
     status: false,
     creator: "Nixx",
     error: "Parameter 'message' harus di isi!
   }, null, 2))
  } 
  
  if (!total) {
  res.statusCode = 400;
   return res.end(JSON.stringify({
     status: false,
     creator: "Nixx",
     error: "Parameter 'total' harus di isi!
   }, null, 2))
  }
  
  try {
  
  let data = await spamNGL(username, message, total)
  res.end(JSON.stringify({
    status: true,
    creator: "Nixx",
    data
   }, null, 2))
  
  } catch (e) {
  res.statusCode = 500;
  res.end(JSON.stringify({
    status: false,
    creator: "Nixx",
    error: e
    }, null, 2))
  }
}
