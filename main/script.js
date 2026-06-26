let dat = {};
let activeApi = null, activeFilter = "ALL", statsFilter = "today", chatOpen = false;
let chatHistory = [];

const catColors = ["#f472b6","#a78bfa","#60a5fa","#fb923c","#fbbf24","#4ade80","#38bdf8","#e879f9","#f87171","#34d399"];

const mocks = {
  json: {status:true,creator:"core.api",result:{title:"Example Result",data:"Response data akan muncul disini",timestamp:new Date().toISOString()}},
  image: {status:true,creator:"core.api",result:"https://c.termai.cc/i149/G8LBUFy.jpg"},
  video: {status:true,creator:"core.api",result:"https://c.termai.cc/v134/M6zwly.mp4"},
  audio: {status:true,creator:"core.api",result:"https://c.termai.cc/a193/aNvYZ.mp3"}
};

const dlIcon = `<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
const openIcon = `<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

function base(){ return window.location.origin; }
function fmtNum(n){ if(n>=1000000)return(n/1000000).toFixed(1)+"M"; if(n>=1000)return(n/1000).toFixed(1)+"k"; return String(n); }
function nowTime(){ return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); }

// ── STARS ──
(()=>{
  const c = document.getElementById("stars");
  for(let i=0;i<60;i++){
    const s = document.createElement("div"); s.className="star";
    const sz = Math.random()*1.8+.4;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;--d:${3+Math.random()*5}s;--o:${.06+Math.random()*.35};animation-delay:${Math.random()*6}s`;
    c.appendChild(s);
  }
})();

// ── LOAD DATA ──
async function loadData(){
  try {
    const res = await fetch("/api/list");
    const json = await res.json();
    if(json.status && json.data) dat = json.data;
    else throw new Error("bad response");
  } catch(e){
    console.warn("fetch /api/list failed:", e.message);
  }
  afterLoad();
}

function afterLoad(){
  initNavStats();
  initTabs();
  renderGrid();
  initHeroUrl();
  buildTwLines();
  setTimeout(typeTick, 900);
}

// ── NAV STATS ──
function initNavStats(){
  let total=0, active=0;
  for(const cat of Object.values(dat)) for(const api of Object.values(cat)){ total++; if(api.status)active++; }
  document.getElementById("pTotal").textContent = total+" APIs";
  document.getElementById("pActive").textContent = active+" Active";
  const sTotal = document.getElementById("sTotal");
  const sActive = document.getElementById("sActive");
  const sCat = document.getElementById("sCat");
  if(sTotal) sTotal.textContent = total;
  if(sActive) sActive.textContent = active;
  if(sCat) sCat.textContent = Object.keys(dat).length;
}

// ── HERO URL ──
function initHeroUrl(){
  const el = document.getElementById("heroUrl");
  if(el) el.textContent = base()+"/kategory/file";
}
function copyEp(btn){
  navigator.clipboard.writeText(base()+"/kategory/file").then(()=>{
    btn.textContent="copied!"; setTimeout(()=>btn.textContent="copy",1500);
  });
}

// ── TABS ──
function initTabs(){
  const wrap = document.getElementById("tabs"); wrap.innerHTML="";
  ["ALL",...Object.keys(dat)].forEach(cat=>{
    const b = document.createElement("button");
    b.className="tab"+(cat==="ALL"?" active":""); b.dataset.cat=cat; b.textContent=cat;
    b.onclick=()=>{
      activeFilter=cat;
      document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.cat===cat));
      renderGrid();
    };
    wrap.appendChild(b);
  });
}

// ── GRID ──
function renderGrid(){
  const grid=document.getElementById("grid"); grid.innerHTML="";
  let idx=0;
  for(const [cat,apis] of Object.entries(dat)){
    if(activeFilter!=="ALL"&&cat!==activeFilter) continue;
    const group=document.createElement("div"); group.className="cat-group";
    if(activeFilter==="ALL"){
      const title=document.createElement("div"); title.className="cat-group-title";
      title.textContent=cat; group.appendChild(title);
    }
    const gg=document.createElement("div"); gg.className="cat-group-grid";
    for(const [name,api] of Object.entries(apis)){
      const pc=Object.keys(api.params).length;
      const card=document.createElement("div"); card.className="card";
      card.style.setProperty("--delay",(idx*0.045+.05)+"s");
      card.innerHTML=`<div class="card-top"><span class="cat-badge">${cat}</span><span class="sdot ${api.status?"on":"off"}"></span></div><div class="card-name">${name}</div><div class="card-desc">${api.description}</div><div class="card-foot"><span class="tbadge ${api.type}">${api.type}</span><span class="pcount">${pc>0?pc+" param"+(pc>1?"s":""):"no params"}</span></div>`;
      card.onclick=()=>openModal(cat,name,api);
      gg.appendChild(card); idx++;
    }
    group.appendChild(gg); grid.appendChild(group);
  }
}

// ── URL BUILDER ──
function buildUrlHtml(api){
  const keys=Object.keys(api.params);
  let html=`<span class="ep-base">${base()}/</span><span class="ep-name">${api.path}</span>`;
  if(!keys.length) return html;
  html+=`<span class="ep-q">?</span>`;
  html+=keys.map((k,i)=>{
    const val=document.getElementById("inp_"+k)?.value||"";
    return (i>0?`<span class="ep-q">&amp;</span>`:"")+`<span class="ep-key">${k}</span><span class="ep-q">=</span>`+(val?`<span class="ep-val">${encodeURIComponent(val)}</span>`:"");
  }).join("");
  return html;
}
function buildUrlRaw(api){
  const keys=Object.keys(api.params);
  const url=base()+"/"+api.path;
  if(!keys.length) return url;
  const filled={};
  keys.forEach(k=>{ const v=document.getElementById("inp_"+k)?.value; if(v)filled[k]=v; });
  if(!Object.keys(filled).length) return url;
  return url+"?"+keys.map(k=>filled[k]?`${k}=${encodeURIComponent(filled[k])}`:`${k}=`).join("&");
}

// ── MODAL ──
function openModal(cat,name,api){
  activeApi={cat,name,...api};
  document.getElementById("mCat").textContent=cat;
  document.getElementById("mTitle").textContent=name;
  document.getElementById("mDesc").textContent=api.description;
  const mt=document.getElementById("mType"); mt.className=`mtag tbadge ${api.type}`; mt.textContent=api.type;
  const st=document.getElementById("mStat"); st.textContent=api.status?"● Active":"● Inactive"; st.className="mstatus "+(api.status?"on":"off");
  const paramsEl=document.getElementById("mParams"); paramsEl.innerHTML="";
  const keys=Object.keys(api.params);
  if(!keys.length) paramsEl.innerHTML=`<div class="no-params">— tidak ada parameter</div>`;
  else keys.forEach(k=>{ const row=document.createElement("div"); row.className="param-row"; row.innerHTML=`<span class="pk">${k}</span><span class="pv">${api.params[k]}</span>`; paramsEl.appendChild(row); });
  const inputsEl=document.getElementById("mInputs"); inputsEl.innerHTML="";
  keys.forEach(k=>{ const row=document.createElement("div"); row.className="input-row"; row.innerHTML=`<label class="input-label">${k}</label><input class="tinput" id="inp_${k}" placeholder="${api.params[k]}" oninput="updatePreview()"/>`; inputsEl.appendChild(row); });
  updatePreview(); clearResult();
  document.querySelector(".modal-inner").scrollTop=0;
  document.getElementById("overlay").classList.add("open");
}
function updatePreview(){ if(!activeApi) return; document.getElementById("epPreview").innerHTML=buildUrlHtml(activeApi); }
function clearResult(){ document.getElementById("resultWrap").classList.remove("show"); document.getElementById("resultContent").innerHTML=""; }
function closeModal(){ document.getElementById("overlay").classList.remove("open"); activeApi=null; }

// ── RUN API ──
async function runApi(){
  if(!activeApi) return;
  const btn=document.getElementById("runBtn"),spinner=document.getElementById("runSpinner"),label=document.getElementById("runLabel");
  btn.disabled=true; spinner.style.display="block"; label.textContent="Loading...";
  clearResult();
  const url=buildUrlRaw(activeApi), type=activeApi.type;
  const wrap=document.getElementById("resultWrap"),content=document.getElementById("resultContent"),rl=document.getElementById("rTypeLabel");
  rl.className=`tbadge ${type}`; rl.textContent=type;
  try {
    const res=await fetch(url); const json=await res.json();
    if(type==="json"){ const box=document.createElement("div"); box.className="json-box ok"; box.textContent=JSON.stringify(json,null,2); content.appendChild(box); }
    else if(type==="image"){ const u=json?.result||json?.url||json?.data?.url||""; if(u){ const w=document.createElement("div"); w.className="img-result"; w.innerHTML=`<img src="${u}" loading="lazy"/><div class="media-bar"><div class="media-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${u}" target="_blank" class="dl-btn">${openIcon}</a></div>`; content.appendChild(w); } else { const box=document.createElement("div"); box.className="json-box ok"; box.textContent=JSON.stringify(json,null,2); content.appendChild(box); } }
    else if(type==="video"){ const u=json?.result||json?.url||json?.data?.url||""; if(u){ const w=document.createElement("div"); w.className="video-result"; w.innerHTML=`<video controls src="${u}"></video><div class="media-bar"><div class="media-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${u}" target="_blank" class="dl-btn">${openIcon}</a></div>`; content.appendChild(w); } else { const box=document.createElement("div"); box.className="json-box ok"; box.textContent=JSON.stringify(json,null,2); content.appendChild(box); } }
    else if(type==="audio"){ const u=json?.result||json?.url||json?.data?.url||""; if(u){ const w=document.createElement("div"); w.className="audio-result"; w.innerHTML=`<audio controls src="${u}"></audio><div class="audio-actions"><div class="audio-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a></div>`; content.appendChild(w); } else { const box=document.createElement("div"); box.className="json-box ok"; box.textContent=JSON.stringify(json,null,2); content.appendChild(box); } }
  } catch(e){ const box=document.createElement("div"); box.className="json-box err"; box.textContent="Error: "+e.message; content.appendChild(box); }
  wrap.classList.add("show");
  btn.disabled=false; spinner.style.display="none"; label.textContent="▶  Run Request";
  setTimeout(()=>document.querySelector(".modal-inner").scrollTo({top:99999,behavior:"smooth"}),80);
}

// ── SIDEBAR ──
function toggleSidebar(){
  const sb=document.getElementById("sidebar"),bd=document.getElementById("sbBackdrop"),btn=document.getElementById("menuBtn");
  const open=sb.classList.toggle("open"); bd.classList.toggle("show",open); btn.classList.toggle("open",open);
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
  if(id==="stats") renderStats();
}

// ── STATS (generated from dat) ──
function buildStatsData(){
  const cats=Object.keys(dat);
  const total=cats.length;
  const catColorMap={};
  cats.forEach((c,i)=>catColorMap[c]=catColors[i%catColors.length]);

  const allApis=[];
  for(const [cat,apis] of Object.entries(dat)) for(const [name,api] of Object.entries(apis)) allApis.push({name,cat,status:api.status});

  const topEndpoints=allApis.slice(0,7).map((ep,i)=>({
    name:ep.name, cat:ep.cat,
    hits:Math.round(2500-i*280+Math.random()*200),
    color:catColorMap[ep.cat]||catColors[i%catColors.length]
  }));

  const totalPct=cats.reduce((a)=>a+1,0);
  const perKategori=cats.map((cat,i)=>({
    name:cat,
    val:Math.round(100/cats.length + (i===0?3:i===1?2:i===2?1:-1)),
    color:catColorMap[cat]
  }));
  const sum=perKategori.reduce((a,b)=>a+b.val,0);
  if(perKategori.length) perKategori[0].val+=100-sum;

  const responseTime=allApis.slice(0,6).map(ep=>({
    name:ep.name,
    ms:Math.round(80+Math.random()*400)
  }));

  const statusTable=allApis.slice(0,8).map(ep=>({
    name:ep.name, cat:ep.cat,
    hits:Math.round(Math.random()*3000+100),
    status:ep.status
  }));

  return {
    requests:Math.round(7000+Math.random()*3000),
    uptime:99.2+Math.random()*0.7,
    avgMs:Math.round(130+Math.random()*60),
    activeEp:allApis.filter(a=>a.status).length,
    topEndpoints, perKategori, responseTime, statusTable
  };
}

function renderStats(){
  const d=buildStatsData();
  countUp(document.getElementById("sc-req"),d.requests,"",900);
  setTimeout(()=>{ document.getElementById("sc-up").textContent=d.uptime.toFixed(1)+"%"; },100);
  setTimeout(()=>{ document.getElementById("sc-ms").textContent=d.avgMs+"ms"; },150);
  setTimeout(()=>{ document.getElementById("sc-ep").textContent=d.activeEp; },200);
  renderBars(d.topEndpoints);
  renderRing(d.perKategori);
  renderRespTime(d.responseTime);
  renderStatusTable(d.statusTable);
}

function setStatsFilter(f,btn){
  document.querySelectorAll(".fbtn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active"); statsFilter=f; renderStats();
}
function doRefresh(){
  const btn=document.getElementById("refreshBtn"); btn.classList.add("spin");
  setTimeout(()=>{ renderStats(); btn.classList.remove("spin"); },600);
}

function countUp(el,target,suffix,dur){
  const start=Date.now();
  const tick=()=>{ const p=Math.min((Date.now()-start)/dur,1); el.textContent=fmtNum(Math.round((1-Math.pow(1-p,3))*target))+(suffix||""); if(p<1)requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function renderBars(data){
  const el=document.getElementById("barList"); el.innerHTML="";
  const max=data[0]?.hits||1;
  data.forEach(ep=>{ const pct=Math.round(ep.hits/max*100); const div=document.createElement("div"); div.className="bar-item"; div.innerHTML=`<div class="bar-meta"><span class="bar-name">${ep.name}</span><div class="bar-stats"><span class="bar-num">${fmtNum(ep.hits)}</span><span class="bar-pct">${pct}%</span></div></div><div class="bar-track"><div class="bar-fill" data-w="${pct}" style="background:${ep.color}"></div></div>`; el.appendChild(div); });
  setTimeout(()=>el.querySelectorAll(".bar-fill").forEach(b=>b.style.width=b.dataset.w+"%"),80);
}
function renderRing(data){
  const svg=document.getElementById("ringSvg"); svg.innerHTML="";
  const legend=document.getElementById("ringLegend"); legend.innerHTML="";
  const cx=55,cy=55,r=40,stroke=12,circ=2*Math.PI*r; let offset=0;
  const bg=document.createElementNS("http://www.w3.org/2000/svg","circle");
  bg.setAttribute("cx",cx);bg.setAttribute("cy",cy);bg.setAttribute("r",r);bg.setAttribute("fill","none");bg.setAttribute("stroke","rgba(255,255,255,.05)");bg.setAttribute("stroke-width",stroke);svg.appendChild(bg);
  data.forEach(cat=>{ const len=(cat.val/100)*circ; const circle=document.createElementNS("http://www.w3.org/2000/svg","circle"); circle.setAttribute("cx",cx);circle.setAttribute("cy",cy);circle.setAttribute("r",r);circle.setAttribute("fill","none");circle.setAttribute("stroke",cat.color);circle.setAttribute("stroke-width",stroke);circle.setAttribute("stroke-dasharray",`${len} ${circ-len}`);circle.setAttribute("stroke-dashoffset",-offset);circle.setAttribute("stroke-linecap","round");circle.style.transform="rotate(-90deg)";circle.style.transformOrigin="55px 55px";svg.appendChild(circle);offset+=len; const li=document.createElement("div");li.className="ring-item";li.innerHTML=`<div class="ring-dot" style="background:${cat.color}"></div><div class="ring-lname">${cat.name}</div><div class="ring-lval">${cat.val}%</div>`;legend.appendChild(li); });
}
function renderRespTime(data){
  const el=document.getElementById("respList"); el.innerHTML="";
  const max=Math.max(...data.map(d=>d.ms));
  data.forEach(d=>{ const cls=d.ms<200?"fast":d.ms<500?"mid":"slow"; const pct=Math.round(d.ms/max*100); const row=document.createElement("div"); row.className="resp-row"; row.innerHTML=`<span class="resp-name">${d.name}</span><div class="resp-right"><div class="resp-bar"><div class="resp-fill" data-w="${pct}" style="background:${cls==="fast"?"var(--green)":cls==="mid"?"var(--amber)":"var(--red)"}"></div></div><span class="resp-ms ${cls}">${d.ms}ms</span></div>`; el.appendChild(row); });
  setTimeout(()=>el.querySelectorAll(".resp-fill").forEach(b=>b.style.width=b.dataset.w+"%"),80);
}
function renderStatusTable(data){
  const tb=document.getElementById("statusTable"); tb.innerHTML="";
  data.forEach(ep=>{ const tr=document.createElement("tr"); tr.innerHTML=`<td><span class="sdot2 ${ep.status?"on":"off"}"></span>${ep.name}</td><td><span class="cat-pill">${ep.cat}</span></td><td class="hit-num">${fmtNum(ep.hits)}</td><td style="font-family:var(--mono);font-size:.72rem;color:${ep.status?"var(--green)":"var(--red)"}">${ep.status?"Active":"Down"}</td>`; tb.appendChild(tr); });
}
function renderUptime(){
  const el=document.getElementById("uptimeBars"); if(!el) return; el.innerHTML="";
  let downDays=0; const vals=[];
  for(let i=0;i<60;i++){ const up=Math.random()>0.03; if(!up)downDays++; vals.push({up,h:up?Math.round(20+Math.random()*30):Math.round(4+Math.random()*10),day:i+1}); }
  document.getElementById("uptimePct").textContent=(((60-downDays)/60)*100).toFixed(1)+"% uptime";
  vals.forEach((v,i)=>{ const bar=document.createElement("div"); bar.className="ubar"; bar.style.cssText=`height:${v.h}px;background:${v.up?"var(--green)":"var(--red)"};opacity:${v.up?.7:.9}`; bar.innerHTML=`<div class="ubar-tip">${v.up?"✓ Online":"✗ Down"} · Hari ke-${i+1}</div>`; el.appendChild(bar); });
}

// ── APIKEY ──
let keyShown=false, keyReal="core_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
function toggleKey(btn){
  const el=document.getElementById("apikeyText"); keyShown=!keyShown;
  el.textContent=keyShown?keyReal:"core_••••••••••••••••••••••••••••••••";
  btn.textContent=keyShown?"hide":"show";
  if(keyShown) navigator.clipboard.writeText(keyReal).then(()=>{ btn.textContent="copied!"; setTimeout(()=>btn.textContent="hide",1500); });
}

// ── TYPEWRITER (from dat) ──
let twLines=[], twIdx=0, twPos=0, twDeleting=false;
function buildTwLines(){
  twLines=[];
  for(const [cat,apis] of Object.entries(dat)) for(const [name,api] of Object.entries(apis)){
    const keys=Object.keys(api.params);
    let line=base()+"/"+api.path;
    if(keys.length) line+="?"+keys.map(k=>k+"=").join("&");
    twLines.push(line);
  }
  if(!twLines.length) twLines=[base()+"/download/tiktok?url="];
}
function typeTick(){
  const el=document.getElementById("twText"); if(!el||!twLines.length) return;
  const cur=twLines[twIdx%twLines.length];
  if(!twDeleting){ twPos++; el.textContent=cur.slice(0,twPos); if(twPos===cur.length){ setTimeout(()=>{twDeleting=true;typeTick();},1800); return; } setTimeout(typeTick,36); }
  else { twPos--; el.textContent=cur.slice(0,twPos); if(twPos===0){twDeleting=false;twIdx++;setTimeout(typeTick,380);return;} setTimeout(typeTick,16); }
}

// ── LIVE CHAT ──
function toggleChat(){
  chatOpen=!chatOpen;
  document.getElementById("chatWindow").classList.toggle("open",chatOpen);
  if(chatOpen) document.getElementById("chatInput").focus();
}
async function sendChat(){
  const input=document.getElementById("chatInput");
  const msg=input.value.trim(); if(!msg) return;
  appendMsg("user",msg); input.value="";
  chatHistory.push({role:"user",content:msg});
  const typing=document.getElementById("chatTyping");
  typing.style.display="flex"; scrollChat();
  try {
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chatHistory,dat})});
    const json=await res.json();
    const reply=json?.result||"Maaf, ga bisa jawab sekarang.";
    chatHistory.push({role:"assistant",content:reply});
    typing.style.display="none"; appendMsg("bot",reply);
  } catch(e){ typing.style.display="none"; appendMsg("bot","Koneksi ke AI bermasalah."); }
  scrollChat();
}
function appendMsg(role,text){
  const msgs=document.getElementById("chatMsgs");
  const div=document.createElement("div"); div.className="msg "+role;
  div.innerHTML='<div class="msg-bubble">'+text+'</div><div class="msg-time">'+nowTime()+'</div>';
  msgs.insertBefore(div,document.getElementById("chatTyping"));
}
function scrollChat(){ const m=document.getElementById("chatMsgs"); if(m) setTimeout(()=>m.scrollTo({top:m.scrollHeight,behavior:"smooth"}),50); }

document.getElementById("chatInput").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();} });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){closeModal();closeSidebar();} });

renderUptime();
loadData();
