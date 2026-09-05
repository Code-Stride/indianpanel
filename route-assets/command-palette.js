(() => {
  "use strict";
  if (document.getElementById("cyrus-command-palette")) return;
  const style = document.createElement("style");
  style.textContent = `
    #cyrus-command-palette[hidden]{display:none!important}#cyrus-command-palette{position:fixed;z-index:12000;inset:0;display:grid;align-items:start;justify-items:center;padding:clamp(70px,12vh,130px) 14px 20px;background:rgba(4,3,12,.76)!important;backdrop-filter:blur(8px)}
    .ccp-box{width:min(640px,100%);overflow:hidden;color:#f5f3ff;background:#111026!important;border:1px solid #413a72;border-radius:18px;box-shadow:0 32px 100px rgba(0,0,0,.55)!important;animation:ccp-in .22s cubic-bezier(.16,1,.3,1) both}@keyframes ccp-in{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
    .ccp-search-wrap{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #302d56}.ccp-search-wrap svg{color:#918aaf;flex:0 0 auto}.ccp-search{width:100%;min-width:0;height:44px;padding:0;color:#f5f3ff;background:transparent!important;border:0;outline:0;font:inherit;font-size:16px}.ccp-search::placeholder{color:#77728f}.ccp-shortcut{padding:4px 6px;color:#77728f;background:#1d1a3b;border:1px solid #3b3568;border-radius:6px;font-size:.62rem;white-space:nowrap}
    .ccp-results{max-height:min(470px,60vh);padding:8px;overflow-y:auto}.ccp-item{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;min-height:54px;padding:7px 9px;color:#bdb7d7;background:transparent!important;border:1px solid transparent;border-radius:11px;text-align:left;cursor:pointer}.ccp-item:hover,.ccp-item[aria-selected="true"]{color:#fff;background:#1c1939!important;border-color:#3b3568}.ccp-icon{display:grid;width:36px;height:36px;place-items:center;color:#a994ff;background:#242046!important;border-radius:9px;font-weight:900}.ccp-copy{min-width:0}.ccp-copy strong,.ccp-copy small{display:block}.ccp-copy strong{font-size:.78rem}.ccp-copy small{margin-top:2px;color:#77728f;font-size:.62rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ccp-kind{color:#68627e;font-size:.58rem;text-transform:uppercase}.ccp-empty{padding:32px;color:#77728f;text-align:center;font-size:.78rem}.ccp-foot{display:flex;gap:14px;padding:9px 13px;color:#68627e;background:#0e0d20!important;border-top:1px solid #252244;font-size:.57rem}
    html[data-theme="light"] .ccp-box,body[data-pronxt-effective-theme="light"] .ccp-box{color:#211d3c;background:#fff!important;border-color:#d7d1ed;box-shadow:0 32px 80px rgba(48,40,90,.22)!important}html[data-theme="light"] .ccp-search-wrap,html[data-theme="light"] .ccp-foot,body[data-pronxt-effective-theme="light"] .ccp-search-wrap,body[data-pronxt-effective-theme="light"] .ccp-foot{border-color:#ded9ef}html[data-theme="light"] .ccp-search,body[data-pronxt-effective-theme="light"] .ccp-search{color:#211d3c}html[data-theme="light"] .ccp-item,body[data-pronxt-effective-theme="light"] .ccp-item{color:#5f587e}html[data-theme="light"] .ccp-item:hover,html[data-theme="light"] .ccp-item[aria-selected="true"],body[data-pronxt-effective-theme="light"] .ccp-item:hover,body[data-pronxt-effective-theme="light"] .ccp-item[aria-selected="true"]{color:#211d3c;background:#f0edfb!important;border-color:#d7d1ed}
    @media(max-width:520px){#cyrus-command-palette{padding-top:20px}.ccp-results{max-height:70vh}.ccp-item{grid-template-columns:36px minmax(0,1fr)}.ccp-kind{display:none}}
  `;
  document.head.appendChild(style);
  const overlay = document.createElement("div");
  overlay.id = "cyrus-command-palette";
  overlay.hidden = true;
  overlay.innerHTML = `<section class="ccp-box" role="dialog" aria-modal="true" aria-label="Command palette"><div class="ccp-search-wrap"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="ccp-search" type="text" placeholder="Search commands…" aria-label="Search commands" autocomplete="off"><kbd class="ccp-shortcut">Esc</kbd></div><div class="ccp-results" role="listbox"></div><footer class="ccp-foot"><span>↑↓ Navigate</span><span>Enter Select</span><span>Esc Close</span></footer></section>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector(".ccp-search");
  const results = overlay.querySelector(".ccp-results");
  let selected = 0;
  let visible = [];

  function prefs() { try { return { theme: "system", privacy: false, ...JSON.parse(localStorage.getItem("pronxt_ui_preferences_v1") || "{}") }; } catch { return { theme: "system", privacy: false }; } }
  function savePrefs(value) { try { localStorage.setItem("pronxt_ui_preferences_v1", JSON.stringify(value)); } catch {} window.location.reload(); }
  function navigate(path) { window.location.assign(path); }
  const commands = [
    { title: "Go home", detail: "Open main Login page", icon: "H", kind: "Route", run: () => navigate("/") },
    { title: "Open Settings", detail: "Theme, layout, density and privacy", icon: "S", kind: "Route", run: () => navigate("/settings/") },
    { title: "Open Accounts", detail: "Standalone account workspace", icon: "A", kind: "Route", run: () => navigate("/accounts/") },
    { title: "Get Account", detail: "Account-access information", icon: "G", kind: "Route", run: () => navigate("/get-accounts/") },
    { title: "Open Profile", detail: "Profile route", icon: "P", kind: "Route", run: () => navigate("/profile/") },
    { title: "Documentation", detail: "Guides and troubleshooting", icon: "D", kind: "Route", run: () => navigate("/docs/") },
    { title: "Changelog", detail: "Versions and recent changes", icon: "C", kind: "Route", run: () => navigate("/changelog/") },
    { title: "System Status", detail: "Safe browser and deployment checks", icon: "●", kind: "Route", run: () => navigate("/status/") },
    { title: "Contact support", detail: "Open official Telegram support bot", icon: "?", kind: "Support", run: () => window.open("https://t.me/CYRUSPANEL_SUPPORTBOT", "_blank", "noopener") },
    { title: "Toggle privacy mode", detail: "Mask or reveal sensitive-looking values", icon: "◐", kind: "Setting", run: () => { const p = prefs(); p.privacy = !p.privacy; savePrefs(p); } },
    { title: "Cycle theme", detail: "System → Dark → Light", icon: "◒", kind: "Setting", run: () => { const p = prefs(); p.theme = p.theme === "system" ? "dark" : p.theme === "dark" ? "light" : "system"; savePrefs(p); } },
    { title: "Language settings", detail: "English, Hindi and Bengali", icon: "文", kind: "Setting", run: () => navigate("/settings/language/") },
    { title: "Accessibility controls", detail: "Text, contrast, motion and touch targets", icon: "Aa", kind: "Setting", run: () => navigate("/settings/accessibility/") },
    { title: "Generate support ticket", detail: "Create a redacted troubleshooting summary", icon: "T", kind: "Support", run: () => navigate("/support/ticket/") }
  ];
  function render() {
    const query = input.value.trim().toLowerCase();
    visible = commands.filter(command => !query || `${command.title} ${command.detail} ${command.kind}`.toLowerCase().includes(query));
    selected = Math.max(0, Math.min(selected, visible.length - 1));
    results.textContent = "";
    if (!visible.length) { const empty = document.createElement("div"); empty.className = "ccp-empty"; empty.textContent = "No command found."; results.appendChild(empty); return; }
    visible.forEach((command, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "ccp-item"; button.setAttribute("role", "option"); button.setAttribute("aria-selected", String(index === selected));
      button.innerHTML = `<span class="ccp-icon" aria-hidden="true"></span><span class="ccp-copy"><strong></strong><small></small></span><span class="ccp-kind"></span>`;
      button.querySelector(".ccp-icon").textContent = command.icon; button.querySelector("strong").textContent = command.title; button.querySelector("small").textContent = command.detail; button.querySelector(".ccp-kind").textContent = command.kind;
      button.addEventListener("mouseenter", () => { selected = index; renderSelection(); });
      button.addEventListener("click", () => execute(command)); results.appendChild(button);
    });
  }
  function renderSelection() { results.querySelectorAll(".ccp-item").forEach((item, index) => item.setAttribute("aria-selected", String(index === selected))); results.querySelectorAll(".ccp-item")[selected]?.scrollIntoView({ block: "nearest" }); }
  function execute(command) { close(); command?.run(); }
  function open() { overlay.hidden = false; selected = 0; input.value = ""; render(); window.setTimeout(() => input.focus(), 0); }
  function close() { overlay.hidden = true; }
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      if (document.getElementById("cyrus-onboarding")) return;
      event.preventDefault(); overlay.hidden ? open() : close(); return;
    }
    if (overlay.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); selected = Math.min(selected + 1, visible.length - 1); renderSelection(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); selected = Math.max(selected - 1, 0); renderSelection(); }
    else if (event.key === "Enter" && document.activeElement === input) { event.preventDefault(); execute(visible[selected]); }
  });
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  input.addEventListener("input", () => { selected = 0; render(); });
  window.CyrusCommandPalette = { open, close };
})();
