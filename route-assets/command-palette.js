(() => {
  "use strict";
  if (document.getElementById("cyrus-command-palette")) return;

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
  function navigate(path) { window.location.assign(resolve(path)); }

  const style = document.createElement("style");
  style.textContent = `
    #cyrus-command-palette[hidden]{display:none!important}
    #cyrus-command-palette{position:fixed;z-index:12000;inset:0;display:grid;align-items:start;justify-items:center;padding:clamp(70px,12vh,130px) 14px 20px;background:rgba(3,7,18,.82)!important;backdrop-filter:blur(12px)}
    .ccp-box{width:min(640px,100%);overflow:hidden;color:#f8fafc;background:#0f172a!important;border:1px solid rgba(56,189,248,.25);border-radius:20px;box-shadow:0 32px 100px rgba(0,0,0,.7)!important;animation:ccp-in .22s cubic-bezier(.16,1,.3,1) both}
    @keyframes ccp-in{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
    .ccp-search-wrap{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid rgba(255,255,255,.08)}
    .ccp-search-wrap svg{color:#38bdf8;flex:0 0 auto}
    .ccp-search{width:100%;min-width:0;height:44px;padding:0;color:#f8fafc;background:transparent!important;border:0;outline:0;font:inherit;font-size:16px}
    .ccp-search::placeholder{color:#64748b}
    .ccp-shortcut{padding:4px 8px;color:#94a3b8;background:#1e293b;border:1px solid rgba(255,255,255,.1);border-radius:6px;font-size:.65rem;white-space:nowrap;font-family:monospace}
    .ccp-results{max-height:min(470px,60vh);padding:8px;overflow-y:auto}
    .ccp-item{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;min-height:54px;padding:8px 10px;color:#cbd5e1;background:transparent!important;border:1px solid transparent;border-radius:12px;text-align:left;cursor:pointer;transition:all .15s ease}
    .ccp-item:hover,.ccp-item[aria-selected="true"]{color:#fff;background:rgba(56,189,248,.12)!important;border-color:rgba(56,189,248,.3)}
    .ccp-icon{display:grid;width:36px;height:36px;place-items:center;color:#38bdf8;background:#1e293b!important;border-radius:10px;font-weight:900}
    .ccp-copy{min-width:0}.ccp-copy strong,.ccp-copy small{display:block}
    .ccp-copy strong{font-size:.82rem}.ccp-copy small{margin-top:2px;color:#64748b;font-size:.65rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ccp-kind{color:#0284c7;background:rgba(14,165,233,.15);padding:2px 6px;border-radius:6px;font-size:.6rem;text-transform:uppercase;font-weight:700}
    .ccp-empty{padding:32px;color:#64748b;text-align:center;font-size:.82rem}
    .ccp-foot{display:flex;gap:14px;padding:10px 16px;color:#64748b;background:#090d16!important;border-top:1px solid rgba(255,255,255,.06);font-size:.62rem}
    html[data-theme="light"] .ccp-box,body[data-pronxt-effective-theme="light"] .ccp-box{color:#0f172a;background:#fff!important;border-color:#cbd5e1;box-shadow:0 32px 80px rgba(0,0,0,.15)!important}
    html[data-theme="light"] .ccp-search-wrap,html[data-theme="light"] .ccp-foot,body[data-pronxt-effective-theme="light"] .ccp-search-wrap,body[data-pronxt-effective-theme="light"] .ccp-foot{border-color:#e2e8f0}
    html[data-theme="light"] .ccp-search,body[data-pronxt-effective-theme="light"] .ccp-search{color:#0f172a}
    html[data-theme="light"] .ccp-item,body[data-pronxt-effective-theme="light"] .ccp-item{color:#475569}
    html[data-theme="light"] .ccp-item:hover,html[data-theme="light"] .ccp-item[aria-selected="true"],body[data-pronxt-effective-theme="light"] .ccp-item:hover,body[data-pronxt-effective-theme="light"] .ccp-item[aria-selected="true"]{color:#0f172a;background:#f0f9ff!important;border-color:#bae6fd}
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

  const commands = [
    { title: "Go Home", detail: "Open Main Login Page", icon: "🏠", kind: "Route", run: () => navigate("/") },
    { title: "Open Settings", detail: "Theme, layout, density and privacy", icon: "⚙️", kind: "Route", run: () => navigate("/settings/") },
    { title: "Open Accounts", detail: "Standalone account workspace", icon: "👥", kind: "Route", run: () => navigate("/accounts/") },
    { title: "Get Account", detail: "Account-access information", icon: "🔑", kind: "Route", run: () => navigate("/get-accounts/") },
    { title: "Open Profile", detail: "User profile route", icon: "👤", kind: "Route", run: () => navigate("/profile/") },
    { title: "Documentation", detail: "Guides, login tutorial and troubleshooting", icon: "📚", kind: "Route", run: () => navigate("/docs/") },
    { title: "Changelog", detail: "Version history and recent updates", icon: "📋", kind: "Route", run: () => navigate("/changelog/") },
    { title: "System Status", detail: "Live browser diagnostics and health checks", icon: "⚡", kind: "Route", run: () => navigate("/status/") },
    { title: "Contact Support Bot", detail: "Open official Telegram support bot", icon: "💬", kind: "Support", run: () => window.open("https://t.me/CYRUSPANEL_SUPPORTBOT", "_blank", "noopener") },
    { title: "Official Telegram Channel", detail: "Join @cyrus_c_panel updates channel", icon: "📢", kind: "Support", run: () => window.open("https://t.me/cyrus_c_panel", "_blank", "noopener") },
    { title: "Toggle Privacy Mode", detail: "Mask or reveal sensitive values on screen", icon: "👁️", kind: "Setting", run: () => { const p = prefs(); p.privacy = !p.privacy; savePrefs(p); } },
    { title: "Cycle Theme", detail: "System → Dark → Light", icon: "🌓", kind: "Setting", run: () => { const p = prefs(); p.theme = p.theme === "system" ? "dark" : p.theme === "dark" ? "light" : "system"; savePrefs(p); } },
    { title: "Language Settings", detail: "English, Hindi and Bengali", icon: "🌐", kind: "Setting", run: () => navigate("/settings/language/") },
    { title: "Accessibility Controls", detail: "Text size, contrast, motion and touch targets", icon: "♿", kind: "Setting", run: () => navigate("/settings/accessibility/") },
    { title: "Generate Support Ticket", detail: "Create a redacted diagnostic summary", icon: "🎫", kind: "Support", run: () => navigate("/support/ticket/") }
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
