(() => {
  "use strict";
  if (document.getElementById("cyrus-support-widget")) return;

  function getBase() {
    const p = window.location.pathname;
    if (p.includes("/indianpanel")) return "/indianpanel";
    return "";
  }
  function resolve(target) {
    const b = getBase();
    if (!target || target === "/") return b ? b + "/" : "/";
    const clean = target.startsWith("/") ? target : "/" + target;
    return (b + clean).replace(/\/+/g, "/");
  }

  const TELEGRAM_BOT = "https://t.me/CYRUSPANEL_SUPPORTBOT";
  const TELEGRAM_CHANNEL = "https://t.me/cyrus_c_panel";
  const style = document.createElement("style");
  style.textContent = `
    #cyrus-support-widget{position:fixed;z-index:9900;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f8fafc}
    .csw-launcher{position:relative;display:grid;width:56px;height:56px;padding:0;place-items:center;color:#fff;background:linear-gradient(135deg, #0284c7, #0369a1)!important;border:1px solid rgba(56,189,248,.4);border-radius:18px;box-shadow:0 14px 40px rgba(2,132,199,.4)!important;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease!important}
    .csw-launcher:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 18px 46px rgba(2,132,199,.6)!important}
    .csw-launcher[aria-expanded="true"]{background:#0369a1!important}
    .csw-online{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#22c55e!important;border:3px solid #080c14;border-radius:50%}
    .csw-unread{position:absolute;top:-8px;left:-8px;display:grid;min-width:22px;height:22px;padding:0 5px;place-items:center;color:#fff;background:#ef4444!important;border:2px solid #080c14;border-radius:999px;font-size:.62rem;font-weight:900}
    .csw-unread[hidden]{display:none!important}
    .csw-panel{position:absolute;right:0;bottom:70px;display:flex;width:min(390px,calc(100vw - 24px));height:min(600px,calc(100dvh - 100px));overflow:hidden;flex-direction:column;background:#0f172a!important;border:1px solid rgba(56,189,248,.25);border-radius:22px;box-shadow:0 32px 90px rgba(0,0,0,.7)!important;transform-origin:bottom right;animation:csw-in .3s cubic-bezier(.16,1,.3,1) both}
    .csw-panel[hidden]{display:none!important}
    @keyframes csw-in{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
    @keyframes csw-msg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .csw-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#0c1322,#0f172a)!important;border-bottom:1px solid rgba(255,255,255,.08)}
    .csw-avatar{position:relative;display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;color:#fff;background:linear-gradient(135deg,#0284c7,#0369a1)!important;border:1px solid rgba(56,189,248,.4);border-radius:12px}
    .csw-avatar:after{content:"";position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;background:#22c55e!important;border:2px solid #0f172a;border-radius:50%}
    .csw-head-copy{min-width:0;flex:1}
    .csw-head strong,.csw-head small{display:block}
    .csw-head strong{font-size:.84rem;color:#f8fafc}
    .csw-head small{margin-top:2px;color:#38bdf8;font-size:.65rem}
    .csw-head-actions{display:flex;gap:6px}
    .csw-icon-button{display:grid;width:34px;height:34px;padding:0;place-items:center;color:#94a3b8;background:#1e293b!important;border:1px solid rgba(255,255,255,.1);border-radius:9px;cursor:pointer;transition:all .15s ease}
    .csw-icon-button:hover{color:#fff;border-color:#38bdf8;background:#0284c7!important}
    .csw-context{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;color:#64748b;background:#090d16!important;border-bottom:1px solid rgba(255,255,255,.06);font-size:.62rem}
    .csw-context strong{color:#38bdf8;font-weight:700}
    .csw-messages{display:flex;min-height:0;padding:16px;overflow-y:auto;flex:1;flex-direction:column;gap:10px;overscroll-behavior:contain;scroll-behavior:smooth}
    .csw-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:.78rem;white-space:pre-wrap;overflow-wrap:anywhere;animation:csw-msg .2s ease-out both}
    .csw-bot{align-self:flex-start;color:#e2e8f0;background:#1e293b!important;border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px}
    .csw-user{align-self:flex-end;color:#fff;background:linear-gradient(135deg,#0284c7,#0369a1)!important;border:1px solid rgba(56,189,248,.4);border-bottom-right-radius:4px}
    .csw-time{display:block;margin-top:5px;color:#64748b;font-size:.58rem}
    .csw-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .csw-action{min-height:30px;padding:5px 10px;color:#38bdf8;background:rgba(56,189,248,.12)!important;border:1px solid rgba(56,189,248,.3);border-radius:8px;font:inherit;font-size:.65rem;font-weight:700;text-decoration:none;cursor:pointer;transition:all .15s ease}
    .csw-action:hover{background:rgba(56,189,248,.25)!important;color:#fff}
    .csw-typing{align-self:flex-start;display:flex;gap:4px;padding:11px 13px;background:#1e293b!important;border:1px solid rgba(255,255,255,.08);border-radius:13px;border-bottom-left-radius:4px}
    .csw-typing[hidden]{display:none!important}
    .csw-typing i{width:6px;height:6px;background:#38bdf8!important;border-radius:50%;animation:csw-bounce 1s infinite ease-in-out}
    .csw-typing i:nth-child(2){animation-delay:.14s}
    .csw-typing i:nth-child(3){animation-delay:.28s}
    @keyframes csw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
    .csw-quick{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none}
    .csw-quick::-webkit-scrollbar{display:none}
    .csw-quick button{flex:0 0 auto;min-height:32px;padding:5px 10px;color:#94a3b8;background:#1e293b!important;border:1px solid rgba(255,255,255,.08);border-radius:8px;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer;transition:all .15s ease}
    .csw-quick button:hover{color:#38bdf8;border-color:rgba(56,189,248,.4);background:#0f172a!important}
    .csw-form{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:#090d16!important}
    .csw-input{width:100%;min-width:0;min-height:42px;padding:8px 12px;color:#f8fafc;background:#1e293b!important;border:1px solid rgba(255,255,255,.1);border-radius:10px;font:inherit;font-size:14px}
    .csw-input::placeholder{color:#64748b}
    .csw-input:focus{outline:2px solid #38bdf8;border-color:#38bdf8}
    .csw-send{display:grid;width:42px;height:42px;padding:0;place-items:center;color:#fff;background:#0284c7!important;border:1px solid #38bdf8;border-radius:10px;cursor:pointer}
    .csw-send:disabled{opacity:.55;cursor:wait}
    .csw-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;color:#64748b;background:#090d16!important;border-top:1px solid rgba(255,255,255,.06);font-size:.6rem}
    .csw-footer a{color:#38bdf8;text-decoration:none;font-weight:700}
    html[data-theme="light"] #cyrus-support-widget,body[data-pronxt-effective-theme="light"] #cyrus-support-widget{color:#0f172a}
    html[data-theme="light"] .csw-panel,body[data-pronxt-effective-theme="light"] .csw-panel{background:#fff!important;border-color:#cbd5e1;box-shadow:0 28px 70px rgba(0,0,0,.15)!important}
    html[data-theme="light"] .csw-head,body[data-pronxt-effective-theme="light"] .csw-head{background:#f0f9ff!important;border-color:#e2e8f0}
    html[data-theme="light"] .csw-context,html[data-theme="light"] .csw-form,html[data-theme="light"] .csw-footer,body[data-pronxt-effective-theme="light"] .csw-context,body[data-pronxt-effective-theme="light"] .csw-form,body[data-pronxt-effective-theme="light"] .csw-footer{background:#f8fafc!important;border-color:#e2e8f0}
    html[data-theme="light"] .csw-bot,html[data-theme="light"] .csw-typing,body[data-pronxt-effective-theme="light"] .csw-bot,body[data-pronxt-effective-theme="light"] .csw-typing{color:#1e293b;background:#f1f5f9!important;border-color:#cbd5e1}
    html[data-theme="light"] .csw-input,body[data-pronxt-effective-theme="light"] .csw-input{color:#0f172a;background:#fff!important;border-color:#cbd5e1}
    html[data-theme="light"] .csw-quick button,body[data-pronxt-effective-theme="light"] .csw-quick button{color:#475569;background:#f1f5f9!important;border-color:#e2e8f0}
    @media(max-width:520px){#cyrus-support-widget{right:12px;bottom:max(12px,env(safe-area-inset-bottom))}.csw-panel{position:fixed;right:8px;bottom:76px;width:calc(100vw - 16px);height:min(650px,calc(100dvh - 90px));border-radius:18px}.csw-launcher{width:52px;height:52px}.csw-message{max-width:92%}}
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement("aside");
  wrapper.id = "cyrus-support-widget";
  wrapper.setAttribute("aria-label", "CYRUS support assistant");
  wrapper.innerHTML = `
    <button class="csw-launcher" type="button" aria-label="Open support assistant" aria-expanded="false" aria-controls="cyrus-support-panel"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a9 9 0 1 1 18 0Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg><span class="csw-online" aria-hidden="true"></span><span class="csw-unread" hidden>0</span></button>
    <section id="cyrus-support-panel" class="csw-panel" role="dialog" aria-modal="false" aria-labelledby="csw-title" hidden>
      <header class="csw-head"><span class="csw-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"/></svg></span><div class="csw-head-copy"><strong id="csw-title">CYRUS Support</strong><small>Instant local assistant · Online</small></div><div class="csw-head-actions"><button class="csw-icon-button csw-reset" type="button" aria-label="Reset conversation" title="Reset conversation"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button><button class="csw-icon-button csw-close" type="button" aria-label="Close support assistant"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>
      <div class="csw-context"><span>Current page</span><strong class="csw-route">Home</strong></div>
      <div class="csw-messages" aria-live="polite" aria-label="Support conversation"></div>
      <div class="csw-typing" hidden aria-label="Assistant is typing"><i></i><i></i><i></i></div>
      <div class="csw-quick" aria-label="Quick questions"><button type="button" data-question="How do I login with email?">Email Login</button><button type="button" data-question="How do I get account access?">Account access</button><button type="button" data-question="What are the official links?">Official links</button><button type="button" data-question="Where are appearance settings?">Settings</button><button type="button" data-question="How do I stay safe?">Safety</button></div>
      <form class="csw-form"><input class="csw-input" type="text" maxlength="300" placeholder="Ask a support question…" aria-label="Support question" autocomplete="off"><button class="csw-send" type="submit" aria-label="Send question"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
      <footer class="csw-footer"><span>Private local replies · No storage</span><a href="${TELEGRAM_BOT}" target="_blank" rel="noopener noreferrer">Human support ↗</a></footer>
    </section>`;
  document.body.appendChild(wrapper);

  const launcher = wrapper.querySelector(".csw-launcher");
  const unread = wrapper.querySelector(".csw-unread");
  const panel = wrapper.querySelector(".csw-panel");
  const close = wrapper.querySelector(".csw-close");
  const reset = wrapper.querySelector(".csw-reset");
  const messages = wrapper.querySelector(".csw-messages");
  const typing = wrapper.querySelector(".csw-typing");
  const form = wrapper.querySelector(".csw-form");
  const input = wrapper.querySelector(".csw-input");
  const send = wrapper.querySelector(".csw-send");
  const routeLabel = wrapper.querySelector(".csw-route");
  let greeted = false;
  let unreadCount = 0;
  let busy = false;

  function updateRouteLabel() {
    const raw = location.pathname.replace(/\/indianpanel\/?/, "/");
    const routeNames = {
      "/": "Home / Login", "/dashboard/": "Dashboard", "/settings/": "Settings",
      "/accounts/": "Accounts", "/get-accounts/": "Get Account", "/profile/": "Profile",
      "/about/": "About", "/support/": "Support", "/privacy/": "Privacy",
      "/terms/": "Terms", "/copyright/": "Copyright", "/docs/": "Documentation", "/status/": "Status"
    };
    routeLabel.textContent = routeNames[raw] || raw.replace(/^\/+|\/+$/g, "") || "Home";
  }
  updateRouteLabel();
  window.addEventListener("popstate", updateRouteLabel);
  window.addEventListener("cyrusroutechange", updateRouteLabel);

  const intents = [
    { test: /(email|login|sign in|password|creds|connect)/, text: "You can sign in directly using your Email ID and Password on the main screen, or switch to the Database URL tab to connect Firebase credentials.", actions: [{ label: "Go to Login", href: resolve("/") }, { label: "Documentation", href: resolve("/docs/") }] },
    { test: /(password|otp|pin|private key|secret|recovery code|token|cvv)/, text: "Please do not send passwords, OTPs, PINs, CVVs, private keys, recovery codes, or complete secrets in chat.", actions: [{ label: "Safety guide", href: resolve("/privacy/") }] },
    { test: /(get account|account access|new account|buy account)/, text: "Open the Get Account page from the main screen. For legitimate account-access information, contact the official support bot.", actions: [{ label: "Get Account", href: resolve("/get-accounts/") }, { label: "Support bot", href: TELEGRAM_BOT, external: true }] },
    { test: /(official|telegram|channel|contact|human|support)/, text: "Official support bot: @CYRUSPANEL_SUPPORTBOT\nOfficial updates channel: @cyrus_c_panel", actions: [{ label: "Support bot", href: TELEGRAM_BOT, external: true }, { label: "Telegram channel", href: TELEGRAM_CHANNEL, external: true }] },
    { test: /(safe|security|protect|scam|phishing)/, text: "Always verify URLs, use an updated browser, and never share passwords, OTPs, recovery codes, card PINs, or private keys.", actions: [{ label: "Privacy info", href: resolve("/privacy/") }, { label: "Terms", href: resolve("/terms/") }] },
    { test: /(setting|theme|dark|light|colour|color|layout|density)/, text: "Open Settings to choose Light, Dark, or System theme, card density, layout, and privacy mode.", actions: [{ label: "Open Settings", href: resolve("/settings/") }] },
    { test: /(profile|identity|user)/, text: "You can view user session details and account info on the Profile route.", actions: [{ label: "Profile", href: resolve("/profile/") }] },
    { test: /(account page|saved account|accounts)/, text: "Manage saved account profiles on the Accounts route.", actions: [{ label: "Accounts", href: resolve("/accounts/") }] },
    { test: /(error|failed|not working|problem|issue)/, text: "Try refreshing the page or testing in a private window. Check status diagnostics for live health checks.", actions: [{ label: "System Status", href: resolve("/status/") }, { label: "Human support", href: TELEGRAM_BOT, external: true }] },
    { test: /(about|what is cyrus)/, text: "CYRUS PANEL is a modern, responsive web control interface with multi-route navigation, real-time diagnostics, and custom themes.", actions: [{ label: "About", href: resolve("/about/") }] },
    { test: /(hello|hi|hey|namaste|help)/, text: "Hello! I can assist with Email login, account access, official links, settings, privacy, and safety." }
  ];

  function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function updateUnread() {
    unread.hidden = unreadCount === 0;
    unread.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  }
  function addMessage(text, sender = "bot", actions = []) {
    const item = document.createElement("div");
    item.className = `csw-message ${sender === "user" ? "csw-user" : "csw-bot"}`;
    item.textContent = text;
    if (actions.length) {
      const actionBox = document.createElement("div");
      actionBox.className = "csw-actions";
      actions.forEach(action => {
        const link = document.createElement("a");
        link.className = "csw-action";
        link.textContent = action.label;
        link.href = action.href;
        if (action.external) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
        actionBox.appendChild(link);
      });
      item.appendChild(actionBox);
    }
    const stamp = document.createElement("small");
    stamp.className = "csw-time";
    stamp.textContent = now();
    item.appendChild(stamp);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    if (sender === "bot" && panel.hidden) { unreadCount += 1; updateUnread(); }
  }
  function answer(question) {
    const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();
    return intents.find(intent => intent.test.test(normalized)) || { text: "I can help with Email login, account access, settings, official support links, privacy, and safety.", actions: [{ label: "Support bot", href: TELEGRAM_BOT, external: true }] };
  }
  function botReply(question) {
    if (busy) return;
    busy = true; send.disabled = true; typing.hidden = false; messages.scrollTop = messages.scrollHeight;
    window.setTimeout(() => {
      const response = answer(question);
      typing.hidden = true;
      addMessage(response.text, "bot", response.actions || []);
      busy = false; send.disabled = false; input.focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400);
  }
  function ask(question) {
    if (!question || busy) return;
    addMessage(question, "user");
    botReply(question);
  }
  function greeting() {
    const route = routeLabel.textContent;
    return `Hi! I’m the CYRUS instant assistant. You’re currently on ${route}. Ask me anything about login, settings, or features!`;
  }
  function openPanel() {
    panel.hidden = false; launcher.setAttribute("aria-expanded", "true"); launcher.setAttribute("aria-label", "Close support assistant"); unreadCount = 0; updateUnread();
    if (!greeted) { addMessage(greeting()); greeted = true; }
    window.setTimeout(() => input.focus(), 0);
  }
  function closePanel() { panel.hidden = true; launcher.setAttribute("aria-expanded", "false"); launcher.setAttribute("aria-label", "Open support assistant"); launcher.focus(); }
  function resetChat() { messages.textContent = ""; typing.hidden = true; busy = false; send.disabled = false; greeted = false; addMessage(greeting()); greeted = true; input.focus(); }

  launcher.addEventListener("click", () => panel.hidden ? openPanel() : closePanel());
  close.addEventListener("click", closePanel);
  reset.addEventListener("click", resetChat);
  wrapper.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => ask(button.dataset.question)));
  form.addEventListener("submit", event => { event.preventDefault(); const question = input.value.trim(); if (!question) return; input.value = ""; ask(question); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) closePanel(); });
})();
