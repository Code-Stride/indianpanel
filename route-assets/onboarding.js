(() => {
  "use strict";
  if (location.pathname !== "/" || document.getElementById("cyrus-onboarding")) return;
  const COMPLETE_KEY = "cyrus_onboarding_completed_v1";
  const SESSION_KEY = "cyrus_onboarding_seen_session_v1";
  try { if (localStorage.getItem(COMPLETE_KEY) === "1" || sessionStorage.getItem(SESSION_KEY) === "1") return; } catch {}
  const steps = [
    { number: "01", title: "Login", text: "Select Login on the main page to open the account connection form." },
    { number: "02", title: "Enter account URL", text: "Enter the authorized Firebase Database URL. The last validated URL may be restored locally after refresh." },
    { number: "03", title: "Enter authentication key", text: "Enter the authentication key for the current session. The reconnect feature does not store this key." },
    { number: "04", title: "Connect", text: "Complete the connection and wait for a successful response before opening the dashboard." },
    { number: "05", title: "Understand refresh behaviour", text: "Refreshing disconnects the in-memory session. The browser warns before unload and then restores only safe account metadata." },
    { number: "06", title: "Enable privacy mode", text: "Open Settings to mask sensitive-looking values visually when sharing your screen." }
  ];
  const style = document.createElement("style");
  style.textContent = `
    #cyrus-onboarding[hidden]{display:none!important}#cyrus-onboarding{position:fixed;z-index:12500;inset:0;display:grid;place-items:center;padding:16px;background:rgba(4,3,12,.82)!important;backdrop-filter:blur(9px)}.cot-card{width:min(500px,100%);padding:clamp(22px,5vw,31px);color:#f5f3ff;background:#111026!important;border:1px solid #413a72;border-radius:22px;box-shadow:0 34px 110px rgba(0,0,0,.58)!important;animation:cot-in .3s cubic-bezier(.16,1,.3,1) both}@keyframes cot-in{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}.cot-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.cot-label{color:#a994ff;font-size:.68rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.cot-skip{padding:7px 9px;color:#918ba9;background:#1b1938!important;border:1px solid #373263;border-radius:8px;font:inherit;font-size:.68rem;cursor:pointer}.cot-number{display:grid;width:50px;height:50px;margin-top:30px;place-items:center;color:#fff;background:#7357ef!important;border-radius:14px;font-size:.8rem;font-weight:900}.cot-card h2{margin:18px 0 8px;font-size:clamp(1.5rem,6vw,2.1rem);letter-spacing:-.04em}.cot-card p{min-height:68px;margin:0;color:#aaa4c5;font-size:.83rem;line-height:1.65}.cot-progress{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:25px}.cot-progress i{height:4px;background:#302d56!important;border-radius:10px}.cot-progress i.active{background:#7c5cff!important}.cot-options{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:17px}.cot-check{display:flex;align-items:center;gap:7px;color:#827c99;font-size:.67rem}.cot-check input{width:17px;height:17px;accent-color:#7357ef}.cot-actions{display:flex;gap:8px}.cot-button{min-height:42px;padding:8px 13px;color:#bdb7d7;background:#1b1938!important;border:1px solid #373263;border-radius:9px;font:inherit;font-size:.74rem;font-weight:800;cursor:pointer}.cot-button.primary{color:#fff;background:#7357ef!important;border-color:#8f79f8}html[data-theme="light"] .cot-card,body[data-pronxt-effective-theme="light"] .cot-card{color:#211d3c;background:#fff!important;border-color:#d7d1ed}html[data-theme="light"] .cot-card p,body[data-pronxt-effective-theme="light"] .cot-card p{color:#6c6788}@media(max-width:480px){.cot-options{align-items:flex-start;flex-direction:column}.cot-actions{width:100%}.cot-button{flex:1}}
  `;
  document.head.appendChild(style);
  const overlay = document.createElement("div");
  overlay.id = "cyrus-onboarding";
  overlay.innerHTML = `<section class="cot-card" role="dialog" aria-modal="true" aria-labelledby="cot-title"><div class="cot-top"><span class="cot-label">Getting started</span><button class="cot-skip" type="button">Skip</button></div><span class="cot-number"></span><h2 id="cot-title"></h2><p class="cot-text"></p><div class="cot-progress" aria-label="Tour progress"></div><div class="cot-options"><label class="cot-check"><input type="checkbox">Don't show again</label><div class="cot-actions"><button class="cot-button cot-back" type="button">Back</button><button class="cot-button primary cot-next" type="button">Next</button></div></div></section>`;
  document.body.appendChild(overlay);
  const number = overlay.querySelector(".cot-number"), title = overlay.querySelector("h2"), text = overlay.querySelector(".cot-text"), progress = overlay.querySelector(".cot-progress"), back = overlay.querySelector(".cot-back"), next = overlay.querySelector(".cot-next"), skip = overlay.querySelector(".cot-skip"), remember = overlay.querySelector("input");
  let current = 0;
  steps.forEach(() => progress.appendChild(document.createElement("i")));
  function render() { const step = steps[current]; number.textContent = step.number; title.textContent = step.title; text.textContent = step.text; back.disabled = current === 0; next.textContent = current === steps.length - 1 ? "Finish" : "Next"; progress.querySelectorAll("i").forEach((item,index)=>item.classList.toggle("active",index<=current)); next.focus(); }
  function finish(forceRemember = true) { try { sessionStorage.setItem(SESSION_KEY,"1"); if (forceRemember || remember.checked) localStorage.setItem(COMPLETE_KEY,"1"); } catch {} overlay.remove(); }
  back.addEventListener("click",()=>{ if(current>0){current-=1;render();} });
  next.addEventListener("click",()=>{ if(current<steps.length-1){current+=1;render();}else finish(true); });
  skip.addEventListener("click",()=>finish(false));
  document.addEventListener("keydown",event=>{ if(!document.body.contains(overlay))return; if(event.key==="Escape")finish(false); if(event.key==="ArrowRight")next.click(); if(event.key==="ArrowLeft")back.click(); });
  render();
})();
