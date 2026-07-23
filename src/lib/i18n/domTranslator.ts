// Global DOM translator.
// Walks visible text nodes + translatable attributes and swaps English for the
// active locale using the shared autoTranslate cache. A MutationObserver
// re-processes anything React (re-)renders. React can re-write our text nodes
// on its next render — the observer catches that and re-translates.
//
// Excludes: <script>, <style>, <code>, <pre>, <textarea>, <input>,
// elements with [data-no-translate], contenteditable, and empty / numeric text.
//
// Attributes translated: placeholder, title, aria-label, alt.

import { subscribe as subscribeCache, translateSync } from "./autoTranslate";

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT",
  "SVG", "PATH", "NOSCRIPT",
]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const ORIG_ATTR = "data-i18n-orig";

function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s);
}

function shouldSkip(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.getAttribute) {
      if (node.getAttribute("data-no-translate") !== null) return true;
      if (node.getAttribute("contenteditable") === "true") return true;
      // Never touch code-shaped or identifier content: hashes, GSTIN, HSN, etc.
      const cls = node.getAttribute("class") || "";
      if (/\bfont-mono\b/.test(cls)) return true;
      if (/\b(hash|sha|gstin|hsn|code|identifier)\b/i.test(cls)) return true;
      // Never translate <time>, <kbd>, <samp>, <var> content
      const tag = node.tagName;
      if (tag === "TIME" || tag === "KBD" || tag === "SAMP" || tag === "VAR") return true;
    }
    node = node.parentElement;
  }
  return false;
}

function processTextNode(locale: string, node: Text) {
  const parent = node.parentElement;
  if (!parent || shouldSkip(parent)) return;
  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  if (!trimmed || !hasLetters(trimmed)) return;
  // Preserve leading/trailing whitespace
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const tail = raw.match(/\s*$/)?.[0] ?? "";

  // Remember original English so re-translations use the same source
  // even after another locale has replaced the node's text.
  const key = "__i18nOriginal";
  const anyNode = node as any;
  const original: string = anyNode[key] ?? trimmed;
  anyNode[key] = original;

  const translated = translateSync(locale, original);
  const next = `${lead}${translated}${tail}`;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function processAttr(locale: string, el: Element, attr: string) {
  if (shouldSkip(el)) return;
  const cur = el.getAttribute(attr);
  if (!cur || !hasLetters(cur)) return;
  const stashKey = `${ORIG_ATTR}-${attr}`;
  const original = el.getAttribute(stashKey) ?? cur;
  if (!el.getAttribute(stashKey)) el.setAttribute(stashKey, original);
  const translated = translateSync(locale, original);
  if (cur !== translated) el.setAttribute(attr, translated);
}

function walk(locale: string, root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(locale, root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const el = root as Element;
  if (root.nodeType === Node.ELEMENT_NODE && shouldSkip(el)) return;

  if (root.nodeType === Node.ELEMENT_NODE) {
    for (const a of ATTRS) processAttr(locale, el, a);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return shouldSkip(node as Element)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP; // descend but don't visit as text
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) processTextNode(locale, n as Text);
    else if (n.nodeType === Node.ELEMENT_NODE) {
      for (const a of ATTRS) processAttr(locale, n as Element, a);
    }
    n = walker.nextNode();
  }
}

let currentLocale = "en";
let observer: MutationObserver | null = null;
let cacheUnsub: (() => void) | null = null;
let scheduled = false;
const dirtyRoots = new Set<Node>();

function scheduleWalk(root: Node) {
  dirtyRoots.add(root);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const roots = Array.from(dirtyRoots);
    dirtyRoots.clear();
    for (const r of roots) {
      try { walk(currentLocale, r); } catch {}
    }
  });
}

export function startDomTranslator(locale: string) {
  stopDomTranslator();
  currentLocale = locale;
  if (locale === "en") return;

  // Initial pass
  scheduleWalk(document.body);

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target) {
        scheduleWalk(m.target);
      } else if (m.type === "childList") {
        m.addedNodes.forEach((n) => scheduleWalk(n));
      } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
        scheduleWalk(m.target);
      }
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });

  // Re-walk when new translations land in cache.
  cacheUnsub = subscribeCache(() => scheduleWalk(document.body));
}

export function stopDomTranslator() {
  observer?.disconnect();
  observer = null;
  cacheUnsub?.();
  cacheUnsub = null;
  // Restore originals so switching back to English shows English immediately.
  try {
    const all = document.body.querySelectorAll<HTMLElement>("*");
    all.forEach((el) => {
      for (const a of ATTRS) {
        const stash = el.getAttribute(`${ORIG_ATTR}-${a}`);
        if (stash) {
          el.setAttribute(a, stash);
          el.removeAttribute(`${ORIG_ATTR}-${a}`);
        }
      }
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      const orig = (n as any).__i18nOriginal as string | undefined;
      if (orig !== undefined) {
        const raw = n.nodeValue ?? "";
        const lead = raw.match(/^\s*/)?.[0] ?? "";
        const tail = raw.match(/\s*$/)?.[0] ?? "";
        n.nodeValue = `${lead}${orig}${tail}`;
      }
      n = walker.nextNode();
    }
  } catch {}
}
