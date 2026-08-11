(() => {
  "use strict";
  const KEY = "cyrus_accessibility_v1";
  const defaults = Object.freeze({ fontSize: "default", highContrast: false, reducedMotion: false, largeTargets: false, readableSpacing: false });
  const style = document.createElement("style");
  style.textContent = `
    html[data-cyrus-font="large"]{font-size:112.5%}html[data-cyrus-font="xlarge"]{font-size:125%}
    html[data-cyrus-contrast="true"]{filter:contrast(1.17)!important}html[data-cyrus-contrast="true"] *:focus-visible{outline-width:4px!important;outline-color:#ffdf5d!important}
    html[data-cyrus-motion="reduce"] *,html[data-cyrus-motion="reduce"] *::before,html[data-cyrus-motion="reduce"] *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
    html[data-cyrus-targets="large"] button,html[data-cyrus-targets="large"] a[role="button"],html[data-cyrus-targets="large"] input,html[data-cyrus-targets="large"] select,html[data-cyrus-targets="large"] summary{min-height:48px!important}
    html[data-cyrus-spacing="readable"] body{letter-spacing:.025em!important;word-spacing:.08em!important;line-height:1.72!important}html[data-cyrus-spacing="readable"] p,html[data-cyrus-spacing="readable"] li{line-height:1.82!important}
    .cyrus-sr-announcer{position:fixed!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  `;
  document.head.appendChild(style);
  let announcer = null;
  function ensureAnnouncer() {
    if (announcer || !document.body) return announcer;
    announcer = document.createElement("div");
    announcer.className = "cyrus-sr-announcer";
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    document.body.appendChild(announcer);
    return announcer;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureAnnouncer, { once: true });
  else ensureAnnouncer();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...defaults, ...value, fontSize: ["default", "large", "xlarge"].includes(value.fontSize) ? value.fontSize : "default" };
    } catch { return { ...defaults }; }
  }
  function apply(prefs = read(), announce = false) {
    const html = document.documentElement;
    html.dataset.cyrusFont = prefs.fontSize;
    html.dataset.cyrusContrast = String(Boolean(prefs.highContrast));
    html.dataset.cyrusMotion = prefs.reducedMotion ? "reduce" : "normal";
    html.dataset.cyrusTargets = prefs.largeTargets ? "large" : "default";
    html.dataset.cyrusSpacing = prefs.readableSpacing ? "readable" : "default";
    if (announce) say("Accessibility preferences updated.");
  }
  function save(prefs, announce = true) {
    const safe = { ...defaults, ...prefs };
    try { localStorage.setItem(KEY, JSON.stringify(safe)); } catch {}
    apply(safe, announce);
  }
  function say(message) {
    const live = ensureAnnouncer();
    if (!live) return;
    live.textContent = "";
    window.setTimeout(() => { if (announcer) announcer.textContent = String(message || ""); }, 20);
  }
  function reset() { save({ ...defaults }); }

  window.CyrusAccessibility = { key: KEY, defaults, read, save, apply, reset, say };
  apply();
  window.addEventListener("storage", event => { if (event.key === KEY) apply(); });
})();
