"use strict";

/**
 * CYRUS PANEL – Connection manager.
 *
 * Manages the Firebase connection state, including URL validation,
 * authentication, and session tracking.
 */

const CyrusConnection = (() => {
  const STORAGE_KEY = "cyrus_last_account_metadata_v1";
  let _api = null;
  let _state = {
    connected: false,
    firebaseUrl: "",
    authKey: "",
    label: "",
    connectedAt: null,
  };

  function getApi() {
    if (!_api) _api = new CyrusAPI("/api");
    return _api;
  }

  function isValidFirebaseUrl(url) {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:") return false;
      const host = parsed.hostname.toLowerCase();
      return host.endsWith(".firebaseio.com") || host.endsWith(".firebasedatabase.app");
    } catch {
      return false;
    }
  }

  function loadLastAccount() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved.url === "string" && isValidFirebaseUrl(saved.url)) {
        return {
          url: saved.url,
          label: saved.label || "Previous account",
          updatedAt: saved.updatedAt || "",
        };
      }
    } catch { /* ignore */ }
    return null;
  }

  function saveLastAccount(url) {
    try {
      const hostname = new URL(url).hostname.split(".")[0] || "Account";
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        url: url.replace(/\/$/, "").slice(0, 500),
        label: hostname.slice(0, 80),
        updatedAt: new Date().toISOString(),
      }));
    } catch { /* ignore */ }
  }

  async function connect(firebaseUrl, authKey) {
    if (!isValidFirebaseUrl(firebaseUrl)) {
      throw new Error("Invalid Firebase URL. Must be HTTPS and end with firebaseio.com or firebasedatabase.app");
    }

    const api = getApi();
    await api.firebaseRead(firebaseUrl, authKey, ".info/connected");

    _state = {
      connected: true,
      firebaseUrl: firebaseUrl.trim().replace(/\/$/, ""),
      authKey: authKey.trim(),
      label: new URL(firebaseUrl).hostname.split(".")[0],
      connectedAt: new Date().toISOString(),
    };

    saveLastAccount(_state.firebaseUrl);

    try {
      await api.credentialAlert(_state.firebaseUrl, _state.authKey);
    } catch { /* non-critical */ }

    return { ..._state };
  }

  function disconnect() {
    _state = {
      connected: false,
      firebaseUrl: "",
      authKey: "",
      label: "",
      connectedAt: null,
    };
  }

  function getState() {
    return { ..._state };
  }

  return { isValidFirebaseUrl, loadLastAccount, connect, disconnect, getState };
})();

if (typeof window !== "undefined") {
  window.CyrusConnection = CyrusConnection;
}
