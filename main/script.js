const BASE = window.location.origin;
let allData = {};
let activeFilter = "ALL";
let activeApi = null;

function genStars() {
  const container = document.getElementById("stars");
  for (let i = 0; i < 120; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = Math.random() * 2 + 0.5;
    s.style.cssText = `
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      width:${size}px;
      height:${size}px;
      --d:${2 + Math.random() * 4}s;
      --o:${0.1 + Math.random() * 0.5};
      animation-delay:${Math.random() * 4}s;
    `;
    container.appendChild(s);
  }
}

async function loadData() {
  try {
    const res = await fetch(`${BASE}/api/kategory`);
    const json = await res.json();
    const cats = Object.keys(json.data);
    const tabs = document.getElementById("filterTabs");

    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.onclick = () => setFilter(cat);
      tabs.appendChild(btn);
    });

    const detailRes = await Promise.all(
      cats.map((c) => fetch(`${BASE}/api/kategory?kategory=${c}`).then((r) => r.json()))
    );

    detailRes.forEach((r) => {
      if (r.status) allData[r.kategory] = r.data;
    });

    updateStats();
    renderCards("ALL");
    document.getElementById("baseUrl").textContent = `${BASE}/api/kategory`;
  } catch (e) {
    document.getElementById("apiGrid").innerHTML = `<div style="color:#f87171;font-family:monospace;padding:20px">Gagal load data: ${e.message}</div>`;
  }
}

function updateStats() {
  let total = 0, active = 0;
  for (const cat of Object.values(allData)) {
    for (const api of Object.values(cat)) {
      total++;
      if (api.status) active++;
    }
  }
  document.getElementById("totalApisStat").textContent = `${total} APIs`;
  document.getElementById("activeApisStat").textContent = `${active} Active`;
}

function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.cat === cat);
  });
  renderCards(cat);
}

function renderCards(filter) {
  const grid = document.getElementById("apiGrid");
  grid.innerHTML = "";

  const entries = [];
  for (const [cat, apis] of Object.entries(allData)) {
    if (filter !== "ALL" && cat !== filter) continue;
    for (const [name, api] of Object.entries(apis)) {
      entries.push({ cat, name, ...api });
    }
  }

  if (!entries.length) {
    grid.innerHTML = `<div style="color:var(--muted);font-family:monospace;padding:20px">Tidak ada API ditemukan</div>`;
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = `api-card${entry.status ? "" : " inactive"}`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat">${entry.cat}</span>
        <span class="status-dot ${entry.status ? "on" : "off"}"></span>
      </div>
      <div class="card-name">${entry.name}</div>
      <div class="card-desc">${entry.description}</div>
      <div class="card-footer">
        <span class="type-badge ${entry.type}">${entry.type}</span>
        <span class="params-count">${Object.keys(entry.params || {}).length} param${Object.keys(entry.params || {}).length !== 1 ? "s" : ""}</span>
      </div>
    `;
    if (entry.status) card.onclick = () => openModal(entry);
    grid.appendChild(card);
  });
}

function openModal(api) {
  activeApi = api;
  document.getElementById("modalCat").textContent = api.cat;
  document.getElementById("modalTitle").textContent = api.name;
  document.getElementById("modalDesc").textContent = api.description;
  document.getElementById("modalType").textContent = api.type;
  document.getElementById("modalMethod").textContent = api.method || "GET";

  const statusEl = document.getElementById("modalStatus");
  statusEl.textContent = api.status ? "● Active" : "● Inactive";
  statusEl.className = `meta-status ${api.status ? "on" : "off"}`;

  const paramsEl = document.getElementById("modalParams");
  const tryEl = document.getElementById("tryInputs");
  paramsEl.innerHTML = "";
  tryEl.innerHTML = "";

  for (const [key, desc] of Object.entries(api.params || {})) {
    const row = document.createElement("div");
    row.className = "param-row";
    row.innerHTML = `<span class="param-key">${key}</span><span class="param-val">${desc}</span>`;
    paramsEl.appendChild(row);

    const inputRow = document.createElement("div");
    inputRow.className = "try-input-row";
    inputRow.innerHTML = `
      <label class="try-input-label">${key}</label>
      <input class="try-input" id="input_${key}" placeholder="${desc}" />
    `;
    tryEl.appendChild(inputRow);
  }

  const result = document.getElementById("tryResult");
  result.className = "try-result";
  result.textContent = "";

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  activeApi = null;
}

async function tryApi() {
  if (!activeApi) return;
  const btn = document.querySelector(".try-btn");
  const result = document.getElementById("tryResult");

  const params = {};
  for (const key of Object.keys(activeApi.params || {})) {
    params[key] = document.getElementById(`input_${key}`)?.value || "";
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${activeApi.endpoint}?${qs}`;

  btn.disabled = true;
  btn.textContent = "Loading...";
  result.className = "try-result show";
  result.textContent = `GET ${url}\n\nLoading...`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
    result.classList.add("success");
  } catch (e) {
    result.textContent = `Error: ${e.message}`;
    result.classList.add("error");
  }

  btn.disabled = false;
  btn.textContent = "Run Request";
}

function copyBase() {
  const url = document.getElementById("baseUrl").textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector(".copy-btn");
    btn.textContent = "copied!";
    setTimeout(() => btn.textContent = "copy", 1500);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

genStars();
loadData();
