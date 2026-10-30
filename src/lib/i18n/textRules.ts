// Pure text rules shared by the runtime translator (autoTranslate.ts) and the
// language-pack builder (scripts/i18n/build-packs.mjs). No imports, so Node can
// load this file directly; both sides must see exactly the same strings.

/** Text longer than this is translated sentence by sentence. */
export const LONG_TEXT_CHARS = 500;

/** True when `text` is worth translating (same skip rules as the runtime). */
export function isTranslatable(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Pure numeric/symbolic tokens
  if (/^[\d\s.,%:/+\-]+$/.test(trimmed)) return false;
  // No letters at all (emoji, punctuation, code-ish)
  if (!/\p{L}/u.test(trimmed)) return false;
  // Identifiers / code tokens (GSTIN, HSN, SHA hashes, ISO codes)
  if (/^[A-Z0-9_\-]{4,}$/.test(trimmed)) return false;
  // Emails and URLs
  if (/^\S+@\S+\.\S+$/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

// A sentence ends at . ! ? or the Devanagari danda, optionally followed by a
// closing quote or bracket, then whitespace and a capital, digit or opener.
const SENTENCE_END = /[.!?।]["'’”)\]]?(?=\s+["'‘“(\[]?[\p{Lu}\d])/gu;

function cutAt(text: string, re: RegExp): string[] {
  const out: string[] = [];
  let start = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let end = m.index + m[0].length;
    while (end < text.length && /\s/.test(text[end])) end++;
    out.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
}

/**
 * Split long text into pieces that join back to exactly `text`
 * (`splitLongText(t).join("") === t`). Each piece keeps its trailing spacing.
 * Short text comes back as a single piece. A sentence still over the limit is
 * cut at "; " and then ", " boundaries.
 */
export function splitLongText(text: string, limit = LONG_TEXT_CHARS): string[] {
  if (typeof text !== "string" || text.length <= limit) return [text];
  const pieces: string[] = [];
  for (const sentence of cutAt(text, SENTENCE_END)) {
    if (sentence.length <= limit) { pieces.push(sentence); continue; }
    let parts = cutAt(sentence, /;(?=\s)/g);
    if (parts.some(p => p.length > limit)) parts = parts.flatMap(p => (p.length > limit ? cutAt(p, /,(?=\s)/g) : [p]));
    // Merge small neighbours back so pieces stay close to the limit.
    let buf = "";
    for (const p of parts) {
      if (buf && buf.length + p.length > limit) { pieces.push(buf); buf = ""; }
      buf += p;
    }
    if (buf) pieces.push(buf);
  }
  return pieces;
}

/** Leading spacing, core text and trailing spacing of a piece. */
export function splitSpacing(piece: string): [string, string, string] {
  const lead = piece.match(/^\s*/)?.[0] ?? "";
  const rest = piece.slice(lead.length);
  const tail = rest.match(/\s*$/)?.[0] ?? "";
  return [lead, rest.slice(0, rest.length - tail.length), tail];
}

/**
 * The strings the translation cache is asked for when `text` is shown:
 * the text itself, or for long text each sentence's core.
 */
export function cacheKeysFor(text: string): string[] {
  if (!isTranslatable(text)) return [];
  const pieces = text.length > LONG_TEXT_CHARS ? splitLongText(text) : [text];
  if (pieces.length === 1) return [text];
  return pieces.flatMap(p => cacheKeysFor(splitSpacing(p)[1]));
}

/** File name of a route's language pack: "/" -> "index", "/vs/a" -> "vs__a". */
export function routeKey(pathname: string): string {
  const path = (pathname.split(/[?#]/)[0] || "/").replace(/\/+$/, "");
  if (!path) return "index";
  return path.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]+/g, "__").toLowerCase();
}
