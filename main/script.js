let dat = {},
    activeApi = null,
    activeFilter = "ALL",
    chatOpen = false,
    activeCodeTab = "curl",
    statusShown = false,
    chatHistory = [],
    lastResultJson = "",
    statsInterval = null,
    currentPeriod = "today",
    currentData = null,
    notifOpen = false,
    notifData = [];

const COLORS = ['#7c6af7', '#a78bfa', '#4ade80', '#fbbf24', '#60a5fa', '#f472b6'];

const dlIcon=`<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;

const openIcon=`<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

const copyIcon=`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;

const STATUS_CODES=[
  {code:200,label:"OK",desc:"Request berhasil, data tersedia.",cls:"s2",icon:"🟢"},
  {code:201,label:"Created",desc:"Data berhasil dibuat.",cls:"s2",icon:"🟢"},
  {code:204,label:"No Content",desc:"Berhasil namun tanpa data response.",cls:"s2",icon:"🟢"},
  {code:301,label:"Moved Permanently",desc:"Resource dipindah permanen ke URL baru.",cls:"s3",icon:"🟡"},
  {code:302,label:"Found",desc:"Redirect sementara ke URL lain.",cls:"s3",icon:"🟡"},
  {code:400,label:"Bad Request",desc:"Parameter kurang atau tidak valid.",cls:"s4",icon:"🔴"},
  {code:401,label:"Unauthorized",desc:"API key tidak valid atau tidak dikirim.",cls:"s4",icon:"🔴"},
  {code:403,label:"Forbidden",desc:"Akses ditolak untuk resource ini.",cls:"s4",icon:"🔴"},
  {code:404,label:"Not Found",desc:"Endpoint tidak ditemukan di server.",cls:"s4",icon:"🔴"},
  {code:405,label:"Method Not Allowed",desc:"Method HTTP tidak diizinkan.",cls:"s4",icon:"🔴"},
  {code:408,label:"Request Timeout",desc:"Server tidak merespons dalam waktu yang ditentukan.",cls:"s4",icon:"🔴"},
  {code:409,label:"Conflict",desc:"Konflik dengan state resource saat ini.",cls:"s4",icon:"🔴"},
  {code:413,label:"Payload Too Large",desc:"Body request melebihi batas ukuran.",cls:"s4",icon:"🔴"},
  {code:415,label:"Unsupported Media Type",desc:"Format content-type tidak didukung.",cls:"s4",icon:"🔴"},
  {code:422,label:"Unprocessable Content",desc:"Data valid tapi tidak bisa diproses.",cls:"s4",icon:"🔴"},
  {code:429,label:"Too Many Requests",desc:"Rate limit tercapai, coba lagi nanti.",cls:"s4",icon:"🔴"},
  {code:500,label:"Internal Server Error",desc:"Terjadi kesalahan di sisi server.",cls:"s5",icon:"⚫"},
  {code:501,label:"Not Implemented",desc:"Fitur belum diimplementasi di server.",cls:"s5",icon:"⚫"},
  {code:502,label:"Bad Gateway",desc:"Server upstream memberikan respons tidak valid.",cls:"s5",icon:"⚫"},
  {code:503,label:"Service Unavailable",desc:"Server sedang tidak tersedia.",cls:"s5",icon:"⚫"},
  {code:504,label:"Gateway Timeout",desc:"Server upstream tidak merespons tepat waktu.",cls:"s5",icon:"⚫"}
];

let trafficChart = null, categoryChart = null, compareChart = null, errorRing = null;

function base() {
  return window.location.origin;
}
function nowTime() {
  return new Date().toLocaleTimeString("id-ID", { hour:"2-digit",minute:"2-digit" });
}
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

(()=>{
  const c=document.getElementById("stars");
  for(let i=0;i<60;i++){
    const s=document.createElement("div");s.className="star";
    const sz=Math.random()*1.8+.4;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;--d:${3+Math.random()*5}s;--o:${.06+Math.random()*.35};animation-delay:${Math.random()*6}s`;
    c.appendChild(s);
  }
})();

async function loadData(){
  try {
    const res = await fetch("/api/list");
    const json = await res.json();
    if (json.status && json.data) dat = json.data;
    else throw new Error("bad response");
  } catch (e) {
    console.warn("fetch /api/list failed:", e.message);
  }
  afterLoad();
}

function afterLoad() {
  initNavStats();
  initTabs();
  renderGrid();
  initHeroUrl();
  runHeroTerminal();
  loadNotifications();
}

function initNavStats() {
  let total = 0, active = 0;
  for (const cat of Object.values(dat)) {
    for (const api of Object.values(cat)) {
      total++;
      if (api.status) active++;
    }
  }
  document.getElementById("pTotal").textContent = total + " APIs";
  document.getElementById("pActive").textContent = active + " Active";
}

function initHeroUrl() {
  const el = document.getElementById("heroUrl");
  if (el) el.textContent = base();
}

function copyEp(btn) {
  navigator.clipboard.writeText(base()).then(() => {
    btn.textContent = "copied!";
    setTimeout(() => btn.textContent = "copy", 1500);
  });
}

function initTabs() {
  const wrap = document.getElementById("tabs");
  wrap.innerHTML = "";
  ["ALL", ...Object.keys(dat)].forEach(cat => {
    const b = document.createElement("button");
    b.className = "tab" + (cat === "ALL" ? " active" : "");
    b.dataset.cat = cat;
    b.textContent = cat;
    b.onclick = () => {
      activeFilter = cat;
      document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.cat === cat));
      renderGrid();
    };
    wrap.appendChild(b);
  });
}

function renderGrid() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  grid.innerHTML = "";
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  let idx = 0;

  for (const [cat, apis] of Object.entries(dat)) {
    if (activeFilter !== "ALL" && cat !== activeFilter) continue;
    const filtered = Object.entries(apis).filter(([name, api]) =>
      !q || name.toLowerCase().includes(q) || api.description.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
    );
    if (!filtered.length) continue;

    const group = document.createElement("div");
    group.className = "cat-group";
    if (activeFilter === "ALL") {
      const title = document.createElement("div");
      title.className = "cat-group-title";
      title.textContent = cat;
      group.appendChild(title);
    }

    const gg = document.createElement("div");
    gg.className = "cat-group-grid";

    for (const [name, api] of filtered) {
      const pc = Object.keys(api.params).length;
      const card = document.createElement("div");
      card.className = "card" + (api.status ? "" : " inactive");
      card.style.setProperty("--delay", (idx * 0.045 + 0.05) + "s");
      card.innerHTML = `
<div class="card-top">
  <span class="cat-badge">${cat}</span>
  ${api.status
    ? `<span class="sdot on"></span>`
    : `<span class="offline-badge"><span class="offline-dot"></span>Offline</span>`
  }
</div>
<div class="card-name">${name}</div>
<div class="card-desc">${api.description}</div>
<div class="card-foot">
  <span class="tbadge ${api.type}">${api.type}</span>
  <span class="pcount">${pc > 0 ? pc + " param" + (pc > 1 ? "s" : "") : "no params"}</span>
</div>`;
      card.onclick = api.status ? () => openModal(cat, name, api) : null;
      if (!api.status) card.style.cursor = "default";
      gg.appendChild(card);
      idx++;
    }
    group.appendChild(gg);
    grid.appendChild(group);
  }

  if (!grid.children.length) {
    grid.innerHTML = `<div class="empty-search">Tidak ada endpoint ditemukan untuk "<span>${q}</span>"</div>`;
  }
}

function buildUrlRaw(api) {
  const keys = Object.keys(api.params);
  const url = base() + "/" + api.path;
  if (!keys.length) return url;
  const filled = {};
  keys.forEach(k => {
    const v = document.getElementById("inp_" + k)?.value;
    if (v) filled[k] = v;
  });
  if (!Object.keys(filled).length) return url;
  return url + "?" + keys.map(k => filled[k] ? `${k}=${encodeURIComponent(filled[k])}` : `${k}=`).join("&");
}

function buildUrlHtml(api) {
  const keys = Object.keys(api.params);
  let html = `<span class="ep-base">${base()}/</span><span class="ep-name">${api.path}</span>`;
  if (!keys.length) return html;
  html += `<span class="ep-q">?</span>`;
  html += keys.map((k, i) => {
    const val = document.getElementById("inp_" + k)?.value || "";
    return (i > 0 ? `<span class="ep-q">&amp;</span>` : "") +
      `<span class="ep-key">${k}</span><span class="ep-q">=</span>` +
      (val ? `<span class="ep-val">${encodeURIComponent(val)}</span>` : "");
  }).join("");
  return html;
}

function buildCodeSnippet(api,lang){
  const url=buildUrlRaw(api);
  if(lang==="curl")return`curl -X GET \\\n  "${url}" \\\n  -H "Accept: application/json"`;
  if(lang==="js")return`const res = await fetch(\n  "${url}"\n);\nconst data = await res.json();\nconsole.log(data);`;
  if(lang==="ts")return`const res: Response = await fetch(\n  "${url}"\n);\nconst data: unknown = await res.json();\nconsole.log(data);`;
  if(lang==="py")return`import requests\n\nurl = "${url}"\nres = requests.get(url)\ndata = res.json()\nprint(data)`;
  if(lang==="php")return`<?php\n$res = file_get_contents("${url}");\n$data = json_decode($res, true);\nprint_r($data);`;
  if(lang==="dart")return`import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nfinal res = await http.get(Uri.parse(\n  "${url}"\n));\nfinal data = jsonDecode(res.body);\nprint(data);`;
  if(lang==="go")return`package main\n\nimport (\n  "fmt"\n  "io"\n  "net/http"\n)\n\nfunc main() {\n  res, _ := http.Get(\n    "${url}",\n  )\n  defer res.Body.Close()\n  body, _ := io.ReadAll(res.Body)\n  fmt.Println(string(body))\n}`;
  if(lang==="java")return`import java.net.http.*;\nimport java.net.URI;\n\nHttpClient client = HttpClient.newHttpClient();\nHttpRequest request = HttpRequest.newBuilder()\n  .uri(URI.create("${url}"))\n  .GET()\n  .build();\nHttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(res.body());`;
  if(lang==="cpp")return`#include <iostream>\n#include <curl/curl.h>\n\nint main() {\n  CURL *curl = curl_easy_init();\n  if (curl) {\n    curl_easy_setopt(curl, CURLOPT_URL, "${url}");\n    curl_easy_perform(curl);\n    curl_easy_cleanup(curl);\n  }\n  return 0;\n}`;
  return "";
}

function renderCodeBox() {
  if (!activeApi) return;
  document.getElementById("codeContent").textContent = buildCodeSnippet(activeApi, activeCodeTab);
}

function setCodeTab(tab) {
  activeCodeTab = tab;
  document.querySelectorAll(".code-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  renderCodeBox();
}

function copyCode(){
  const text=document.getElementById("codeContent").textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.querySelector(".code-copy");
    btn.innerHTML=`${copyIcon} Copied!`;
    setTimeout(()=>{ btn.innerHTML=`${copyIcon} Copy`; },1500);
  });
}

function copyUrl(){
  navigator.clipboard.writeText(buildUrlRaw(activeApi)).then(()=>{
    const btn=document.querySelector(".ep-copy-btn");
    btn.innerHTML=`${copyIcon} Copied!`;
    setTimeout(()=>{ btn.innerHTML=`${copyIcon} Copy URL`; },1500);
  });
}

function copyResult() {
  navigator.clipboard.writeText(lastResultJson).then(() => {
    const btn = document.querySelector("#resultActions .result-action-btn");
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = `${copyIcon} Copied!`;
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  });
}


function toggleStatus() {
  statusShown = !statusShown;
  const panel = document.getElementById("statusPanel");
  const chevron = document.getElementById("statusChevron");

  if (statusShown) {
    panel.classList.add("show");
    panel.style.maxHeight = panel.scrollHeight + "px";
    chevron.style.transform = "rotate(180deg)";
    panel.addEventListener("transitionend", function handler() {
      if (statusShown) panel.style.maxHeight = "none";
      panel.removeEventListener("transitionend", handler);
    });
  } else {
    panel.style.maxHeight = panel.scrollHeight + "px";
    requestAnimationFrame(() => {
      panel.style.maxHeight = "0px";
    });
    chevron.style.transform = "rotate(0deg)";
    panel.addEventListener("transitionend", function handler() {
      if (!statusShown) panel.classList.remove("show");
      panel.removeEventListener("transitionend", handler);
    });
  }
}

function renderStatusCodes() {
  const grid = document.getElementById("statusGrid");
  grid.innerHTML = "";
  const table = document.createElement("table");
  table.className = "status-table";
  table.innerHTML = `<thead><tr><th>Status</th><th>Arti</th></tr></thead>`;
  const tbody = document.createElement("tbody");
  STATUS_CODES.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><span class="status-code ${s.cls}">${s.icon} ${s.code} ${s.label}</span></td><td class="status-desc">${s.desc}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  grid.appendChild(table);
}

function updatePreview() {
  if (!activeApi) return;
  document.getElementById("epPreview").innerHTML = buildUrlHtml(activeApi);
  renderCodeBox();
}

function clearResult() {
  document.getElementById("resultWrap").classList.remove("show");
  document.getElementById("resultContent").innerHTML = "";
  document.getElementById("resultActions").innerHTML = "";
  lastResultJson = "";
}

function openModal(cat, name, api) {
  activeApi = { cat, name, ...api };
  statusShown = false;
  document.getElementById("statusPanel").classList.remove("show");
  document.getElementById("mCat").textContent = cat;
  document.getElementById("mTitle").textContent = name;
  document.getElementById("mDesc").textContent = api.description;

  const mt = document.getElementById("mType");
  mt.className = `mtag tbadge ${api.type}`;
  mt.textContent = api.type;

  const st = document.getElementById("mStat");
  st.textContent = api.status ? "● Active" : "● Inactive";
  st.className = "mstatus " + (api.status ? "on" : "off");

  const paramsEl = document.getElementById("mParams");
  paramsEl.innerHTML = "";
  const keys = Object.keys(api.params);

  if (!keys.length) {
    paramsEl.innerHTML = `<div class="no-params">— tidak ada parameter</div>`;
  } else {
    keys.forEach(k => {
      const row = document.createElement("div");
      row.className = "param-row";
      row.innerHTML = `<span class="pk">${k}</span><span class="pv">${api.params[k]}</span>`;
      paramsEl.appendChild(row);
    });
  }

  const inputsEl = document.getElementById("mInputs");
  inputsEl.innerHTML = "";
  keys.forEach(k => {
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `<label class="input-label">${k}</label><input class="tinput" id="inp_${k}" placeholder="${api.params[k]}" oninput="updatePreview()"/>`;
    inputsEl.appendChild(row);
  });

  const tabsEl = document.getElementById("codeTabs");
  tabsEl.innerHTML = "";
  ["curl","js","ts","py","php","dart","go","java","cpp"].forEach(t=>{
  const b=document.createElement("button");
  b.className="code-tab"+(t===activeCodeTab?" active":"");
  b.dataset.tab=t;
  b.innerHTML=t==="curl"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> cURL`
  : t==="js"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="var(--amber)"><rect width="24" height="24" rx="3"/><text x="4" y="18" font-size="14" fill="#000" font-weight="bold">JS</text></svg> JavaScript`
  : t==="ts"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="#3178C6"><rect width="24" height="24" rx="3"/><text x="4" y="18" font-size="13" fill="#fff" font-weight="bold">TS</text></svg> TypeScript`
  : t==="py"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11.9 2C9.3 2 7.5 3.2 7.5 4.8V6.5h4.5v.5H5.8C4.2 7 3 8.5 3 10.5c0 2.1 1.2 3.5 2.8 3.5H7v-1.7c0-1.8 1.5-3.3 3.3-3.3h4.4c1.5 0 2.8-1.2 2.8-2.8V4.8C17.5 3.2 15.5 2 11.9 2zm-2.4 1.8c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z" fill="#3776AB"/><path d="M12.1 22c2.6 0 4.4-1.2 4.4-2.8v-1.7h-4.5v-.5h6.2c1.6 0 2.8-1.5 2.8-3.5 0-2.1-1.2-3.5-2.8-3.5H17v1.7c0 1.8-1.5 3.3-3.3 3.3H9.3c-1.5 0-2.8 1.2-2.8 2.8v2.2C6.5 20.8 8.5 22 12.1 22zm2.4-1.8c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" fill="#FFD43B"/></svg> Python`
  : t==="php"
  ? `<svg width="11" height="11" viewBox="0 0 128 128"><path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0z" fill="#8993be"/><path d="M32 48h12l4 20 10-20h12l-16 32H42z" fill="#fff"/><path d="M76 48h18c6 0 10 4 10 10 0 10-8 16-18 16h-6l-2 6H66zm10 6l-4 14h4c4 0 8-2 8-8 0-4-2-6-8-6z" fill="#fff"/></svg> PHP`
  : t==="dart"
  ? `<svg width="11" height="11" viewBox="0 0 24 24"><path d="M4.11 5.45L5.45 4.1s.6-.6 1.5-.6h7.3l3.85 3.85-9.7 9.7-4.29-4.29s-.6-.6-.6-1.5V5.96s0-.9.6-1.51z" fill="#01FFFF" opacity=".8"/><path d="M18.1 7.35l1.35 1.35s.6.6.6 1.5v5.59s0 .9-.6 1.5l-1.35 1.35-5-5z" fill="#01FFFF" opacity=".6"/><path d="M5.45 19.9l-1.34-1.35s-.6-.6-.6-1.5v-.75l4.85-4.85 5 5z" fill="#00B4AB"/><path d="M14.25 3.5H6.95s-.9 0-1.5.6L4.1 5.45l9.7 9.7 5-5z" fill="#00B4AB"/></svg> Dart`
  : t==="go"
  ? `<svg width="11" height="11" viewBox="0 0 24 24"><path d="M2 12l4.5-8.5h11L22 12l-4.5 8.5h-11z" fill="none" stroke="#00ACD7" stroke-width="1.5"/><text x="7" y="16" font-size="7" fill="#00ACD7" font-weight="bold">Go</text></svg> Go`
  : t==="java"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="#f89820"><path d="M8 21s-1 1 1 1h6c2 0 1-1 1-1s1.3-1 0-2c0 0-3 .8-8 0-1-.2-1 1 0 2zm.5-2.5c-1-2 .5-3.5.5-3.5s1 1 3 1 3-1 3-1 1.5 1.5.5 3.5c0 0-1.5.5-3.5.5s-3.5-.5-4-.5zM12 2s3 3-1 6c-3 2.4-1 4-1 4s-4-2-2-5c1.5-2 4-3 4-5z"/></svg> Java`
  : `<svg width="11" height="11" viewBox="0 0 24 24" fill="#00599C"><circle cx="12" cy="12" r="11"/><text x="4.5" y="16" font-size="9" fill="#fff" font-weight="bold">C++</text></svg> C++`;
  b.onclick=()=>setCodeTab(t);tabsEl.appendChild(b);
});

  renderStatusCodes();
  updatePreview();
  clearResult();
  document.querySelector(".modal-inner").scrollTop = 0;
  document.getElementById("overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("overlay").classList.remove("open");
}

async function runApi() {
  if (!activeApi) return;

  const btn = document.getElementById("runBtn");
  const spinner = document.getElementById("runSpinner");
  const label = document.getElementById("runLabel");

  btn.disabled = true;
  spinner.style.display = "inline-block";
  label.textContent = "Running...";

  const wrap = document.getElementById("resultWrap");
  const content = document.getElementById("resultContent");
  const actions = document.getElementById("resultActions");
  const typeLabel = document.getElementById("rTypeLabel");

  wrap.classList.add("show");
  typeLabel.textContent = activeApi.type;
  actions.innerHTML = "";

  try {
    const url = buildUrlRaw(activeApi);
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await res.json();
      lastResultJson = JSON.stringify(json, null, 2);

      actions.innerHTML = `
        <button class="result-action-btn" onclick="copyResult()">
          ${copyIcon} Copy
        </button>
      `;

      content.innerHTML = `
        <div class="json-box${json.status === false ? " err" : ""}">
${lastResultJson}
        </div>
      `;

    } else {
      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);

      actions.innerHTML = `
        <a href="${fileUrl}" download class="result-action-btn">
          ${dlIcon} Download
        </a>
      `;

      if (contentType.startsWith("image/")) {
        content.innerHTML = `
          <div class="img-result">
            <img src="${fileUrl}">
          </div>
        `;
      } else if (contentType.startsWith("video/")) {
        content.innerHTML = `
          <video controls style="width:100%;border-radius:10px">
            <source src="${fileUrl}" type="${contentType}">
          </video>
        `;
      } else if (contentType.startsWith("audio/")) {
        content.innerHTML = `
          <audio controls style="width:100%">
            <source src="${fileUrl}" type="${contentType}">
          </audio>
        `;
      } else {
        content.innerHTML = `
          <div class="json-box">
            Response berhasil diterima.
          </div>
        `;
      }
    }

  } catch (e) {
    actions.innerHTML = "";
    content.innerHTML = `<div class="json-box err">Error: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    spinner.style.display = "none";
    label.textContent = "▶  Run Request";
  }
}

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById("chatWindow").classList.toggle("open", chatOpen);
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  const msgs = document.getElementById("chatMsgs");
  const typing = document.getElementById("chatTyping");

  const userMsg = document.createElement("div");
  userMsg.className = "msg user";
  userMsg.innerHTML = `<div class="msg-bubble">${text}</div><div class="msg-time">${nowTime()}</div>`;
  msgs.insertBefore(userMsg, typing);
  input.value = "";
  msgs.scrollTop = msgs.scrollHeight;
  typing.style.display = "flex";

  chatHistory.push({ role: "user", content: text });

  try {
    const res = await fetch(base() + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });
    const json = await res.json();
    typing.style.display = "none";

    const reply = json.result || "Maaf, terjadi kesalahan.";
    chatHistory.push({ role: "assistant", content: reply });

    const botMsg = document.createElement("div");
    botMsg.className = "msg bot";
    botMsg.innerHTML = `<div class="msg-bubble">${reply}</div><div class="msg-time">${nowTime()}</div>`;
    msgs.insertBefore(botMsg, typing);
    msgs.scrollTop = msgs.scrollHeight;
  } catch (e) {
    typing.style.display = "none";
    const botMsg = document.createElement("div");
    botMsg.className = "msg bot";
    botMsg.innerHTML = `<div class="msg-bubble">Gagal terhubung ke server.</div><div class="msg-time">${nowTime()}</div>`;
    msgs.insertBefore(botMsg, typing);
  }
}

async function loadNotifications() {
  try {
    const res = await fetch(base() + "/api/notifications");
    const json = await res.json();
    if (json.status) {
      notifData = json.result;
      renderNotifBadge();
      renderNotifList();
    }
  } catch (e) {
    console.warn("Gagal load notifikasi:", e.message);
  }
}

function renderNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;

  const lastSeen = localStorage.getItem("lastSeenNotifDate");
  const unread = lastSeen
    ? notifData.filter(n => new Date(n.date) > new Date(lastSeen)).length
    : notifData.length;

  if (unread > 0) {
    badge.style.display = "flex";
    badge.textContent = unread > 9 ? "9+" : unread;
  } else {
    badge.style.display = "none";
  }
}

function renderNotifList() {
  const list = document.getElementById("notifList");
  if (!list) return;

  if (!notifData.length) {
    list.innerHTML = `<div class="notif-empty">Belum ada notifikasi</div>`;
    return;
  }

  list.innerHTML = notifData.map(n => `
    <div class="notif-item type-${n.type || "info"}">
      ${n.image ? `<img class="notif-item-img" src="${n.image}" alt=""/>` : ""}
      <div class="notif-item-body">
        <div class="notif-item-title">${n.title}</div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-date">${new Date(n.date).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  `).join("");
}

function toggleNotif() {
  notifOpen = !notifOpen;
  document.getElementById("notifPanel").classList.toggle("open", notifOpen);

  if (notifOpen && notifData.length) {
    localStorage.setItem("lastSeenNotifDate", notifData[0].date);
    setTimeout(renderNotifBadge, 300);
  }
}

document.addEventListener("click", (e) => {
  const panel = document.getElementById("notifPanel");
  const btn = document.querySelector(".notif-btn");
  if (!panel || !btn) return;
  if (notifOpen && !panel.contains(e.target) && !btn.contains(e.target)) {
    toggleNotif();
  }
});

function runHeroTerminal() {
  const out = document.getElementById("htOutput");
  if (!out) return;

  const PARTS = [
    [
      { text: "$ pm2 start server.js --name core.api", type: "cmd" },
      { text: "[PM2] Starting core.api in fork_mode", type: "out" },
      { text: "[PM2] Done.", type: "out" },
      { text: "┌────┬─────────────┬─────────┬──────┐", type: "out" },
      { text: "│ id │ name        │ status  │ cpu  │", type: "out" },
      { text: "├────┼─────────────┼─────────┼──────┤", type: "out" },
      { text: "│ 0  │ core.api    │ online  │ 0.3% │", type: "out" },
      { text: "└────┴─────────────┴─────────┴──────┘", type: "out" },
      { text: "✔ core.api is up and running", type: "ok" }
    ],
    [
      { text: "$ npm install --production", type: "cmd" },
      { text: "⸰ resolving 142 packages...", type: "out" },
      { text: "⸰ express@4.19.2", type: "out" },
      { text: "⸰ axios@1.7.2", type: "out" },
      { text: "⸰ ua-parser-js@1.0.38", type: "out" },
      { text: "⸰ dotenv@16.4.5", type: "out" },
      { text: "✔ 0 vulnerabilities found", type: "ok" }
    ],
    [
      { text: "$ curl -s core-api.my.id/api/info/api", type: "cmd" },
      { text: "{", type: "out" },
      { text: '  "creator": "Nixx",', type: "out" },
      { text: '  "url": "core-api.my.id",', type: "out" },
      { text: '  "runtime": "Node.js + Express",', type: "out" },
      { text: '  "status": "operational"', type: "out" },
      { text: "}", type: "out" },
      { text: "✔ 200 OK — response time 42ms", type: "ok" }
    ]
  ];


  let partIndex = 0;
  let lineIndex = 0;
  let charIndex = 0;
  let displayLines = [];

  function renderLines(isTyping) {
  const html = displayLines.map((l, i) => {
    const isLast = i === displayLines.length - 1;
    const cursor = (isLast && isTyping) ? '<span class="ht-typing-cursor">|</span>' : '';
    if (l.type === "cmd") return `<span class="ht-line-cmd">${l.rendered}${cursor}</span>`;
    if (l.type === "ok") return `<span class="ht-line-ok">${l.rendered}${cursor}</span>`;
    return `<span class="ht-line-out">${l.rendered}${cursor}</span>`;
  }).join("\n");
  out.innerHTML = html;
}

function typeStep() {
  const currentPart = PARTS[partIndex];

  if (lineIndex >= currentPart.length) {
    setTimeout(() => {
      partIndex = (partIndex + 1) % PARTS.length;
      lineIndex = 0;
      charIndex = 0;
      displayLines = [];
      renderLines(false);
      typeStep();
    }, 1400);
    return;
  }

  const current = currentPart[lineIndex];

  if (charIndex === 0) {
    displayLines.push({ type: current.type, rendered: "" });
  }

  const line = displayLines[displayLines.length - 1];

  if (charIndex < current.text.length) {
    line.rendered = current.text.slice(0, charIndex + 1);
    charIndex++;
    renderLines(true);
    const speed = current.type === "cmd" ? 70 : 32;
    setTimeout(typeStep, speed);
  } else {
    charIndex = 0;
    lineIndex++;
    renderLines(false);
    const pauseAfter = current.type === "cmd" ? 300 : current.type === "ok" ? 700 : 180;
    setTimeout(typeStep, pauseAfter);
  }
}

  typeStep();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sbBackdrop").classList.toggle("show");
  document.getElementById("menuBtn").classList.toggle("open");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sbBackdrop").classList.remove("show");
  document.getElementById("menuBtn").classList.remove("open");
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  if (target) target.classList.add("active");

  document.querySelectorAll(".sb-item").forEach(i => i.classList.remove("active"));
  const navItem = document.getElementById("nav-" + name);
  if (navItem) navItem.classList.add("active");

  if (name === "stats") {
    renderPeriod(currentPeriod);
  } else {
    if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
    if (sysStatsInterval) { clearInterval(sysStatsInterval); sysStatsInterval = null; }
    stopRuntimeTicker();
  }

  closeSidebar();
}

/* ===== ACCORDION (chevron slide toggle) ===== */
function toggleAcc(headEl) {
  const item = headEl.parentElement;
  const body = item.querySelector(".acc-body");
  const isOpen = item.classList.contains("open");

  if (isOpen) {
    body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => {
      body.style.maxHeight = "0px";
    });
    item.classList.remove("open");
  } else {
    item.classList.add("open");
    body.style.maxHeight = body.scrollHeight + "px";
    body.addEventListener("transitionend", function handler() {
      if (item.classList.contains("open")) body.style.maxHeight = "none";
      body.removeEventListener("transitionend", handler);
    });
  }
}

function initAccordions() {
  document.querySelectorAll(".acc-item.open .acc-body").forEach(body => {
    body.style.maxHeight = "none";
  });
  document.querySelectorAll(".acc-item:not(.open) .acc-body").forEach(body => {
    body.style.maxHeight = "0px";
  });
}

/* ===== MAIN TABS (Traffic Analytics / Stats API) ===== */
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".main-tab");
  if (!tab) return;
  document.querySelectorAll(".main-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".stats-view").forEach(v => v.classList.remove("active"));
  tab.classList.add("active");
  document.getElementById("view-" + tab.dataset.view).classList.add("active");
  if (tab.dataset.view === "system") renderSystemStats();
});

document.addEventListener("click", (e) => {
  const tab = e.target.closest(".period-tab");
  if (!tab) return;
  document.querySelectorAll(".period-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  currentPeriod = tab.dataset.period;
  const searchEl = document.getElementById("rankSearch");
  if (searchEl) searchEl.value = "";
  renderPeriod(currentPeriod);
});

let sysStatsInterval = null;

async function renderSystemStats() {
  try {
    const res = await fetch(base() + "/api/stats");
    const json = await res.json();
    const d = json.result;

    document.getElementById("sysUptime").textContent = d.uptime;
    document.getElementById("sysPlatform").textContent = d.platform;
    document.getElementById("sysNode").textContent = d.node_version;
    document.getElementById("sysCores").textContent = d.cpu_cores;
    document.getElementById("sysArch").textContent = d.arch;
    document.getElementById("sysMem").textContent = `${d.memory_used_mb} MB / ${d.memory_total_mb} MB (${d.memory_percent}%)`;
    document.getElementById("sysMemBar").style.width = d.memory_percent + "%";
    document.getElementById("sysCpu").textContent = d.cpu_model;
  } catch (e) {
    console.error("Gagal load /api/stats", e);
  }

  if (!sysStatsInterval) {
    sysStatsInterval = setInterval(renderSystemStats, 5000);
  }
}

let runtimeTickerInterval = null;
let runtimeBaseSeconds = 0;
let runtimeBaseTimestamp = 0;

function formatRuntime(totalSeconds) {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function startRuntimeTicker(initialSeconds) {
  runtimeBaseSeconds = initialSeconds || 0;
  runtimeBaseTimestamp = Date.now();

  if (runtimeTickerInterval) clearInterval(runtimeTickerInterval);

  const tick = () => {
    const elapsed = Math.floor((Date.now() - runtimeBaseTimestamp) / 1000);
    const current = runtimeBaseSeconds + elapsed;
    const el = document.getElementById("statRuntime");
    if (el) el.textContent = formatRuntime(current);
  };

  tick();
  runtimeTickerInterval = setInterval(tick, 1000);
}

function stopRuntimeTicker() {
  if (runtimeTickerInterval) {
    clearInterval(runtimeTickerInterval);
    runtimeTickerInterval = null;
  }
}

async function renderPeriod(period) {
  currentPeriod = period;
  let d;

  try {
    const res = await fetch(base() + "/api/analytics?period=" + period);
    const json = await res.json();
    d = json.result;
  } catch (e) {
    console.error("Gagal fetch /api/analytics:", e);
    return;
  }

  if (!d || !document.getElementById("statRuntime")) return;
  currentData = d;

  startRuntimeTicker(d.runtime_seconds || 0);

  document.getElementById("statTotal").textContent = d.total.toLocaleString('id-ID');
  document.getElementById("statTotalDelta").textContent = d.totalDelta;
  document.getElementById("statPeak").textContent = d.peak;
  document.getElementById("statPeakCount").textContent = d.peakCount;
  document.getElementById("statUnique").textContent = d.unique.toLocaleString('id-ID');
  document.getElementById("statUniqueDelta").textContent = d.uniqueDelta;
  document.getElementById("statPeakHour").textContent = d.peakHour;
  document.getElementById("statRespTime").textContent = d.respTime;
  document.getElementById("statRespDelta").textContent = d.respDelta;
  document.getElementById("statErrorRate").textContent = d.errorRate;
  document.getElementById("statErrorDelta").textContent = d.errorDelta;

  renderRanking();

  const ctx1 = document.getElementById("trafficChart")?.getContext("2d");
  if (ctx1) {
    if (trafficChart) trafficChart.destroy();
    trafficChart = new Chart(ctx1, {
      type: 'line',
      data: { labels: d.timeline.labels, datasets: [{
        data: d.timeline.data, borderColor: '#7c6af7', backgroundColor: 'rgba(124,106,247,.12)',
        fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2
      }]},
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b6b80', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b6b80', font: { size: 10 } } }
        }
      }
    });
  }

  const ctx2 = document.getElementById("categoryChart")?.getContext("2d");
  if (ctx2) {
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: d.categories.map(c => c.name), datasets: [{
        data: d.categories.map(c => c.value), backgroundColor: COLORS, borderColor: '#0d0d14', borderWidth: 2
      }]},
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
    });
  }

  const legend = document.getElementById("categoryLegend");
  if (legend) {
    legend.innerHTML = d.categories.map((c, i) => `
      <div class="legend-item"><span class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></span><span>${c.name}</span><span class="legend-val">${c.value}%</span></div>
    `).join('');
  }

  renderHeatmap(d.heatmap);
  renderCompareOptions(d.ranking);
  renderCompareChart();
  renderErrorRing(d.errorRate, d.errorBreakdown);
  renderDevices(d.devices);

  requestAnimationFrame(() => {
    document.querySelectorAll(".acc-item.open .acc-body").forEach(body => {
      body.style.maxHeight = "none";
    });
  });
}

function renderRanking() {
  const d = currentData;
  if (!d) return;
  const searchEl = document.getElementById("rankSearch");
  const q = (searchEl?.value || "").toLowerCase();
  const filtered = d.ranking.filter(r => !q || r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  const maxCount = Math.max(...d.ranking.map(r => r.count), 1);

  const rankList = document.getElementById("rankList");
  if (!rankList) return;

  if (!filtered.length) {
    rankList.innerHTML = `<div style="text-align:center;color:var(--muted2);font-family:var(--mono);font-size:.72rem;padding:20px 0">Tidak ditemukan</div>`;
    return;
  }

  rankList.innerHTML = filtered.map((r) => {
    const i = d.ranking.indexOf(r);
    return `
    <div class="rank-item" onclick="openDetail(${i})">
      <div class="rank-num ${i === 0 ? 'top' : ''}">${i + 1}</div>
      <div class="rank-info">
        <div class="rank-name-row">
          <div class="rank-name">${r.name}</div>
          ${r.trending ? '<span class="trending-badge">🔥 Trending</span>' : ''}
        </div>
        <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${(r.count / maxCount * 100).toFixed(0)}%"></div></div>
      </div>
      <div class="rank-count">${r.count.toLocaleString('id-ID')}</div>
    </div>`;
  }).join('');
}

function renderHeatmap(matrix) {
  const grid = document.getElementById("heatmapGrid");
  if (!grid) return;

  const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  let maxVal = 1;
  if (matrix) {
    for (const row of matrix) for (const v of row) if (v > maxVal) maxVal = v;
  }

  let html = `<div></div>`;
  for (let h = 0; h < 24; h++) html += `<div class="heatmap-hour-label">${h % 3 === 0 ? h : ''}</div>`;

  days.forEach((day, di) => {
    html += `<div class="heatmap-day-label">${day}</div>`;
    for (let h = 0; h < 24; h++) {
      const val = matrix ? (matrix[di]?.[h] || 0) : 0;
      const intensity = val / maxVal;
      const alpha = 0.06 + intensity * 0.9;
      html += `<div class="heatmap-cell" style="background:rgba(124,106,247,${alpha.toFixed(2)})" title="${day} ${h}:00 — ${val} req"></div>`;
    }
  });
  grid.innerHTML = html;
}

function renderCompareOptions(ranking) {
  const selA = document.getElementById("compareA");
  const selB = document.getElementById("compareB");
  if (!selA || !selB) return;
  selA.innerHTML = ranking.map((r, i) => `<option value="${i}">${r.name}</option>`).join('');
  selB.innerHTML = ranking.map((r, i) => `<option value="${i}" ${i===1?'selected':''}>${r.name}</option>`).join('');
  selA.onchange = renderCompareChart;
  selB.onchange = renderCompareChart;
}

function renderCompareChart() {
  const d = currentData;
  if (!d) return;
  const selA = document.getElementById("compareA");
  const selB = document.getElementById("compareB");
  if (!selA || !selB) return;
  const idxA = parseInt(selA.value || 0);
  const idxB = parseInt(selB.value || 1);
  const rA = d.ranking[idxA];
  const rB = d.ranking[idxB];
  if (!rA || !rB) return;

  const labels = d.timeline.labels;
  const timelineTotal = d.timeline.data.reduce((a, b) => a + b, 0) || 1;
  const dataA = d.timeline.data.map(v => Math.round((v / timelineTotal) * rA.count));
  const dataB = d.timeline.data.map(v => Math.round((v / timelineTotal) * rB.count));

  const ctx = document.getElementById("compareChart")?.getContext("2d");
  if (!ctx) return;
  if (compareChart) compareChart.destroy();
  compareChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: rA.name, data: dataA, borderColor: '#7c6af7', backgroundColor: 'transparent', tension:0.4, pointRadius:0, borderWidth:2 },
      { label: rB.name, data: dataB, borderColor: '#4ade80', backgroundColor: 'transparent', tension:0.4, pointRadius:0, borderWidth:2 }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: '#6b6b80', font: { size: 10 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b6b80', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6b6b80', font: { size: 9 } } }
      }
    }
  });
}

function renderErrorRing(errorRateStr, breakdown) {
  const ctxEl = document.getElementById("errorRing");
  if (!ctxEl) return;
  const pct = parseFloat(errorRateStr);
  const ctx = ctxEl.getContext("2d");
  if (errorRing) errorRing.destroy();
  errorRing = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [pct, 100 - pct], backgroundColor: ['#f87171', 'rgba(255,255,255,.06)'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
  });
  document.getElementById("errorRingValue").textContent = errorRateStr;

  const breakdownEl = document.getElementById("errorBreakdown");
  breakdownEl.innerHTML = breakdown.map(b => `<div class="error-breakdown-row"><span>${b.code}</span><span>${b.count}</span></div>`).join('');
}

function renderDevices(devices) {
  const list = document.getElementById("deviceList");
  if (!list) return;
  const icons = { Android: '🤖', Windows: '🪟', iOS: '📱', macOS: '💻' };
  list.innerHTML = devices.map(dv => `
    <div class="device-row">
      <div class="device-icon">${icons[dv.name] || '📟'}</div>
      <div class="device-info">
        <div class="device-name"><span>${dv.name}</span><span>${dv.pct}%</span></div>
        <div class="device-bar-bg"><div class="device-bar-fill" style="width:${dv.pct}%;background:${dv.color}"></div></div>
      </div>
    </div>`).join('');
}

function openDetail(idx) {
  const d = currentData;
  if (!d) return;
  const r = d.ranking[idx];
  if (!r) return;
  document.getElementById("modalName").textContent = r.name;
  document.getElementById("modalPath").textContent = r.path;
  document.getElementById("modalHits").textContent = r.count.toLocaleString('id-ID');
  document.getElementById("modalResp").textContent = r.resp;
  document.getElementById("modalErr").textContent = r.err;
  document.getElementById("modalRank").textContent = '#' + (idx + 1);
  document.getElementById("detailModal").classList.add("open");
}

function closeDetail(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("detailModal").classList.remove("open");
}

async function exportStatsData() {
  const isSystemView = document.getElementById("view-system")?.classList.contains("active");
  let data, name;

  if (isSystemView) {
    try {
      const res = await fetch(base() + "/api/stats");
      const json = await res.json();
      data = json.result;
    } catch (e) {
      data = { error: "Gagal mengambil data dari /api/stats" };
    }
    name = 'system-stats';
  } else {
    data = currentData;
    name = `analytics-${currentPeriod}`;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `core-api-${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initAccordions();

  document.querySelectorAll(".rp-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rp-type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const rpForm = document.getElementById("rpForm");
  if (rpForm) {
    rpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("rpSubmit");
      const spinner = document.getElementById("rpSpinner");
      const label = document.getElementById("rpSubmitLabel");
      const msg = document.getElementById("rpMsg");

      const activeType = document.querySelector(".rp-type-btn.active")?.dataset.type || "🐞 Bug";
      const nama = document.getElementById("rpName").value || "Anonim";
      const pesan = document.getElementById("rpMessage").value;

      if (!pesan.trim()) {
        msg.className = "rp-msg err";
        msg.style.display = "block";
        msg.textContent = "Pesan tidak boleh kosong.";
        return;
      }

      btn.disabled = true;
      spinner.style.display = "inline-block";
      label.textContent = "Mengirim...";
      msg.style.display = "none";

      try {
        const res = await fetch(base() + "/api/laporan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: activeType, name: nama, message: pesan })
        });

        if (res.ok) {
          msg.className = "rp-msg ok";
          msg.style.display = "block";
          msg.textContent = "✔ Laporan berhasil dikirim, terima kasih!";
          rpForm.reset();
          document.querySelectorAll(".rp-type-btn").forEach(b => b.classList.remove("active"));
          document.querySelector('.rp-type-btn[data-type="🐞 Bug"]').classList.add("active");
        } else {
          throw new Error("Gagal");
        }
      } catch (err) {
        msg.className = "rp-msg err";
        msg.style.display = "block";
        msg.textContent = "✘ Gagal mengirim laporan. Coba lagi.";
      } finally {
        btn.disabled = false;
        spinner.style.display = "none";
        label.textContent = "▶  Kirim Laporan";
      }
    });
  }
});


(() => {
  const c = document.getElementById("stars");
  if (!c || c.dataset.starsInit) return;
  c.dataset.starsInit = "1";
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const sz = Math.random() * 1.8 + .4;
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;--d:${3+Math.random()*5}s;--o:${.06+Math.random()*.35};animation-delay:${Math.random()*6}s`;
    c.appendChild(s);
  }
})();

(() => {
  const statTotalEl = document.getElementById("lpStatTotal");
  const statActiveEl = document.getElementById("lpStatActive");
  if (!statTotalEl && !statActiveEl) return;

  fetch("/api/list")
    .then(res => res.json())
    .then(json => {
      if (!json.status || !json.data) return;
      let total = 0, active = 0;
      for (const cat of Object.values(json.data)) {
        for (const api of Object.values(cat)) {
          total++;
          if (api.status) active++;
        }
      }
      if (statTotalEl) statTotalEl.textContent = total;
      if (statActiveEl) statActiveEl.textContent = active;
    })
    .catch(e => console.warn("Gagal load stats landing:", e.message));
})();

(() => {
  const dropzone = document.getElementById("upDropzone");
  if (!dropzone) return;

  const fileInput = document.getElementById("upFileInput");
  const fileItemWrap = document.getElementById("upFileItemWrap");
  const resultWrap = document.getElementById("upResultWrap");
  const errorWrap = document.getElementById("upErrorWrap");

  const MAX_SIZE = 50 * 1024 * 1024;
  let selectedFile = null;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function resetUI() {
    if (resultWrap) resultWrap.innerHTML = "";
    if (errorWrap) errorWrap.innerHTML = "";
  }

  function showError(msg) {
    if (!errorWrap) return;
    errorWrap.innerHTML = `<div class="up-error">${msg}</div>`;
  }

  function showPreview(file) {
    resetUI();
    selectedFile = file;

    if (fileItemWrap) {
      fileItemWrap.innerHTML = `
        <div class="up-file-item">
          <div class="up-file-icon">📄</div>
          <div class="up-file-info">
            <div class="up-file-name">${file.name}</div>
            <div class="up-file-meta">${formatSize(file.size)}</div>
            <div class="up-progress-bg"><div class="up-progress-fill" id="upProgressFill"></div></div>
          </div>
          <div class="up-file-status" id="upFileStatus">Siap</div>
        </div>
        <button class="up-copybtn" id="upStartBtn" style="width:100%;margin-top:10px;padding:12px;text-align:center">
          ⬆ Upload
        </button>
      `;
    }

    const startBtn = document.getElementById("upStartBtn");
    if (startBtn) {
      startBtn.onclick = () => uploadFile(selectedFile);
    }
  }

  function uploadFile(file) {
    if (!file) return;

    if (file.size > MAX_SIZE) {
      showError(`File terlalu besar (maks 50MB). Ukuran file: ${formatSize(file.size)}`);
      return;
    }

    resetUI();

    const startBtn = document.getElementById("upStartBtn");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Uploading...";
    }

    const progressFill = document.getElementById("upProgressFill");
    const fileStatus = document.getElementById("upFileStatus");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tools/upload");

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      if (progressFill) progressFill.style.width = pct + "%";
      if (fileStatus) fileStatus.textContent = pct + "%";
    };

    xhr.onload = () => {
      let json;
      try {
        json = JSON.parse(xhr.responseText);
      } catch (e) {
        showError("Response server tidak valid.");
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = "⬆ Upload"; }
        return;
      }

      if (!json.status) {
        showError(json.error || "Upload gagal.");
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = "⬆ Upload"; }
        return;
      }

      if (fileStatus) fileStatus.textContent = "Selesai";
      if (startBtn) startBtn.remove();

      const r = json.result;
      if (resultWrap) {
        resultWrap.innerHTML = `
          <div class="up-result-card">
            <div class="up-result-head">✔ Upload Berhasil</div>
            <div class="up-result-row">
              <span class="up-result-label">Nama File</span>
              <span class="up-result-value">${r.originalName}</span>
            </div>
            <div class="up-result-row">
              <span class="up-result-label">Ukuran</span>
              <span class="up-result-value">${formatSize(r.size)}</span>
            </div>
            <div class="up-result-row">
              <span class="up-result-label">Expired</span>
              <span class="up-result-value">${new Date(r.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div class="up-copy">
              <input class="up-input" id="upResultUrl" readonly value="${r.url}"/>
              <button class="up-copybtn" id="upCopyBtn">Copy</button>
            </div>
          </div>
        `;

        const copyBtn = document.getElementById("upCopyBtn");
        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(r.url).then(() => {
              copyBtn.textContent = "Copied!";
              setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
            });
          };
        }
      }
    };

    xhr.onerror = () => {
      showError("Gagal terhubung ke server.");
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = "⬆ Upload"; }
    };

    xhr.send(formData);
  }

  dropzone.addEventListener("click", () => {
    if (fileInput) fileInput.click();
  });

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) showPreview(fileInput.files[0]);
    });
  }

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length) showPreview(e.dataTransfer.files[0]);
  });
})();

(() => {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;

  if (sessionStorage.getItem("coreApiLoaded")) {
    overlay.remove();
    return;
  }
  sessionStorage.setItem("coreApiLoaded", "1");

  const statusText = document.getElementById("statusText");
  const messages = ["Loading", "Connecting", "Fetching data", "Almost there"];
  let msgIndex = 0;

  const msgTimer = setInterval(() => {
    msgIndex = (msgIndex + 1) % messages.length;
    if (statusText) statusText.textContent = messages[msgIndex];
  }, 2000);

  setTimeout(() => {
    clearInterval(msgTimer);
    if (statusText) statusText.textContent = "Ready";
    setTimeout(() => {
      overlay.classList.add("hide");
      setTimeout(() => overlay.remove(), 600);
    }, 800);
  }, 8000);
})();
