const BASE_URL = window.location.origin;

let dat = {};
let activeApi = null, activeFilter = "ALL", keyShown = false, chatOpen = false;

const dlIcon = `<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
const openIcon = `<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

function fmtNum(n){ if(n>=1000000)return(n/1000000).toFixed(1)+"M"; if(n>=1000)return(n/1000).toFixed(1)+"k"; return n; }
function nowTime(){ return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); }

(()=>{
  const c = document.getElementById("stars");
  for(let i=0;i<60;i++){
    const s = document.createElement("div"); s.className = "star";
    const sz = Math.random()*1.8+.4;
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;--d:${3+Math.random()*5}s;--o:${.06+Math.random()*.35};animation-delay:${Math.random()*6}s`;
    c.appendChild(s);
  }
})();

async function loadData(){
  try {
    const res = await fetch("/database.json");
    if(!res.ok) throw new Error("HTTP "+res.status);
    dat = await res.json();
  } catch(e) {
    console.warn("Gagal fetch database.json:", e.message);
    dat = {};
  }
  initStats();
  initTabs();
  renderGrid();
  renderStatsPage();
}

function countTotals(){
  let total=0, active=0, cats=0;
  cats = Object.keys(dat).length;
  for(const cat of Object.values(dat)){
    for(const api of Object.values(cat)){
      total++;
      if(api.status) active++;
    }
  }
  return {total, active, cats};
}

function initStats(){
  const {total, active, cats} = countTotals();
  document.getElementById("pTotal").textContent = total+" APIs";
  document.getElementById("pActive").textContent = active+" Active";
  document.getElementById("sTotal").textContent = total;
  document.getElementById("sActive").textContent = active;
  document.getElementById("sCat").textContent = cats;
}

function initTabs(){
  const wrap = document.getElementById("tabs"); wrap.innerHTML = "";
  ["ALL",...Object.keys(dat)].forEach(cat=>{
    const b = document.createElement("button");
    b.className = "tab"+(cat==="ALL"?" active":"");
    b.dataset.cat = cat;
    b.textContent = cat;
    b.onclick = ()=>{
      activeFilter = cat;
      document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.cat===cat));
      renderGrid();
    };
    wrap.appendChild(b);
  });
}

function renderGrid(){
  const grid = document.getElementById("grid"); grid.innerHTML = "";
  let idx = 0;
  for(const [cat,apis] of Object.entries(dat)){
    if(activeFilter!=="ALL" && cat!==activeFilter) continue;
    for(const [name,api] of Object.entries(apis)){
      const pc = Object.keys(api.params||{}).length;
      const card = document.createElement("div"); card.className = "card";
      card.style.setProperty("--delay",(idx*0.045+.05)+"s");
      card.innerHTML = `
        <div class="card-top"><span class="cat-badge">${cat}</span><span class="sdot ${api.status?"on":"off"}"></span></div>
        <div class="card-name">${name}</div>
        <div class="card-desc">${api.description||""}</div>
        <div class="card-foot">
          <span class="tbadge ${api.type}">${api.type}</span>
          <span class="pcount">${pc>0?pc+" param"+(pc>1?"s":""):"no params"}</span>
        </div>`;
      card.onclick = ()=>openModal(cat,name,api);
      grid.appendChild(card); idx++;
    }
  }
  if(idx===0){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:48px 0;font-size:.85rem">Belum ada endpoint tersedia.</div>`;
  }
}

function renderStatsPage(){
  const {total, active, cats} = countTotals();

  document.getElementById("sc-ep").textContent = active;
  document.getElementById("sc-req").textContent = "—";
  document.getElementById("sc-up").textContent = "—";
  document.getElementById("sc-ms").textContent = "—";

  const catColors = ["#a78bfa","#f472b6","#60a5fa","#4ade80","#fbbf24","#fb923c","#38bdf8","#e879f9"];
  const cats_list = Object.entries(dat).map(([name,apis],i)=>({
    name,
    count: Object.keys(apis).length,
    active: Object.values(apis).filter(a=>a.status).length,
    color: catColors[i%catColors.length]
  }));

  const barList = document.getElementById("barList"); barList.innerHTML="";
  const maxCount = Math.max(...cats_list.map(c=>c.count),1);
  cats_list.forEach(c=>{
    const pct = Math.round(c.count/maxCount*100);
    const div = document.createElement("div"); div.className="bar-item";
    div.innerHTML = `
      <div class="bar-meta"><span class="bar-name">${c.name}</span><span class="bar-val">${c.count} endpoints</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.color}"></div></div>`;
    barList.appendChild(div);
  });

  const ringSvg = document.getElementById("ringSvg");
  const ringLegend = document.getElementById("ringLegend");
  ringSvg.innerHTML=""; ringLegend.innerHTML="";
  const totalEp = cats_list.reduce((s,c)=>s+c.count,0)||1;
  let offset = 0;
  const r=40, cx=55, cy=55, circ=2*Math.PI*r;
  cats_list.forEach(c=>{
    const frac = c.count/totalEp;
    const dash = frac*circ;
    const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
    circle.setAttribute("cx",cx); circle.setAttribute("cy",cy); circle.setAttribute("r",r);
    circle.setAttribute("fill","none"); circle.setAttribute("stroke",c.color);
    circle.setAttribute("stroke-width","14");
    circle.setAttribute("stroke-dasharray",`${dash} ${circ-dash}`);
    circle.setAttribute("stroke-dashoffset",-offset*circ);
    circle.setAttribute("transform",`rotate(-90 ${cx} ${cy})`);
    ringSvg.appendChild(circle);
    offset += frac;
    const leg = document.createElement("div"); leg.className="leg-item";
    leg.innerHTML=`<span class="leg-dot" style="background:${c.color}"></span><span>${c.name}</span><span class="leg-num">${c.count}</span>`;
    ringLegend.appendChild(leg);
  });

  const respList = document.getElementById("respList"); respList.innerHTML="";
  cats_list.forEach(c=>{
    const div = document.createElement("div"); div.className="resp-item";
    div.innerHTML=`<span class="resp-name">${c.name}</span><span class="resp-bar-wrap"><span class="resp-bar-fill" style="background:${c.color};width:60px"></span></span><span class="resp-ms" style="color:var(--muted)">live</span>`;
    respList.appendChild(div);
  });

  const tbody = document.getElementById("statusTable"); tbody.innerHTML="";
  for(const [cat,apis] of Object.entries(dat)){
    for(const [name,api] of Object.entries(apis)){
      const tr = document.createElement("tr");
      tr.innerHTML=`<td>${name}</td><td>${cat}</td><td>—</td><td><span class="sdot ${api.status?"on":"off"}" style="display:inline-block;margin-right:4px"></span>${api.status?"Active":"Inactive"}</td>`;
      tbody.appendChild(tr);
    }
  }

  const uptimeBars = document.getElementById("uptimeBars"); uptimeBars.innerHTML="";
  for(let i=0;i<60;i++){
    const b = document.createElement("div"); b.className="ubar";
    const ok = Math.random()>.05;
    b.classList.add(ok?"ok":"fail");
    uptimeBars.appendChild(b);
  }
  document.getElementById("uptimePct").textContent = active>0?"~99%":"—";
}

function setStatsFilter(f,btn){
  document.querySelectorAll(".fbtn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  renderStatsPage();
}

function doRefresh(){
  const btn = document.getElementById("refreshBtn");
  btn.classList.add("spin");
  loadData().then(()=>setTimeout(()=>btn.classList.remove("spin"),600));
}

function buildUrlHtml(api){
  const keys = Object.keys(api.params||{});
  let html = `<span class="ep-base">${BASE_URL}/</span><span class="ep-name">${api.path}</span>`;
  if(!keys.length) return html;
  html += `<span class="ep-q">?</span>`;
  html += keys.map((k,i)=>{
    const val = document.getElementById("inp_"+k)?.value||"";
    return `${i>0?`<span class="ep-q">&</span>`:""}` +
      `<span class="ep-key">${k}</span><span class="ep-q">=</span>` +
      (val?`<span class="ep-val">${encodeURIComponent(val)}</span>`:"");
  }).join("");
  return html;
}

function buildUrlRaw(api){
  const keys = Object.keys(api.params||{});
  if(!keys.length) return `${BASE_URL}/${api.path}`;
  const parts = keys.map(k=>{
    const v = document.getElementById("inp_"+k)?.value||"";
    return `${k}=${encodeURIComponent(v)}`;
  });
  return `${BASE_URL}/${api.path}?${parts.join("&")}`;
}

function openModal(cat,name,api){
  activeApi = {cat,name,...api};
  document.getElementById("mCat").textContent = cat;
  document.getElementById("mTitle").textContent = name;
  document.getElementById("mDesc").textContent = api.description||"";
  const mt = document.getElementById("mType"); mt.className=`mtag tbadge ${api.type}`; mt.textContent=api.type;
  const st = document.getElementById("mStat"); st.textContent=api.status?"● Active":"● Inactive"; st.className="mstatus "+(api.status?"on":"off");

  const paramsEl = document.getElementById("mParams"); paramsEl.innerHTML="";
  const keys = Object.keys(api.params||{});
  if(!keys.length){
    paramsEl.innerHTML=`<div class="no-params">— tidak ada parameter</div>`;
  } else {
    keys.forEach(k=>{
      const row=document.createElement("div"); row.className="param-row";
      row.innerHTML=`<span class="pk">${k}</span><span class="pv">${api.params[k]}</span>`;
      paramsEl.appendChild(row);
    });
  }

  const inputsEl = document.getElementById("mInputs"); inputsEl.innerHTML="";
  keys.forEach(k=>{
    const row=document.createElement("div"); row.className="input-row";
    row.innerHTML=`<label class="input-label">${k}</label><input class="tinput" id="inp_${k}" placeholder="${api.params[k]}" oninput="updatePreview()"/>`;
    inputsEl.appendChild(row);
  });

  updatePreview(); clearResult();
  document.querySelector(".modal-inner").scrollTop=0;
  document.getElementById("overlay").classList.add("open");
}

function updatePreview(){
  if(!activeApi) return;
  document.getElementById("epPreview").innerHTML = buildUrlHtml(activeApi);
}

function clearResult(){
  lastResultRaw = "";
  document.getElementById("resultLoading").classList.remove("show");
  document.getElementById("resultWrap").classList.remove("show");
  document.getElementById("resultContent").innerHTML="";
}

function copyUrl(btn){
  const url = buildUrlRaw(activeApi);
  navigator.clipboard.writeText(url).then(()=>{
    const svg = btn.querySelector("svg");
    btn.style.color="var(--green)"; btn.style.borderColor="rgba(74,222,128,.4)";
    setTimeout(()=>{ btn.style.color=""; btn.style.borderColor=""; },1400);
  });
}

let lastResultRaw = "";

function copyResult(){
  if(!lastResultRaw) return;
  const btn = document.getElementById("copyResultBtn");
  const lbl = document.getElementById("copyResultLabel");
  navigator.clipboard.writeText(lastResultRaw).then(()=>{
    lbl.textContent="Copied!";
    btn.style.color="var(--green)"; btn.style.borderColor="rgba(74,222,128,.4)";
    setTimeout(()=>{ lbl.textContent="Copy"; btn.style.color=""; btn.style.borderColor=""; },1400);
  });
}

async function runApi(){
  if(!activeApi) return;

  const keys = Object.keys(activeApi.params||{});
  let hasError = false;
  keys.forEach(k=>{
    const inp = document.getElementById("inp_"+k);
    if(inp && !inp.value.trim()){
      inp.classList.add("error");
      inp.addEventListener("input",()=>inp.classList.remove("error"),{once:true});
      hasError = true;
    }
  });
  if(hasError) return;

  const btn=document.getElementById("runBtn");
  const spinner=document.getElementById("runSpinner");
  const label=document.getElementById("runLabel");
  const loading=document.getElementById("resultLoading");
  btn.disabled=true; spinner.style.display="block"; label.textContent="Loading...";
  clearResult();
  document.getElementById("resultWrap").classList.add("show");
  loading.classList.add("show");

  const url = buildUrlRaw(activeApi);
  const type = activeApi.type;
  const wrap = document.getElementById("resultWrap");
  const content = document.getElementById("resultContent");
  const rl = document.getElementById("rTypeLabel");
  rl.className=`tbadge ${type}`; rl.textContent=type;

  try {
    const res = await fetch(url);
    const json = await res.json();
    loading.classList.remove("show");
    lastResultRaw = JSON.stringify(json, null, 2);

    if(type==="image"){
      const imgUrl = json?.result||json?.url||json?.data?.url||"";
      if(imgUrl){
        const w=document.createElement("div"); w.className="img-result";
        w.innerHTML=`<img src="${imgUrl}" alt="result" loading="lazy"/><div class="media-bar"><div class="media-url"><a href="${imgUrl}" target="_blank">${imgUrl}</a></div><a href="${imgUrl}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${imgUrl}" target="_blank" class="dl-btn">${openIcon}</a></div>`;
        content.appendChild(w);
      } else {
        appendJson(content,json);
      }
    } else if(type==="video"){
      const vidUrl = json?.result||json?.url||json?.data?.url||"";
      if(vidUrl){
        const w=document.createElement("div"); w.className="video-result";
        w.innerHTML=`<video controls src="${vidUrl}"></video><div class="media-bar"><div class="media-url"><a href="${vidUrl}" target="_blank">${vidUrl}</a></div><a href="${vidUrl}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${vidUrl}" target="_blank" class="dl-btn">${openIcon}</a></div>`;
        content.appendChild(w);
      } else {
        appendJson(content,json);
      }
    } else if(type==="audio"){
      const audUrl = json?.result||json?.url||json?.data?.url||"";
      if(audUrl){
        const w=document.createElement("div"); w.className="audio-result";
        w.innerHTML=`<audio controls src="${audUrl}"></audio><div class="audio-actions"><div class="audio-url"><a href="${audUrl}" target="_blank">${audUrl}</a></div><a href="${audUrl}" download target="_blank" class="dl-btn">${dlIcon} Download</a></div>`;
        content.appendChild(w);
      } else {
        appendJson(content,json);
      }
    } else {
      appendJson(content,json);
    }
  } catch(e) {
    loading.classList.remove("show");
    const box=document.createElement("div"); box.className="json-box err";
    box.textContent=`Error: ${e.message}\n\nPastikan endpoint sudah aktif di Vercel.`;
    content.appendChild(box);
  }
  wrap.classList.add("show");
  btn.disabled=false; spinner.style.display="none";
  label.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:5px"><polygon points="5 3 19 12 5 21 5 3"/></svg>Run Request`;
  setTimeout(()=>document.querySelector(".modal-inner").scrollTo({top:99999,behavior:"smooth"}),80);
}

function appendJson(container,data){
  const box=document.createElement("div"); box.className="json-box ok";
  box.textContent=JSON.stringify(data,null,2);
  container.appendChild(box);
}

function closeModal(){
  document.getElementById("overlay").classList.remove("open"); activeApi=null;
}

function toggleSidebar(){
  const sb=document.getElementById("sidebar"),bd=document.getElementById("sbBackdrop"),btn=document.getElementById("menuBtn");
  const open=sb.classList.toggle("open");
  bd.classList.toggle("show",open); btn.classList.toggle("open",open);
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sbBackdrop").classList.remove("show");
  document.getElementById("menuBtn").classList.remove("open");
}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+id).classList.add("active");
  document.querySelectorAll(".sb-item").forEach(i=>i.classList.remove("active"));
  document.getElementById("nav-"+id)?.classList.add("active");
  closeSidebar();
  if(id==="stats") renderStatsPage();
}

function copyEp(btn){
  navigator.clipboard.writeText(BASE_URL+"/kategory/file").then(()=>{
    btn.textContent="copied!"; setTimeout(()=>btn.textContent="copy",1500);
  });
}

let keyReal = "core_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
function toggleKey(btn){
  const el=document.getElementById("apikeyText");
  keyShown=!keyShown;
  el.textContent=keyShown?keyReal:"core_••••••••••••••••••••••••••••••••";
  btn.textContent=keyShown?"hide":"show";
  if(keyShown){ navigator.clipboard.writeText(keyReal).then(()=>{ btn.textContent="copied!"; setTimeout(()=>btn.textContent="hide",1500); }); }
}

const TW_LINES = [
  "Fetch data dari mana saja.",
  "Download. Search. AI. Tools.",
  "REST API siap pakai.",
  "Gratis. Cepat. Reliable."
];
let twIdx=0, twChar=0, twDeleting=false;
function typeTick(){
  const el=document.getElementById("twText");
  const line=TW_LINES[twIdx];
  if(!twDeleting){
    twChar++;
    el.textContent=line.slice(0,twChar);
    if(twChar===line.length){ twDeleting=true; setTimeout(typeTick,1800); return; }
  } else {
    twChar--;
    el.textContent=line.slice(0,twChar);
    if(twChar===0){ twDeleting=false; twIdx=(twIdx+1)%TW_LINES.length; }
  }
  setTimeout(typeTick,twDeleting?40:60);
}
typeTick();

let chatHistory = [];

async function sendChat(){
  const inp = document.getElementById("chatInput");
  const msg = inp.value.trim();
  if(!msg) return;
  inp.value="";

  appendMsg("user", msg);
  chatHistory.push({role:"user", content:msg});

  const typing = document.getElementById("chatTyping");
  typing.style.display="flex";
  scrollChat();

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${process.env.apikey}`
      },
      body:JSON.stringify({
        model:"llama-3.3-70b-versatile",
        max_tokens:1000,
        temperature:0.7,
        messages:[
          {
            role:"system",
            content:`Kamu adalah support assistant untuk core.api — sebuah REST API documentation platform. Jawab pertanyaan tentang endpoint, cara pakai, error, dll. Singkat dan jelas. Pakai bahasa Indonesia casual.

Data endpoint yang tersedia:
${JSON.stringify(dat, null, 2)}`
          },
          ...chatHistory
        ]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Maaf, ga bisa jawab sekarang.";
    chatHistory.push({role:"assistant", content:reply});
    typing.style.display="none";
    appendMsg("bot", reply);
  } catch(e) {
    typing.style.display="none";
    appendMsg("bot","Maaf, koneksi ke AI bermasalah. Coba lagi ya.");
  }
    }

function appendMsg(role, text){
  const wrap = document.getElementById("chatMsgs");
  const typing = document.getElementById("chatTyping");
  const div = document.createElement("div"); div.className=`msg ${role}`;
  div.innerHTML=`<div class="msg-bubble">${text}</div><div class="msg-time">${nowTime()}</div>`;
  wrap.insertBefore(div, typing);
  scrollChat();
}

function scrollChat(){
  const wrap = document.getElementById("chatMsgs");
  setTimeout(()=>wrap.scrollTop=wrap.scrollHeight, 50);
}

function toggleChat(){
  chatOpen=!chatOpen;
  const w=document.getElementById("chatWindow");
  w.classList.toggle("open",chatOpen);
  const badge=document.querySelector(".chat-badge");
  if(badge) badge.style.display=chatOpen?"none":"block";
  if(chatOpen) scrollChat();
}

document.getElementById("chatInput").addEventListener("keydown",e=>{
  if(e.key==="Enter") sendChat();
});

loadData();
                                      
