// Collects the cache keys the DOM translator would look up on the current page:
// text nodes plus placeholder, title, aria-label and alt, after the same skip
// rules and sentence splitting. Used by scripts/i18n/build-packs.mjs (bundled
// and injected into a rendered page), never by the running app.

import { ATTRS, hasLetters, shouldSkip } from "./domRules";
import { translationKeys } from "./textRules";

export function collectStrings(root: Node = document.body, staticValues: Set<string> = new Set()): string[] {
  const out = new Set<string>();
  const add = (keys: string[]) => keys.forEach(k => out.add(k));

  const attrs = (el: Element) => {
    for (const a of ATTRS) {
      const cur = el.getAttribute(a);
      if (!cur || !hasLetters(cur) || staticValues.has(cur.trim())) continue;
      add(translationKeys(cur));
    }
  };
  const text = (node: Text) => {
    const trimmed = (node.nodeValue ?? "").trim();
    if (!trimmed || !hasLetters(trimmed) || staticValues.has(trimmed)) return;
    add(translationKeys(trimmed));
  };

  if (root.nodeType === Node.ELEMENT_NODE) {
    if (shouldSkip(root as Element)) return [];
    attrs(root as Element);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return shouldSkip(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const parent = n.parentElement;
      if (parent && !shouldSkip(parent)) text(n as Text);
    } else {
      attrs(n as Element);
    }
    n = walker.nextNode();
  }
  return Array.from(out);
}
