// Which DOM content the translator touches. Shared by domTranslator.ts (live
// swaps) and collect.ts (static-pack builder), so both see the same strings.
//
// Excludes: <script>, <style>, <code>, <pre>, <textarea>, <input>, SVG,
// elements with [data-no-translate], contenteditable, mono/identifier classes
// and <time>, <kbd>, <samp>, <var>.

export const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT",
  "SVG", "PATH", "NOSCRIPT",
]);

export const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

export function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s);
}

export function shouldSkip(el: Element | null): boolean {
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
      const tag = node.tagName;
      if (tag === "TIME" || tag === "KBD" || tag === "SAMP" || tag === "VAR") return true;
    }
    node = node.parentElement;
  }
  return false;
}
