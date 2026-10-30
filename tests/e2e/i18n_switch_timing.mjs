// Time from picking a language to no English text node left on the page.
// Usage: node tests/e2e/i18n_switch_timing.mjs <base> [route] [locale] [--max 60000] [--shots dir]
//   base    e.g. http://localhost:4173 (a local `vite preview` of dist/)
//   route   default /brsr-reporting
//   locale  default hi (hi, ta, bn, mr... uses the locale's script to tell translated text)
// A text node counts as English when it has no character in the locale's script
// and still has a Latin word of 3+ letters after removing protected terms
// (brand, standards, units: the terms translate-batch keeps as written).
// The language toast is ignored. Read-only; submits nothing.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const [base = "http://localhost:4173", route = "/brsr-reporting", locale = "hi"] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !(all[i - 1] || "").startsWith("--"));
const opt = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const maxMs = Number(opt("max", "60000"));
const shots = opt("shots", "");

const SCRIPTS = {
  hi: "\\u0900-\\u097F", mr: "\\u0900-\\u097F", bn: "\\u0980-\\u09FF", ta: "\\u0B80-\\u0BFF",
  te: "\\u0C00-\\u0C7F", gu: "\\u0A80-\\u0AFF", pa: "\\u0A00-\\u0A7F", ml: "\\u0D00-\\u0D7F", kn: "\\u0C80-\\u0CFF",
  ur: "\\u0600-\\u06FF", ar: "\\u0600-\\u06FF", th: "\\u0E00-\\u0E7F", zh: "\\u4E00-\\u9FFF",
};
// Same list as translate-batch PROTECTED_TERMS, plus the brand's own names.
const PROTECTED = [
  "Senseible", "Biocog", "MRV", "ESG", "GRI", "TCFD", "BRSR", "CBAM", "CDP",
  "SBTi", "GHG Protocol", "ISO 14064", "ISO 14001", "PAS 2060", "IFRS S2",
  "GSTIN", "GST", "HSN", "PAN", "CIN", "LEI", "ISIN", "MSME", "SME",
  "tCO2e", "CO2", "CO2e", "kWh", "MWh", "GJ", "kg", "SHA-256", "PDF", "API",
  "EU", "UK", "US", "IEA", "UNFCCC", "Scope 1", "Scope 2", "Scope 3",
  // SEBI framework name the translator keeps as written.
  "BRSR Core",
];

// Playwright routes loopback through the proxy unless told not to.
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK ??= "1";
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
const browser = await chromium.launch({ proxy });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addInitScript(() => {
  if (!sessionStorage.getItem("__timing")) {
    sessionStorage.setItem("__timing", "1");
    try { localStorage.setItem("senseible_locale", "en"); } catch {}
  }
});
const page = await ctx.newPage();
await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.locator('button[aria-label^="Change language"]').first().click();
await page.waitForTimeout(300);

const result = await page.evaluate(async ({ locale, script, protectedTerms, maxMs }) => {
  const scriptRe = new RegExp(`[${script}]`);
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "TIME", "KBD", "SAMP", "VAR"]);
  const skipped = (el) => {
    for (let n = el; n; n = n.parentElement) {
      if (SKIP.has(n.tagName.toUpperCase())) return true;
      if (n.hasAttribute("data-no-translate") || n.hasAttribute("data-sonner-toaster")) return true;
      const cls = n.getAttribute("class") || "";
      if (/\bfont-mono\b/.test(cls) || /\b(hash|sha|gstin|hsn|code|identifier)\b/i.test(cls)) return true;
    }
    return false;
  };
  const english = () => {
    const left = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.nodeValue || "").trim();
      if (!t || scriptRe.test(t) || !n.parentElement || skipped(n.parentElement)) continue;
      let s = t;
      for (const term of protectedTerms) s = s.split(term).join(" ");
      if (/[A-Za-z]{3,}/.test(s)) left.push(t.slice(0, 90));
    }
    return left;
  };
  const btn = document.querySelector(`[data-prefetch-locale="${locale}"]`)
    || [...document.querySelectorAll("button")].find((b) => b.textContent.includes({ hi: "हिन्दी", ta: "தமிழ்" }[locale] || "~"));
  const before = english().length;
  const t0 = performance.now();
  btn.click();
  return new Promise((resolve) => {
    const tick = () => {
      const left = english();
      const ms = performance.now() - t0;
      if (left.length === 0) resolve({ before, ms: Math.round(ms), left: 0 });
      else if (ms > maxMs) resolve({ before, ms: null, left: left.length, sample: left.slice(0, 12) });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { locale, script: SCRIPTS[locale] || "\\u0900-\\u097F", protectedTerms: [...PROTECTED].sort((a, b) => b.length - a.length), maxMs });

console.log(JSON.stringify({ route, locale, ...result }, null, 1));
if (shots) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/${route.replace(/\W+/g, "_")}_${locale}_desktop.png`, fullPage: false });
}
await browser.close();
