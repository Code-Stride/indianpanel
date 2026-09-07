(() => {
  "use strict";
  const key = "pronxt_ui_preferences_v1";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function selectedTheme() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      return ["light", "dark", "system"].includes(saved.theme) ? saved.theme : "system";
    } catch {
      return "system";
    }
  }
  function apply() {
    const selected = selectedTheme();
    document.documentElement.dataset.theme = selected === "system" ? (media.matches ? "dark" : "light") : selected;
  }
  apply();
  if (typeof media.addEventListener === "function") media.addEventListener("change", apply);
  window.addEventListener("storage", event => { if (event.key === key) apply(); });
})();
