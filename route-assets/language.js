(() => {
  "use strict";
  const KEY = "cyrus_language_v1";
  const supported = new Set(["en", "hi", "bn"]);
  const dictionaries = {
    en: {},
    hi: {
      "Login": "लॉगिन", "Get Account": "अकाउंट प्राप्त करें", "Support": "सहायता", "Privacy": "गोपनीयता",
      "Terms": "नियम", "More": "अधिक", "Accounts": "अकाउंट", "Profile": "प्रोफ़ाइल", "About": "परिचय",
      "Copyright": "कॉपीराइट", "Settings": "सेटिंग्स", "Home": "होम", "Logout": "लॉगआउट",
      "Connected": "कनेक्टेड", "Maybe later": "बाद में", "Join Telegram": "टेलीग्राम जॉइन करें",
      "Account access": "अकाउंट एक्सेस", "Login help": "लॉगिन सहायता", "Official links": "आधिकारिक लिंक", "Safety": "सुरक्षा",
      "Open support assistant": "सहायता सहायक खोलें", "Search devices...": "डिवाइस खोजें..."
    },
    bn: {
      "Login": "লগইন", "Get Account": "অ্যাকাউন্ট নিন", "Support": "সহায়তা", "Privacy": "গোপনীয়তা",
      "Terms": "শর্তাবলী", "More": "আরও", "Accounts": "অ্যাকাউন্ট", "Profile": "প্রোফাইল", "About": "পরিচিতি",
      "Copyright": "কপিরাইট", "Settings": "সেটিংস", "Home": "হোম", "Logout": "লগআউট",
      "Connected": "সংযুক্ত", "Maybe later": "পরে", "Join Telegram": "টেলিগ্রামে যোগ দিন",
      "Account access": "অ্যাকাউন্ট অ্যাক্সেস", "Login help": "লগইন সহায়তা", "Official links": "অফিশিয়াল লিংক", "Safety": "নিরাপত্তা",
      "Open support assistant": "সহায়তা সহকারী খুলুন", "Search devices...": "ডিভাইস খুঁজুন..."
    }
  };
  const originals = new WeakMap();
  let applying = false;

  function get() {
    try { const value = localStorage.getItem(KEY) || "en"; return supported.has(value) ? value : "en"; }
    catch { return "en"; }
  }
  function translate(value, language = get()) { return dictionaries[language]?.[value] || value; }
  function apply(root = document) {
    if (applying) return;
    applying = true;
    const language = get();
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(root === document ? document.body : root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(parent.tagName)) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const original = originals.get(node);
      const trimmed = original.trim();
      if (!trimmed) continue;
      const translated = translate(trimmed, language);
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = leading + translated + trailing;
    }
    root.querySelectorAll?.("input[placeholder], textarea[placeholder]").forEach(element => {
      if (!element.dataset.cyrusOriginalPlaceholder) element.dataset.cyrusOriginalPlaceholder = element.placeholder;
      element.placeholder = translate(element.dataset.cyrusOriginalPlaceholder, language);
    });
    root.querySelectorAll?.("[aria-label]").forEach(element => {
      if (!element.dataset.cyrusOriginalAria) element.dataset.cyrusOriginalAria = element.getAttribute("aria-label");
      element.setAttribute("aria-label", translate(element.dataset.cyrusOriginalAria, language));
    });
    applying = false;
    window.dispatchEvent(new CustomEvent("cyruslanguagechange", { detail: { language } }));
  }
  function set(language) {
    if (!supported.has(language)) return;
    try { localStorage.setItem(KEY, language); } catch {}
    apply(document);
  }

  window.CyrusLanguage = { get, set, translate, apply, supported: [...supported] };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply(document));
  else apply(document);
  new MutationObserver(records => {
    if (applying) return;
    records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) apply(node); }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
