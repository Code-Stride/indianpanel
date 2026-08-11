(() => {
  "use strict";
  if (document.getElementById("cyrus-support-widget")) return;

  const TELEGRAM_BOT = "https://t.me/CYRUSPANEL_SUPPORTBOT";
  const TELEGRAM_CHANNEL = "https://t.me/cyrus_c_panel";
  const style = document.createElement("style");
  style.textContent = `
    #cyrus-support-widget{position:fixed;z-index:9900;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f5f3ff}
    .csw-launcher{position:relative;display:grid;width:58px;height:58px;padding:0;place-items:center;color:#fff;background:#7357ef!important;border:1px solid #a391ff;border-radius:19px;box-shadow:0 18px 46px rgba(48,31,140,.46)!important;cursor:pointer;transition:transform .2s ease,background-color .2s ease!important}.csw-launcher:hover{transform:translateY(-3px) scale(1.02)}.csw-launcher[aria-expanded="true"]{background:#5c42d0!important}.csw-online{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#32c997!important;border:3px solid #090817;border-radius:50%}.csw-unread{position:absolute;top:-8px;left:-8px;display:grid;min-width:22px;height:22px;padding:0 5px;place-items:center;color:#fff;background:#ff5d7a!important;border:2px solid #090817;border-radius:999px;font-size:.62rem;font-weight:900}.csw-unread[hidden]{display:none!important}
    .csw-panel{position:absolute;right:0;bottom:74px;display:flex;width:min(390px,calc(100vw - 24px));height:min(620px,calc(100dvh - 112px));overflow:hidden;flex-direction:column;background:#111026!important;border:1px solid #3c366d;border-radius:22px;box-shadow:0 32px 90px rgba(0,0,0,.52)!important;transform-origin:bottom right;animation:csw-in .3s cubic-bezier(.16,1,.3,1) both}.csw-panel[hidden]{display:none!important}@keyframes csw-in{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}@keyframes csw-msg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .csw-head{display:flex;align-items:center;gap:11px;padding:14px 13px;background:linear-gradient(135deg,#181536,#121027)!important;border-bottom:1px solid #302d56}.csw-avatar{position:relative;display:grid;width:42px;height:42px;flex:0 0 auto;place-items:center;color:#fff;background:#7357ef!important;border:1px solid #9a87ff;border-radius:13px}.csw-avatar:after{content:"";position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;background:#32c997!important;border:2px solid #181536;border-radius:50%}.csw-head-copy{min-width:0;flex:1}.csw-head strong,.csw-head small{display:block}.csw-head strong{font-size:.84rem}.csw-head small{margin-top:2px;color:#9690b2;font-size:.65rem}.csw-head-actions{display:flex;gap:5px}.csw-icon-button{display:grid;width:36px;height:36px;padding:0;place-items:center;color:#aaa4c5;background:#1d1a3b!important;border:1px solid #3b3568;border-radius:9px;cursor:pointer}.csw-icon-button:hover{color:#fff;border-color:#7357ef}
    .csw-context{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 13px;color:#77728f;background:#0e0d20!important;border-bottom:1px solid #252244;font-size:.59rem}.csw-context strong{color:#a89dce;font-weight:750}.csw-messages{display:flex;min-height:0;padding:15px;overflow-y:auto;flex:1;flex-direction:column;gap:10px;overscroll-behavior:contain;scroll-behavior:smooth}.csw-message{max-width:88%;padding:10px 11px;border-radius:13px;font-size:.75rem;white-space:pre-wrap;overflow-wrap:anywhere;animation:csw-msg .2s ease-out both}.csw-bot{align-self:flex-start;color:#dedaf0;background:#1b1938!important;border:1px solid #302d56;border-bottom-left-radius:4px}.csw-user{align-self:flex-end;color:#fff;background:#6548db!important;border:1px solid #8067eb;border-bottom-right-radius:4px}.csw-time{display:block;margin-top:5px;color:#77728f;font-size:.56rem}.csw-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.csw-action{min-height:31px;padding:5px 8px;color:#bcb5df;background:#242046!important;border:1px solid #413a72;border-radius:8px;font:inherit;font-size:.61rem;font-weight:750;text-decoration:none;cursor:pointer}
    .csw-typing{align-self:flex-start;display:flex;gap:4px;padding:11px 13px;background:#1b1938!important;border:1px solid #302d56;border-radius:13px;border-bottom-left-radius:4px}.csw-typing[hidden]{display:none!important}.csw-typing i{width:6px;height:6px;background:#8d87a7!important;border-radius:50%;animation:csw-bounce 1s infinite ease-in-out}.csw-typing i:nth-child(2){animation-delay:.14s}.csw-typing i:nth-child(3){animation-delay:.28s}@keyframes csw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
    .csw-quick{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none}.csw-quick::-webkit-scrollbar{display:none}.csw-quick button{flex:0 0 auto;min-height:34px;padding:6px 9px;color:#aaa4c5;background:#191735!important;border:1px solid #373263;border-radius:9px;font:inherit;font-size:.64rem;font-weight:750;cursor:pointer}.csw-quick button:hover{color:#fff;border-color:#7357ef}.csw-form{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:7px;padding:11px;border-top:1px solid #302d56;background:#0e0d20!important}.csw-input{width:100%;min-width:0;min-height:44px;padding:10px 11px;color:#f5f3ff;background:#191735!important;border:1px solid #373263;border-radius:10px;font:inherit;font-size:16px}.csw-input::placeholder{color:#77728f}.csw-input:focus{outline:3px solid rgba(124,92,255,.18);border-color:#7c5cff}.csw-send{display:grid;width:44px;height:44px;padding:0;place-items:center;color:#fff;background:#7357ef!important;border:1px solid #8f79f8;border-radius:10px;cursor:pointer}.csw-send:disabled{opacity:.55;cursor:wait}.csw-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;color:#77728f;background:#0e0d20!important;border-top:1px solid #252244;font-size:.58rem}.csw-footer a{color:#a994ff;text-decoration:none;font-weight:800}
    html[data-theme="light"] #cyrus-support-widget,body[data-pronxt-effective-theme="light"] #cyrus-support-widget{color:#211d3c}html[data-theme="light"] .csw-panel,body[data-pronxt-effective-theme="light"] .csw-panel{background:#fff!important;border-color:#d7d1ed;box-shadow:0 28px 70px rgba(49,40,92,.22)!important}html[data-theme="light"] .csw-head,body[data-pronxt-effective-theme="light"] .csw-head{background:#f1eeff!important;border-color:#d7d1ed}html[data-theme="light"] .csw-context,html[data-theme="light"] .csw-form,html[data-theme="light"] .csw-footer,body[data-pronxt-effective-theme="light"] .csw-context,body[data-pronxt-effective-theme="light"] .csw-form,body[data-pronxt-effective-theme="light"] .csw-footer{background:#f8f7ff!important;border-color:#ded9ef}html[data-theme="light"] .csw-bot,html[data-theme="light"] .csw-typing,body[data-pronxt-effective-theme="light"] .csw-bot,body[data-pronxt-effective-theme="light"] .csw-typing{color:#413b62;background:#f0edfb!important;border-color:#d7d1ed}html[data-theme="light"] .csw-input,body[data-pronxt-effective-theme="light"] .csw-input{color:#211d3c;background:#fff!important;border-color:#cfc8e8}html[data-theme="light"] .csw-quick button,body[data-pronxt-effective-theme="light"] .csw-quick button{color:#5f587e;background:#f0edfb!important;border-color:#d7d1ed}
    @media(max-width:520px){#cyrus-support-widget{right:12px;bottom:max(12px,env(safe-area-inset-bottom))}.csw-panel{position:fixed;right:8px;bottom:78px;width:calc(100vw - 16px);height:min(680px,calc(100dvh - 92px));border-radius:18px}.csw-launcher{width:54px;height:54px}.csw-message{max-width:92%}}
    @media(prefers-reduced-motion:reduce){.csw-panel,.csw-message,.csw-typing i{animation-duration:.01ms!important}.csw-launcher{transition-duration:.01ms!important}}
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement("aside");
  wrapper.id = "cyrus-support-widget";
  wrapper.setAttribute("aria-label", "CYRUS support assistant");
  wrapper.innerHTML = `
    <button class="csw-launcher" type="button" aria-label="Open support assistant" aria-expanded="false" aria-controls="cyrus-support-panel"><svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a9 9 0 1 1 18 0Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg><span class="csw-online" aria-hidden="true"></span><span class="csw-unread" hidden>0</span></button>
    <section id="cyrus-support-panel" class="csw-panel" role="dialog" aria-modal="false" aria-labelledby="csw-title" hidden>
      <header class="csw-head"><span class="csw-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"/></svg></span><div class="csw-head-copy"><strong id="csw-title">CYRUS Support</strong><small>Smart local assistant · Online</small></div><div class="csw-head-actions"><button class="csw-icon-button csw-reset" type="button" aria-label="Reset conversation" title="Reset conversation"><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button><button class="csw-icon-button csw-close" type="button" aria-label="Close support assistant"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header>
      <div class="csw-context"><span>Current page</span><strong class="csw-route">Home</strong></div>
      <div class="csw-messages" aria-live="polite" aria-label="Support conversation"></div>
      <div class="csw-typing" hidden aria-label="Assistant is typing"><i></i><i></i><i></i></div>
      <div class="csw-quick" aria-label="Quick questions"><button type="button" data-question="How do I get account access?">Account access</button><button type="button" data-question="I need login help">Login help</button><button type="button" data-question="What are the official links?">Official links</button><button type="button" data-question="How do I stay safe?">Safety</button><button type="button" data-question="Where are appearance settings?">Settings</button></div>
      <form class="csw-form"><input class="csw-input" type="text" maxlength="300" placeholder="Ask a support question…" aria-label="Support question" autocomplete="off"><button class="csw-send" type="submit" aria-label="Send question"><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
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

  const routeNames = {
    "/": "Home / Login", "/dashboard/": "Dashboard", "/settings/": "Settings",
    "/accounts/": "Accounts", "/get-accounts/": "Get Account", "/profile/": "Profile",
    "/about/": "About", "/support/": "Support", "/privacy/": "Privacy",
    "/terms/": "Terms", "/copyright/": "Copyright"
  };
  function updateRouteLabel() {
    routeLabel.textContent = routeNames[location.pathname] || location.pathname.replace(/^\/+|\/+$/g, "") || "Home";
  }
  updateRouteLabel();
  window.addEventListener("popstate", updateRouteLabel);
  window.addEventListener("cyrusroutechange", updateRouteLabel);

  const intents = [
    { test: /(password|otp|pin|private key|secret|recovery code|token|cvv)/, text: "Please do not send passwords, OTPs, PINs, CVVs, private keys, recovery codes, or complete authentication secrets. Use the official support bot only for non-sensitive assistance.", actions: [{ label: "Safety guide", href: "/privacy/" }] },
    { test: /(get account|account access|new account|buy account)/, text: "Open the Get Account page from the main screen. For legitimate account-access information, contact the official support bot. No automated checkout or credential delivery is configured on this site.", actions: [{ label: "Get Account", href: "/get-accounts/" }, { label: "Support bot", href: TELEGRAM_BOT, external: true }] },
    { test: /(login|sign in|connect|connection)/, text: "Use the Login button on the main page. If connection fails, record the exact error and browser name, then contact support without sharing secret values.", actions: [{ label: "Go home", href: "/" }, { label: "Support", href: "/support/" }] },
    { test: /(official|telegram|channel|contact|human|support)/, text: "Official support bot: @CYRUSPANEL_SUPPORTBOT\nOfficial channel: @cyrus_c_panel", actions: [{ label: "Support bot", href: TELEGRAM_BOT, external: true }, { label: "Channel", href: TELEGRAM_CHANNEL, external: true }] },
    { test: /(safe|security|protect|scam|phishing)/, text: "Verify usernames and HTTPS links, use an updated browser, and never share passwords, OTPs, recovery codes, card PINs, private keys, or full tokens.", actions: [{ label: "Privacy info", href: "/privacy/" }, { label: "Terms", href: "/terms/" }] },
    { test: /(privacy|data|store|tracking)/, text: "This local assistant does not transmit or store your messages. Review the Privacy page for broader deployment-specific information.", actions: [{ label: "Privacy", href: "/privacy/" }] },
    { test: /(setting|theme|dark|light|colour|color|layout|density)/, text: "Open Settings to choose light, dark, or system theme, card density, layout, and privacy mode. Preferences are stored locally in your browser.", actions: [{ label: "Open Settings", href: "/settings/" }] },
    { test: /(profile|identity|user)/, text: "The Profile route is currently a non-authenticated placeholder. A real profile requires secure server-side identity and sessions.", actions: [{ label: "Profile", href: "/profile/" }] },
    { test: /(account page|saved account|accounts)/, text: "The Accounts route does not restore credentials or live account records. Start authorized connections from the main page.", actions: [{ label: "Accounts", href: "/accounts/" }] },
    { test: /(error|failed|not working|problem|issue)/, text: "Try one refresh, confirm your internet connection, and test a private browser window. Save the exact error text—without secrets—before contacting support.", actions: [{ label: "Support page", href: "/support/" }, { label: "Human support", href: TELEGRAM_BOT, external: true }] },
    { test: /(copyright|owner|attribution)/, text: "Copyright and third-party attribution information is available on the Copyright route.", actions: [{ label: "Copyright", href: "/copyright/" }] },
    { test: /(about|what is cyrus)/, text: "CYRUS PANEL is a responsive web interface with separate routes, configurable appearance, and local support guidance.", actions: [{ label: "About", href: "/about/" }] },
    { test: /(hello|hi|hey|namaste|help)/, text: "Hello! I can help with account access, login guidance, settings, official links, privacy, and safety questions." }
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
    return intents.find(intent => intent.test.test(normalized)) || { text: "I can help with account access, login guidance, settings, official support links, privacy, and safety. For a specific issue, use the human support button.", actions: [{ label: "Support bot", href: TELEGRAM_BOT, external: true }] };
  }
  function botReply(question) {
    if (busy) return;
    busy = true; send.disabled = true; typing.hidden = false; messages.scrollTop = messages.scrollHeight;
    window.setTimeout(() => {
      const response = answer(question);
      typing.hidden = true;
      addMessage(response.text, "bot", response.actions || []);
      busy = false; send.disabled = false; input.focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520);
  }
  function ask(question) {
    if (!question || busy) return;
    addMessage(question, "user");
    botReply(question);
  }
  function greeting() {
    const route = routeLabel.textContent;
    return `Hi! I’m the CYRUS smart local assistant. You’re currently on ${route}. I can help without transmitting or storing your messages.`;
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
