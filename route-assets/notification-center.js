(() => {
  "use strict";
  const path = location.pathname.replace(/\/indianpanel\/?/, "/");
  if ((path !== "/" && path !== "/dashboard/" && path !== "/index.html" && path !== "") || document.getElementById("cyrus-notifications")) return;
  const KEY = "cyrus_notifications_v1";
  const MAX = 30;
  const loadedAt = new Date();
  const style = document.createElement("style");
  style.textContent = `
    #cyrus-notifications{position:fixed;z-index:9850;top:max(82px,calc(env(safe-area-inset-top) + 70px));right:max(16px,env(safe-area-inset-right));font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    .cnc-button{position:relative;display:grid;width:42px;height:42px;padding:0;place-items:center;color:#94a3b8;background:#0f172a!important;border:1px solid rgba(56,189,248,.2);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4)!important;cursor:pointer;transition:all .2s ease}
    .cnc-button:hover{color:#38bdf8;border-color:rgba(56,189,248,.5);background:#1e293b!important}
    .cnc-count{position:absolute;top:-6px;right:-6px;display:grid;min-width:18px;height:18px;padding:0 4px;place-items:center;color:#fff;background:#ef4444!important;border:2px solid #080c14;border-radius:99px;font-size:.56rem;font-weight:900}
    .cnc-count[hidden]{display:none!important}
    .cnc-panel{position:absolute;right:0;top:50px;width:min(380px,calc(100vw - 24px));max-height:min(590px,calc(100dvh - 150px));overflow:hidden;color:#f8fafc;background:#0f172a!important;border:1px solid rgba(56,189,248,.25);border-radius:20px;box-shadow:0 28px 80px rgba(0,0,0,.7)!important;backdrop-filter:blur(16px)}
    .cnc-panel[hidden]{display:none!important}
    .cnc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:#0c1322}
    .cnc-head strong{font-size:.84rem;color:#f8fafc}
    .cnc-clear{padding:4px 8px;color:#94a3b8;background:#1e293b!important;border:1px solid rgba(255,255,255,.08);border-radius:6px;font:inherit;font-size:.62rem;cursor:pointer;transition:all .15s ease}
    .cnc-clear:hover{color:#fff;border-color:rgba(255,255,255,.2)}
    .cnc-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:rgba(255,255,255,.06)}
    .cnc-status div{min-width:0;padding:8px 10px;background:#090d16!important}
    .cnc-status small,.cnc-status strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cnc-status small{color:#64748b;font-size:.56rem;text-transform:uppercase}
    .cnc-status strong{margin-top:2px;color:#38bdf8;font-size:.65rem;font-family:monospace}
    .cnc-list{max-height:360px;padding:8px;overflow-y:auto}
    .cnc-item{display:grid;grid-template-columns:8px minmax(0,1fr);gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.05);border-radius:10px;transition:background .15s ease}
    .cnc-item:hover{background:rgba(255,255,255,.03)}
    .cnc-item:last-child{border-bottom:0}
    .cnc-dot{width:8px;height:8px;margin-top:5px;background:#38bdf8!important;border-radius:50%}
    .cnc-item[data-kind="success"] .cnc-dot{background:#22c55e!important;box-shadow:0 0 6px #22c55e}
    .cnc-item[data-kind="error"] .cnc-dot{background:#ef4444!important;box-shadow:0 0 6px #ef4444}
    .cnc-item[data-kind="warning"] .cnc-dot{background:#f59e0b!important;box-shadow:0 0 6px #f59e0b}
    .cnc-copy p{margin:0;color:#cbd5e1;font-size:.72rem;overflow-wrap:anywhere}
    .cnc-copy time{display:block;margin-top:3px;color:#64748b;font-size:.58rem}
    .cnc-empty{padding:32px;color:#64748b;text-align:center;font-size:.75rem}
    html[data-theme="light"] .cnc-panel,body[data-pronxt-effective-theme="light"] .cnc-panel{color:#0f172a;background:#fff!important;border-color:#cbd5e1}
    html[data-theme="light"] .cnc-status,body[data-pronxt-effective-theme="light"] .cnc-status{background:#e2e8f0}
    html[data-theme="light"] .cnc-status div,body[data-pronxt-effective-theme="light"] .cnc-status div{background:#f8fafc!important}
    html[data-theme="light"] .cnc-copy p,body[data-pronxt-effective-theme="light"] .cnc-copy p{color:#334155}
    @media(max-width:520px){#cyrus-notifications{top:auto;right:74px;bottom:max(16px,env(safe-area-inset-bottom))}.cnc-panel{position:fixed;top:auto;right:8px;bottom:76px;width:calc(100vw - 16px);max-height:calc(100dvh - 95px)}}
  `;
  document.head.appendChild(style);
  const wrapper = document.createElement("aside"); wrapper.id = "cyrus-notifications"; wrapper.setAttribute("aria-label","Notification center");
  wrapper.innerHTML = `<button class="cnc-button" type="button" aria-label="Open notification center" aria-expanded="false"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="cnc-count" hidden>0</span></button><section class="cnc-panel" role="dialog" aria-label="Notifications" hidden><header class="cnc-head"><strong>Notification Center</strong><button class="cnc-clear" type="button">Clear</button></header><div class="cnc-status"><div><small>Status</small><strong class="cnc-connection">Active</strong></div><div><small>Loaded</small><strong>${loadedAt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</strong></div><div><small>Network</small><strong class="cnc-network">${navigator.onLine?"Online":"Offline"}</strong></div></div><div class="cnc-list" aria-live="polite"></div></section>`;
  document.body.appendChild(wrapper);
  const button=wrapper.querySelector(".cnc-button"),count=wrapper.querySelector(".cnc-count"),panel=wrapper.querySelector(".cnc-panel"),list=wrapper.querySelector(".cnc-list"),clear=wrapper.querySelector(".cnc-clear"),network=wrapper.querySelector(".cnc-network"),connection=wrapper.querySelector(".cnc-connection");
  let items=[]; let unread=0;
  function sanitize(value){return String(value||"").replace(/https?:\/\/\S+/gi,"[URL redacted]").replace(/AIza[A-Za-z0-9_-]{20,}/g,"[key redacted]").slice(0,240)}
  function read(){try{const value=JSON.parse(sessionStorage.getItem(KEY)||"[]");return Array.isArray(value)?value.slice(-MAX):[]}catch{return[]}}
  function save(){try{sessionStorage.setItem(KEY,JSON.stringify(items.slice(-MAX)))}catch{}}
  function render(){list.textContent="";if(!items.length){const empty=document.createElement("div");empty.className="cnc-empty";empty.textContent="No recent notifications.";list.appendChild(empty)}else[...items].reverse().forEach(item=>{const row=document.createElement("article");row.className="cnc-item";row.dataset.kind=item.kind;row.innerHTML='<i class="cnc-dot" aria-hidden="true"></i><div class="cnc-copy"><p></p><time></time></div>';row.querySelector("p").textContent=item.message;row.querySelector("time").textContent=new Date(item.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});list.appendChild(row)});count.hidden=unread===0;count.textContent=unread>9?"9+":String(unread)}
  function add(message,kind="info"){const safe=sanitize(message);if(!safe)return;items.push({message:safe,kind:["success","error","warning","info"].includes(kind)?kind:"info",time:new Date().toISOString()});items=items.slice(-MAX);if(panel.hidden)unread+=1;save();render()}
  items=read();render();
  const original=window.ProNXTToast;if(typeof original==="function")window.ProNXTToast=(message,kind,...rest)=>{add(message,kind);return original(message,kind,...rest)};
  function updateConnection(){const connected=[...document.querySelectorAll("span")].some(el=>el.textContent.trim()==="Connected"&&el.offsetParent!==null);connection.textContent=connected?"Connected":"Ready"}
  setInterval(updateConnection, 2000); updateConnection();
  window.addEventListener("online",()=>{network.textContent="Online";add("Network connection restored.","success")});
  window.addEventListener("offline",()=>{network.textContent="Offline";add("Device is currently offline.","warning")});
  button.addEventListener("click",()=>{panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){unread=0;render()}});
  clear.addEventListener("click",()=>{items=[];unread=0;save();render()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){panel.hidden=true;button.setAttribute("aria-expanded","false");button.focus()}});
  window.CyrusNotifications={add,clear:()=>{items=[];save();render()}};
})();
