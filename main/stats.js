<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>core.api — Stats</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a0f;
    color: #e4e4e7;
    font-family: 'Courier New', monospace;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-image: radial-gradient(circle at 20% 20%, #12121a 0%, #0a0a0f 60%);
  }
  .container {
    width: 100%;
    max-width: 480px;
  }
  .header {
    text-align: center;
    margin-bottom: 32px;
  }
  .header h1 {
    font-size: 22px;
    letter-spacing: 2px;
    color: #f4f4f5;
  }
  .header p {
    color: #52525b;
    font-size: 12px;
    margin-top: 6px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .card {
    background: #111118;
    border: 1px solid #1f1f28;
    border-radius: 8px;
    padding: 16px;
  }
  .card.full {
    grid-column: 1 / -1;
  }
  .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #52525b;
    margin-bottom: 6px;
  }
  .value {
    font-size: 16px;
    color: #f4f4f5;
    word-break: break-word;
  }
  .value.big {
    font-size: 20px;
    color: #a1a1aa;
  }
  .bar-bg {
    width: 100%;
    height: 6px;
    background: #1f1f28;
    border-radius: 3px;
    margin-top: 8px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: #71717a;
    transition: width 0.4s ease;
  }
  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ade80;
    margin-right: 6px;
    box-shadow: 0 0 8px #4ade80;
  }
  .loading {
    text-align: center;
    color: #52525b;
    padding: 40px 0;
  }
  .footer {
    text-align: center;
    margin-top: 24px;
    color: #3f3f46;
    font-size: 11px;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>⬡ CORE.API</h1>
    <p><span class="status-dot"></span>SYSTEM STATUS</p>
  </div>

  <div id="content" class="loading">Loading stats...</div>

  <div class="footer">core-api.my.id — by Nixx</div>
</div>

<script>
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      const d = json.result;

      document.getElementById('content').outerHTML = `
        <div class="grid" id="content">
          <div class="card full">
            <div class="label">Uptime</div>
            <div class="value big">${d.uptime}</div>
          </div>
          <div class="card">
            <div class="label">Platform</div>
            <div class="value">${d.platform}</div>
          </div>
          <div class="card">
            <div class="label">Node Version</div>
            <div class="value">${d.node_version}</div>
          </div>
          <div class="card">
            <div class="label">CPU Cores</div>
            <div class="value">${d.cpu_cores}</div>
          </div>
          <div class="card">
            <div class="label">Architecture</div>
            <div class="value">${d.arch}</div>
          </div>
          <div class="card full">
            <div class="label">Memory Usage (${d.memory_percent}%)</div>
            <div class="value">${d.memory_used_mb} MB / ${d.memory_total_mb} MB</div>
            <div class="bar-bg">
              <div class="bar-fill" style="width: ${d.memory_percent}%"></div>
            </div>
          </div>
          <div class="card full">
            <div class="label">CPU Model</div>
            <div class="value" style="font-size:12px;">${d.cpu_model}</div>
          </div>
        </div>
      `;
    } catch (e) {
      document.getElementById('content').innerHTML = 'Failed to load stats.';
    }
  }

  loadStats();
  setInterval(loadStats, 5000);
</script>
</body>
</html>
