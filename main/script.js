let dat={},activeApi=null,activeFilter="ALL",chatOpen=false,activeCodeTab="curl",statusShown=false,chatHistory=[],lastResultJson="";
const dlIcon=`<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
const openIcon=`<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const copyIcon=`<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
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
function base(){return window.location.origin;}
function nowTime(){return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});}
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
    if(json.status && json.data) dat = json.data;
    else throw new Error("bad response");
  } catch(e){
    console.warn("fetch /api/list failed:", e.message);
  }
  afterLoad();
}

function afterLoad(){initNavStats();initTabs();renderGrid();initHeroUrl();runHeroTerminal();}
function initNavStats(){
  let total=0,active=0;
  for(const cat of Object.values(dat))for(const api of Object.values(cat)){total++;if(api.status)active++;}
  document.getElementById("pTotal").textContent=total+" APIs";
  document.getElementById("pActive").textContent=active+" Active";
}
function initHeroUrl(){const el=document.getElementById("heroUrl");if(el)el.textContent=base()+"/api/info/api";}
function copyEp(btn){navigator.clipboard.writeText(base()+"/api/info/api").then(()=>{btn.textContent="copied!";setTimeout(()=>btn.textContent="copy",1500);});}
function initTabs(){
  const wrap=document.getElementById("tabs");wrap.innerHTML="";
  ["ALL",...Object.keys(dat)].forEach(cat=>{
    const b=document.createElement("button");
    b.className="tab"+(cat==="ALL"?" active":"");b.dataset.cat=cat;b.textContent=cat;
    b.onclick=()=>{activeFilter=cat;document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.cat===cat));renderGrid();};
    wrap.appendChild(b);
  });
}
function renderGrid(){
  const grid=document.getElementById("grid");grid.innerHTML="";
  const q=(document.getElementById("searchInput")?.value||"").toLowerCase();
  let idx=0;
  for(const [cat,apis] of Object.entries(dat)){
    if(activeFilter!=="ALL"&&cat!==activeFilter)continue;
    const filtered=Object.entries(apis).filter(([name,api])=>!q||name.toLowerCase().includes(q)||api.description.toLowerCase().includes(q)||cat.toLowerCase().includes(q));
    if(!filtered.length)continue;
    const group=document.createElement("div");group.className="cat-group";
    if(activeFilter==="ALL"){const title=document.createElement("div");title.className="cat-group-title";title.textContent=cat;group.appendChild(title);}
    const gg=document.createElement("div");gg.className="cat-group-grid";
    for(const [name,api] of filtered){
      const pc=Object.keys(api.params).length;
      const card=document.createElement("div");card.className="card";
      card.style.setProperty("--delay",(idx*0.045+.05)+"s");
      card.innerHTML=`<div class="card-top"><span class="cat-badge">${cat}</span><span class="sdot ${api.status?"on":"off"}"></span></div><div class="card-name">${name}</div><div class="card-desc">${api.description}</div><div class="card-foot"><span class="tbadge ${api.type}">${api.type}</span><span class="pcount">${pc>0?pc+" param"+(pc>1?"s":""):"no params"}</span></div>`;
      card.onclick=()=>openModal(cat,name,api);
      gg.appendChild(card);idx++;
    }
    group.appendChild(gg);grid.appendChild(group);
  }
  if(!grid.children.length)grid.innerHTML=`<div class="empty-search">Tidak ada endpoint ditemukan untuk "<span>${q}</span>"</div>`;
}
function buildUrlRaw(api){
  const keys=Object.keys(api.params);
  const url=base()+"/"+api.path;
  if(!keys.length)return url;
  const filled={};
  keys.forEach(k=>{const v=document.getElementById("inp_"+k)?.value;if(v)filled[k]=v;});
  if(!Object.keys(filled).length)return url;
  return url+"?"+keys.map(k=>filled[k]?`${k}=${encodeURIComponent(filled[k])}`:`${k}=`).join("&");
}
function buildUrlHtml(api){
  const keys=Object.keys(api.params);
  let html=`<span class="ep-base">${base()}/</span><span class="ep-name">${api.path}</span>`;
  if(!keys.length)return html;
  html+=`<span class="ep-q">?</span>`;
  html+=keys.map((k,i)=>{const val=document.getElementById("inp_"+k)?.value||"";return(i>0?`<span class="ep-q">&amp;</span>`:"")+`<span class="ep-key">${k}</span><span class="ep-q">=</span>`+(val?`<span class="ep-val">${encodeURIComponent(val)}</span>`:"");}).join("");
  return html;
}
function buildCodeSnippet(api,lang){
  const url=buildUrlRaw(api);
  if(lang==="curl")return`curl -X GET \\\n  "${url}" \\\n  -H "Accept: application/json"`;
  if(lang==="js")return`const res = await fetch(\n  "${url}"\n);\nconst data = await res.json();\nconsole.log(data);`;
  if(lang==="py")return`import requests\n\nurl = "${url}"\nres = requests.get(url)\ndata = res.json()\nprint(data)`;
  if(lang==="php")return`<?php\n$res = file_get_contents("${url}");\n$data = json_decode($res, true);\nprint_r($data);`;
  if(lang==="dart")return`import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nfinal res = await http.get(Uri.parse(\n  "${url}"\n));\nfinal data = jsonDecode(res.body);\nprint(data);`;
  if(lang==="go")return`package main\n\nimport (\n  "fmt"\n  "io"\n  "net/http"\n)\n\nfunc main() {\n  res, _ := http.Get(\n    "${url}",\n  )\n  defer res.Body.Close()\n  body, _ := io.ReadAll(res.Body)\n  fmt.Println(string(body))\n}`;
  return "";
}

function renderCodeBox(){if(!activeApi)return;document.getElementById("codeContent").textContent=buildCodeSnippet(activeApi,activeCodeTab);}
function setCodeTab(tab){activeCodeTab=tab;document.querySelectorAll(".code-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===tab));renderCodeBox();}
function copyCode(){
  const text=document.getElementById("codeContent").textContent;
  navigator.clipboard.writeText(text).then(()=>{const btn=document.querySelector(".code-copy");btn.textContent="copied!";setTimeout(()=>btn.textContent="copy",1500);});
}
function copyUrl(){
  navigator.clipboard.writeText(buildUrlRaw(activeApi)).then(()=>{const btn=document.querySelector(".ep-copy-btn");btn.textContent="copied!";setTimeout(()=>btn.textContent="copy url",1500);});
}
function toggleStatus(){statusShown=!statusShown;document.getElementById("statusPanel").classList.toggle("show",statusShown);}
function renderStatusCodes(){
  const grid=document.getElementById("statusGrid");grid.innerHTML="";
  const table=document.createElement("table");table.className="status-table";
  table.innerHTML=`<thead><tr><th>Status</th><th>Arti</th></tr></thead>`;
  const tbody=document.createElement("tbody");
  STATUS_CODES.forEach(s=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><span class="status-code ${s.cls}">${s.icon} ${s.code} ${s.label}</span></td><td class="status-desc">${s.desc}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);grid.appendChild(table);
}
function updatePreview(){if(!activeApi)return;document.getElementById("epPreview").innerHTML=buildUrlHtml(activeApi);renderCodeBox();}
function clearResult(){document.getElementById("resultWrap").classList.remove("show");document.getElementById("resultContent").innerHTML="";document.getElementById("resultActions").innerHTML="";lastResultJson="";}
function openModal(cat,name,api){
  activeApi={cat,name,...api};statusShown=false;
  document.getElementById("statusPanel").classList.remove("show");
  document.getElementById("mCat").textContent=cat;
  document.getElementById("mTitle").textContent=name;
  document.getElementById("mDesc").textContent=api.description;
  const mt=document.getElementById("mType");mt.className=`mtag tbadge ${api.type}`;mt.textContent=api.type;
  const st=document.getElementById("mStat");st.textContent=api.status?"● Active":"● Inactive";st.className="mstatus "+(api.status?"on":"off");
  const paramsEl=document.getElementById("mParams");paramsEl.innerHTML="";
  const keys=Object.keys(api.params);
  if(!keys.length)paramsEl.innerHTML=`<div class="no-params">— tidak ada parameter</div>`;
  else keys.forEach(k=>{const row=document.createElement("div");row.className="param-row";row.innerHTML=`<span class="pk">${k}</span><span class="pv">${api.params[k]}</span>`;paramsEl.appendChild(row);});
  const inputsEl=document.getElementById("mInputs");inputsEl.innerHTML="";
  keys.forEach(k=>{const row=document.createElement("div");row.className="input-row";row.innerHTML=`<label class="input-label">${k}</label><input class="tinput" id="inp_${k}" placeholder="${api.params[k]}" oninput="updatePreview()"/>`;inputsEl.appendChild(row);});
  const tabsEl=document.getElementById("codeTabs");tabsEl.innerHTML="";
  ["curl","js","py","php","dart","go"].forEach(t=>{const b=document.createElement("button");b.className="code-tab"+(t===activeCodeTab?" active":"");b.dataset.tab=t;b.innerHTML=t==="curl"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> cURL`
  : t==="js"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="var(--amber)"><rect width="24" height="24" rx="3"/><text x="4" y="18" font-size="14" fill="#000" font-weight="bold">JS</text></svg> JavaScript`
  : t==="py"
  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11.9 2C9.3 2 7.5 3.2 7.5 4.8V6.5h4.5v.5H5.8C4.2 7 3 8.5 3 10.5c0 2.1 1.2 3.5 2.8 3.5H7v-1.7c0-1.8 1.5-3.3 3.3-3.3h4.4c1.5 0 2.8-1.2 2.8-2.8V4.8C17.5 3.2 15.5 2 11.9 2zm-2.4 1.8c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z" fill="#3776AB"/><path d="M12.1 22c2.6 0 4.4-1.2 4.4-2.8v-1.7h-4.5v-.5h6.2c1.6 0 2.8-1.5 2.8-3.5 0-2.1-1.2-3.5-2.8-3.5H17v1.7c0 1.8-1.5 3.3-3.3 3.3H9.3c-1.5 0-2.8 1.2-2.8 2.8v2.2C6.5 20.8 8.5 22 12.1 22zm2.4-1.8c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" fill="#FFD43B"/></svg> Python`
  : t==="php"
  ? `<svg width="11" height="11" viewBox="0 0 128 128"><path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0z" fill="#8993be"/><path d="M32 48h12l4 20 10-20h12l-16 32H42z" fill="#fff"/><path d="M76 48h18c6 0 10 4 10 10 0 10-8 16-18 16h-6l-2 6H66zm10 6l-4 14h4c4 0 8-2 8-8 0-4-2-6-8-6z" fill="#fff"/></svg> PHP`
  : t==="dart"
  ? `<svg width="11" height="11" viewBox="0 0 24 24"><path d="M4.11 5.45L5.45 4.1s.6-.6 1.5-.6h7.3l3.85 3.85-9.7 9.7-4.29-4.29s-.6-.6-.6-1.5V5.96s0-.9.6-1.51z" fill="#01FFFF" opacity=".8"/><path d="M18.1 7.35l1.35 1.35s.6.6.6 1.5v5.59s0 .9-.6 1.5l-1.35 1.35-5-5z" fill="#01FFFF" opacity=".6"/><path d="M5.45 19.9l-1.34-1.35s-.6-.6-.6-1.5v-.75l4.85-4.85 5 5z" fill="#00B4AB"/><path d="M14.25 3.5H6.95s-.9 0-1.5.6L4.1 5.45l9.7 9.7 5-5z" fill="#00B4AB"/></svg> Dart`
  : `<svg width="11" height="11" viewBox="0 0 24 24"><path d="M2 12l4.5-8.5h11L22 12l-4.5 8.5h-11z" fill="none" stroke="#00ACD7" stroke-width="1.5"/><text x="7" y="16" font-size="7" fill="#00ACD7" font-weight="bold">Go</text></svg> Go`;
b.onclick=()=>setCodeTab(t);tabsEl.appendChild(b);});
  renderStatusCodes();updatePreview();clearResult();
  document.querySelector(".modal-inner").scrollTop=0;
  document.getElementById("overlay").classList.add("open");
}

function closeModal(){document.getElementById("overlay").classList.remove("open");activeApi=null;}
async function runApi(){
  if(!activeApi)return;
  const btn=document.getElementById("runBtn"),spinner=document.getElementById("runSpinner"),label=document.getElementById("runLabel");
  btn.disabled=true;spinner.style.display="block";label.textContent="Loading...";
  clearResult();
  const url=buildUrlRaw(activeApi),type=activeApi.type;
  const wrap=document.getElementById("resultWrap"),content=document.getElementById("resultContent"),rl=document.getElementById("rTypeLabel"),actions=document.getElementById("resultActions");
  rl.className=`tbadge ${type}`;rl.textContent=type;
  try{
    const res=await fetch(url);
    const text=await res.text();
    let json;try{json=JSON.parse(text);}catch{json=text;}
    if(type==="json"){
      lastResultJson=typeof json==="object"?JSON.stringify(json,null,2):json;
      const box=document.createElement("div");box.className="json-box";box.textContent=lastResultJson;content.appendChild(box);
      actions.innerHTML=`<button class="result-action-btn" onclick="copyResult()">${copyIcon} Copy</button>`;
    }else if(type==="image"){
      const u=json?.result?.url||json?.result||json?.url||json?.data?.url||"";
      if(u){const w=document.createElement("div");w.className="img-result";w.innerHTML=`<img src="${u}" loading="lazy"/><div class="media-bar"><div class="media-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${u}" target="_blank" class="dl-btn">${openIcon}</a></div>`;content.appendChild(w);actions.innerHTML=`<a href="${u}" download target="_blank" class="result-action-btn">${dlIcon} Download</a>`;}
      else{const box=document.createElement("div");box.className="json-box";box.textContent=typeof json==="object"?JSON.stringify(json,null,2):json;content.appendChild(box);}
    }else if(type==="video"){
      const u=json?.result?.url||json?.result||json?.url||json?.data?.url||"";
      if(u){const w=document.createElement("div");w.className="video-result";w.innerHTML=`<video controls src="${u}"></video><div class="media-bar"><div class="media-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a><a href="${u}" target="_blank" class="dl-btn">${openIcon}</a></div>`;content.appendChild(w);actions.innerHTML=`<a href="${u}" download target="_blank" class="result-action-btn">${dlIcon} Download</a>`;}
      else{const box=document.createElement("div");box.className="json-box";box.textContent=typeof json==="object"?JSON.stringify(json,null,2):json;content.appendChild(box);}
    }else if(type==="audio"){
      const u=json?.result?.url||json?.result||json?.url||json?.data?.url||"";
      if(u){const w=document.createElement("div");w.className="audio-result";w.innerHTML=`<audio controls src="${u}"></audio><div class="audio-actions"><div class="audio-url"><a href="${u}" target="_blank">${u}</a></div><a href="${u}" download target="_blank" class="dl-btn">${dlIcon} Download</a></div>`;content.appendChild(w);actions.innerHTML=`<a href="${u}" download target="_blank" class="result-action-btn">${dlIcon} Download</a>`;}
      else{const box=document.createElement("div");box.className="json-box";box.textContent=typeof json==="object"?JSON.stringify(json,null,2):json;content.appendChild(box);}
    }
  }catch(e){const box=document.createElement("div");box.className="json-box err";box.textContent="Error: "+e.message;content.appendChild(box);}
  wrap.classList.add("show");
  btn.disabled=false;spinner.style.display="none";label.textContent="▶  Run Request";
  setTimeout(()=>document.querySelector(".modal-inner").scrollTo({top:99999,behavior:"smooth"}),80);
}
function copyResult(){
  navigator.clipboard.writeText(lastResultJson).then(()=>{
    const btn=document.querySelector("#resultActions .result-action-btn");
    if(btn){btn.innerHTML=`${copyIcon} Copied!`;setTimeout(()=>btn.innerHTML=`${copyIcon} Copy`,1500);}
  });
}
function toggleSidebar(){
  const sb=document.getElementById("sidebar"),bd=document.getElementById("sbBackdrop"),btn=document.getElementById("menuBtn");
  const open=sb.classList.toggle("open");bd.classList.toggle("show",open);btn.classList.toggle("open",open);
}
function closeSidebar(){document.getElementById("sidebar").classList.remove("open");document.getElementById("sbBackdrop").classList.remove("show");document.getElementById("menuBtn").classList.remove("open");}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+id).classList.add("active");
  document.querySelectorAll(".sb-item").forEach(i=>i.classList.remove("active"));
  document.getElementById("nav-"+id)?.classList.add("active");
  closeSidebar();
}
let twLines=[],twIdx=0,twPos=0,twDeleting=false;
let htRunning=false;
async function runHeroTerminal(){
const htLines=[
  ["$ boot core.api --env=production","c-cmd",0],
  ["","",80],
  ["  Initializing boot sequence...","c-muted",60],
  ["","",40],
  ["  ✔ Loading configuration","c-ok",120],
  ["  ✔ Connecting to database","c-ok",120],
  ["  ✔ Initializing API modules","c-ok",120],
  ["  ✔ Loading route handlers","c-ok",120],
  ["  ✔ Starting HTTP server","c-ok",120],
  ["  ✔ Verifying environment","c-ok",120],
  ["  ✔ Server started successfully","c-ok",200],
  ["","",60],
  ["  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━","c-muted",0],
  ["","",40],
  ["  ⬡  core.api","c-logo",0],
  ["","",30],
  [`  Version   :  v1.0.0`,"c-info",60],
  [`  Status    :  ONLINE`,"c-ok",60],
  [`  Runtime   :  Node.js · Vercel`,"c-info",60],
  [`  Uptime    :  99.7%`,"c-ok",60],
  [`  Latency   :  ~142ms avg`,"c-warn",60],
  [`  Endpoints :  ${Object.values(dat).reduce((a,c)=>a+Object.keys(c).length,0)} active`,"c-ok",60],
  [`  Categories:  ${Object.keys(dat).join(", ")}`,"c-info",60],
  ["","",40],
  ["  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━","c-muted",0],
  ["","",40],
  ...Object.entries(dat).map(([cat,apis])=>[
    `  ${cat.padEnd(10)}·  ${Object.keys(apis).join(", ")}`,
    "c-accent",80
  ]),
  ["","",40],
  ["  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━","c-muted",0],
  ["","",40],
  [`  Base URL  :  ${window.location.origin}`,"c-info",60],
  ["","",40],
  ["  Waiting for incoming requests...","c-warn",0],
];
const htSleep=ms=>new Promise(r=>setTimeout(r,ms));

  if(htRunning)return;htRunning=true;
  const out=document.getElementById("htOutput");if(!out)return;
  out.innerHTML="";
  for(const [text,cls,delay] of htLines){
    if(text===""){out.appendChild(document.createTextNode("\n"));}
    else{
      const span=document.createElement("span");if(cls)span.className=cls;
      out.appendChild(span);
      for(let i=0;i<text.length;i++){span.textContent+=text[i];await htSleep(text[i]===" "?5:12+Math.random()*8);}
      out.appendChild(document.createTextNode("\n"));
    }
    if(delay>0)await htSleep(delay);
  }
  htRunning=false;
}

function toggleChat(){chatOpen=!chatOpen;document.getElementById("chatWindow").classList.toggle("open",chatOpen);if(chatOpen)document.getElementById("chatInput").focus();}
async function sendChat(){
  const input=document.getElementById("chatInput");
  const msg=input.value.trim();if(!msg)return;
  appendMsg("user",msg);input.value="";
  chatHistory.push({role:"user",content:msg});
  const typing=document.getElementById("chatTyping");typing.style.display="flex";scrollChat();
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chatHistory})});
    const json=await res.json();typing.style.display="none";
    const reply=json?.result||json?.message||"Maaf, tidak ada respons.";
    chatHistory.push({role:"assistant",content:reply});appendMsg("bot",reply);
  }catch(e){typing.style.display="none";appendMsg("bot","Gagal menghubungi server.");}
}
function appendMsg(role,text){
  const msgs=document.getElementById("chatMsgs"),typing=document.getElementById("chatTyping");
  const div=document.createElement("div");div.className="msg "+role;
  div.innerHTML=`<div class="msg-bubble">${text}</div><div class="msg-time">${nowTime()}</div>`;
  msgs.insertBefore(div,typing);scrollChat();
}
function scrollChat(){const msgs=document.getElementById("chatMsgs");msgs.scrollTop=msgs.scrollHeight;}
document.getElementById("chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat();});
loadData();
