(() => {
  "use strict";
  if (document.getElementById("cyrus-support-widget")) return;

  const style = document.createElement("style");
  style.textContent = `
    #cyrus-support-widget{position:fixed;z-index:9900;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f5f3ff}
    .csw-launcher{display:grid;width:54px;height:54px;padding:0;place-items:center;color:#fff;background:#7357ef!important;border:1px solid #9b87ff;border-radius:17px;box-shadow:0 16px 40px rgba(41,28,105,.42)!important;cursor:pointer;transition:transform .18s ease!important}
    .csw-launcher:hover{transform:translateY(-2px)}.csw-launcher[aria-expanded="true"]{background:#5c42d0!important}
    .csw-dot{position:absolute;top:-2px;right:-2px;width:12px;height:12px;background:#32c997!important;border:2px solid #090817;border-radius:50%}
    .csw-panel{position:absolute;right:0;bottom:68px;display:flex;width:min(370px,calc(100vw - 24px));height:min(560px,calc(100dvh - 110px));overflow:hidden;flex-direction:column;background:#111026!important;border:1px solid #373263;border-radius:19px;box-shadow:0 28px 80px rgba(0,0,0,.48)!important;transform-origin:bottom right;animation:csw-in .24s cubic-bezier(.16,1,.3,1) both}
    .csw-panel[hidden]{display:none!important}@keyframes csw-in{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}
    .csw-head{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #302d56;background:#15132d!important}.csw-avatar{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;color:#fff;background:#7357ef!important;border-radius:11px}.csw-head-copy{min-width:0;flex:1}.csw-head strong,.csw-head small{display:block}.csw-head strong{font-size:.82rem}.csw-head small{margin-top:2px;color:#8f8aaa;font-size:.66rem}.csw-close{display:grid;width:38px;height:38px;padding:0;place-items:center;color:#aaa4c5;background:#1b1938!important;border:1px solid #373263;border-radius:9px;cursor:pointer}
    .csw-messages{display:flex;min-height:0;padding:14px;overflow-y:auto;flex:1;flex-direction:column;gap:10px;overscroll-behavior:contain}.csw-message{max-width:88%;padding:9px 11px;border-radius:12px;font-size:.75rem;white-space:pre-wrap;overflow-wrap:anywhere}.csw-bot{align-self:flex-start;color:#d9d5ed;background:#1b1938!important;border:1px solid #302d56;border-bottom-left-radius:4px}.csw-user{align-self:flex-end;color:#fff;background:#6548db!important;border-bottom-right-radius:4px}.csw-time{display:block;margin-top:5px;color:#77728f;font-size:.57rem}
    .csw-quick{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none}.csw-quick::-webkit-scrollbar{display:none}.csw-quick button{flex:0 0 auto;min-height:34px;padding:6px 9px;color:#aaa4c5;background:#191735!important;border:1px solid #373263;border-radius:8px;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer}.csw-quick button:hover{color:#fff;border-color:#7357ef}
    .csw-form{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:7px;padding:11px;border-top:1px solid #302d56;background:#0e0d20!important}.csw-input{width:100%;min-width:0;min-height:42px;padding:9px 10px;color:#f5f3ff;background:#191735!important;border:1px solid #373263;border-radius:9px;font:inherit;font-size:16px}.csw-input::placeholder{color:#77728f}.csw-input:focus{outline:3px solid rgba(124,92,255,.18);border-color:#7c5cff}.csw-send{display:grid;width:42px;height:42px;padding:0;place-items:center;color:#fff;background:#7357ef!important;border:1px solid #8f79f8;border-radius:9px;cursor:pointer}
    .csw-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;color:#77728f;background:#0e0d20!important;border-top:1px solid #252244;font-size:.58rem}.csw-footer a{color:#9f8cff;text-decoration:none;font-weight:750}
    html[data-theme="light"] #cyrus-support-widget,body[data-pronxt-effective-theme="light"] #cyrus-support-widget{color:#211d3c}.csw-light .csw-panel,html[data-theme="light"] .csw-panel,body[data-pronxt-effective-theme="light"] .csw-panel{background:#fff!important;border-color:#d7d1ed;box-shadow:0 28px 70px rgba(49,40,92,.22)!important}html[data-theme="light"] .csw-head,body[data-pronxt-effective-theme="light"] .csw-head{background:#f2efff!important;border-color:#d7d1ed}html[data-theme="light"] .csw-bot,body[data-pronxt-effective-theme="light"] .csw-bot{color:#413b62;background:#f0edfb!important;border-color:#d7d1ed}html[data-theme="light"] .csw-form,html[data-theme="light"] .csw-footer,body[data-pronxt-effective-theme="light"] .csw-form,body[data-pronxt-effective-theme="light"] .csw-footer{background:#f7f5ff!important;border-color:#d7d1ed}html[data-theme="light"] .csw-input,body[data-pronxt-effective-theme="light"] .csw-input{color:#211d3c;background:#fff!important;border-color:#cfc8e8}html[data-theme="light"] .csw-quick button,body[data-pronxt-effective-theme="light"] .csw-quick button{color:#5f587e;background:#f0edfb!important;border-color:#d7d1ed}
    @media(max-width:520px){#cyrus-support-widget{right:12px;bottom:max(12px,env(safe-area-inset-bottom))}.csw-panel{position:fixed;right:8px;bottom:78px;width:calc(100vw - 16px);height:min(620px,calc(100dvh - 92px));border-radius:17px}.csw-launcher{width:52px;height:52px}}
    @media(prefers-reduced-motion:reduce){.csw-panel{animation-duration:.01ms!important}.csw-launcher{transition-duration:.01ms!important}}
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement("aside");
  wrapper.id = "cyrus-support-widget";
  wrapper.setAttribute("aria-label", "CYRUS support assistant");
  wrapper.innerHTML = `
    <button class="csw-launcher" type="button" aria-label="Open support assistant" aria-expanded="false" aria-controls="cyrus-support-panel">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a9 9 0 1 1 18 0Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg><span class="csw-dot" aria-hidden="true"></span>
    </button>
    <section id="cyrus-support-panel" class="csw-panel" role="dialog" aria-modal="false" aria-labelledby="csw-title" hidden>
      <header class="csw-head"><span class="csw-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"/></svg></span><div class="csw-head-copy"><strong id="csw-title">CYRUS Support</strong><small>Local help assistant · No message storage</small></div><button class="csw-close" type="button" aria-label="Close support assistant"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div class="csw-messages" aria-live="polite" aria-label="Support conversation"></div>
      <div class="csw-quick" aria-label="Quick questions"><button type="button" data-question="How do I get account access?">Account access</button><button type="button" data-question="I need login help">Login help</button><button type="button" data-question="What are the official links?">Official links</button><button type="button" data-question="How do I stay safe?">Safety</button></div>
      <form class="csw-form"><input class="csw-input" type="text" maxlength="300" placeholder="Ask a support question…" aria-label="Support question" autocomplete="off"><button class="csw-send" type="submit" aria-label="Send question"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
      <footer class="csw-footer"><span>Local replies only</span><a href="https://t.me/CYRUSPANEL_SUPPORTBOT" target="_blank" rel="noopener noreferrer">Telegram support ↗</a></footer>
    </section>`;
  document.body.appendChild(wrapper);

  const launcher = wrapper.querySelector(".csw-launcher");
  const panel = wrapper.querySelector(".csw-panel");
  const close = wrapper.querySelector(".csw-close");
  const messages = wrapper.querySelector(".csw-messages");
  const form = wrapper.querySelector(".csw-form");
  const input = wrapper.querySelector(".csw-input");
  let greeted = false;

  function time() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function addMessage(text, sender = "bot") {
    const item = document.createElement("div");
    item.className = `csw-message ${sender === "user" ? "csw-user" : "csw-bot"}`;
    item.textContent = text;
    const stamp = document.createElement("small");
    stamp.className = "csw-time";
    stamp.textContent = time();
    item.appendChild(stamp);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function reply(question) {
    const q = question.toLowerCase();
    if (/(password|otp|pin|private key|secret|recovery code|token)/.test(q)) return "Please do not send passwords, OTPs, PINs, private keys, recovery codes, or complete authentication secrets. Use the official Telegram support bot for non-sensitive assistance.";
    if (/(get account|account access|new account|buy account)/.test(q)) return "Open the Get Account page from the main screen, then contact the official support bot for legitimate account-access information.";
    if (/(login|sign in|connect)/.test(q)) return "Use the Login button on the main page. If an error appears, note the exact message and contact the official support bot without sharing secret values.";
    if (/(official|telegram|channel|contact|support)/.test(q)) return "Official support bot: @CYRUSPANEL_SUPPORTBOT\nOfficial channel: @cyrus_c_panel";
    if (/(safe|security|protect|scam)/.test(q)) return "Verify usernames and HTTPS links, use an updated browser, and never share passwords, OTPs, recovery codes, card PINs, private keys, or full tokens.";
    if (/(privacy|data)/.test(q)) return "Review the Privacy page for deployment-specific information. Avoid submitting personal or sensitive information unless you understand how it is processed.";
    if (/(hello|hi|hey|namaste)/.test(q)) return "Hello! I can help with account access, login guidance, official links, privacy, and safety questions.";
    return "I can help with account access, login guidance, official support links, privacy, and safety. For a specific issue, use the official Telegram support bot.";
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close support assistant");
    if (!greeted) {
      addMessage("Hi! I’m the CYRUS local support assistant. I can answer basic questions without sending or storing your messages.");
      greeted = true;
    }
    window.setTimeout(() => input.focus(), 0);
  }
  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open support assistant");
    launcher.focus();
  }

  launcher.addEventListener("click", () => panel.hidden ? openPanel() : closePanel());
  close.addEventListener("click", closePanel);
  wrapper.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => {
    const question = button.dataset.question;
    addMessage(question, "user");
    window.setTimeout(() => addMessage(reply(question)), 180);
  }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addMessage(question, "user");
    input.value = "";
    window.setTimeout(() => addMessage(reply(question)), 220);
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) closePanel(); });
})();
