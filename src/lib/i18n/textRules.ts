// Pure text rules shared by the runtime translator (autoTranslate.ts), the DOM
// collector (collect.ts) and the static-pack builder (scripts/i18n/build-packs.mjs).
// No DOM, network or React here, so the build script can bundle it as is and the
// strings it collects match the cache keys the browser looks up exactly.

/** Text longer than this (trimmed) is translated sentence by sentence. */
export const LONG_TEXT_CHARS = 500;

/** Whether a piece of text is worth sending to translation at all. */
export function isTranslatableText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Pure numeric/symbolic tokens
  if (/^[\d\s.,%:/+\-]+$/.test(trimmed)) return false;
  // No letters at all (emoji, punctuation, code-ish)
  if (!/\p{L}/u.test(trimmed)) return false;
  // Pure identifiers / code tokens (GSTIN, HSN, SHA hashes, ISO codes)
  if (/^[A-Z0-9_\-]{4,}$/.test(trimmed)) return false;
  // Emails and URLs
  if (/^\S+@\S+\.\S+$/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

/**
 * A long text cut into pieces so that
 *   lead + parts[0] + seps[0] + parts[1] + ... + parts[n-1] + tail === text
 * Each part is a sentence (or a clause when one sentence is itself too long);
 * seps keep the original spacing between them.
 */
export interface Segments {
  lead: string;
  tail: string;
  parts: string[];
  seps: string[];
}

// Words that end in a full stop without ending the sentence.
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "vs", "rs", "no", "nos", "dr", "mr", "mrs", "ms", "st", "inc", "ltd",
  "pvt", "approx", "fig", "cf", "al", "u.s", "u.k", "co", "jr", "sr", "sec", "art", "para",
]);

function endsWithAbbreviation(before: string): boolean {
  const word = (before.match(/(\S+)$/)?.[1] ?? "").replace(/^[("'“‘[]+/, "").replace(/\.+$/, "");
  if (!word) return false;
  if (ABBREVIATIONS.has(word.toLowerCase())) return true;
  // A single capital initial: "A. Kumar"
  return /^\p{Lu}$/u.test(word);
}

/** Split at sentence ends: punctuation, optional closing quote/bracket, then whitespace. */
function splitSentences(text: string): { parts: string[]; seps: string[] } {
  const parts: string[] = [];
  const seps: string[] = [];
  const re = /([.!?…।]+["'”’)\]]*)(\s+)/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const punctEnd = m.index + m[1].length;
    const next = text.slice(m.index + m[0].length);
    if (!next) break;
    // A lower-case word after the stop usually means the sentence goes on.
    if (/^\p{Ll}/u.test(next)) continue;
    if (m[1].startsWith(".") && m[1].length === 1 && endsWithAbbreviation(text.slice(start, m.index))) continue;
    parts.push(text.slice(start, punctEnd));
    seps.push(m[2]);
    start = m.index + m[0].length;
  }
  parts.push(text.slice(start));
  return { parts, seps };
}

/** Cut one over-long sentence at clause marks, then at spaces, packing pieces up to the limit. */
function splitClauses(text: string, limit: number): { parts: string[]; seps: string[] } {
  const tokens: { piece: string; sep: string }[] = [];
  const re = /([;:,—–])(\s+)/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    tokens.push({ piece: text.slice(start, m.index + m[1].length), sep: m[2] });
    start = m.index + m[0].length;
  }
  tokens.push({ piece: text.slice(start), sep: "" });

  // Any token still over the limit is cut at whitespace.
  const fine: { piece: string; sep: string }[] = [];
  for (const t of tokens) {
    if (t.piece.length <= limit) { fine.push(t); continue; }
    const words = t.piece.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 2) {
      fine.push({ piece: words[i], sep: words[i + 1] ?? t.sep });
    }
  }

  const parts: string[] = [];
  const seps: string[] = [];
  let cur = "";
  let curSep = "";
  let started = false;
  for (const t of fine) {
    if (!started) {
      cur = t.piece;
      started = true;
    } else if (cur.length + curSep.length + t.piece.length > limit) {
      parts.push(cur);
      seps.push(curSep);
      cur = t.piece;
    } else {
      cur = cur + curSep + t.piece;
    }
    curSep = t.sep;
  }
  parts.push(cur);
  return { parts, seps };
}

/** Split text into sentence segments. Short text comes back as one part. */
export function splitSegments(text: string, limit = LONG_TEXT_CHARS): Segments {
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const body = text.slice(lead.length);
  const tail = body.match(/\s*$/)?.[0] ?? "";
  const core = body.slice(0, body.length - tail.length);
  if (core.length <= limit) return { lead, tail, parts: [core], seps: [] };

  const sentences = splitSentences(core);
  const parts: string[] = [];
  const seps: string[] = [];
  sentences.parts.forEach((s, i) => {
    if (s.length > limit) {
      const c = splitClauses(s, limit);
      c.parts.forEach((p, j) => {
        parts.push(p);
        if (j < c.seps.length) seps.push(c.seps[j]);
      });
    } else {
      parts.push(s);
    }
    if (i < sentences.seps.length) seps.push(sentences.seps[i]);
  });
  return { lead, tail, parts, seps };
}

/** Rebuild text from (possibly translated) parts, keeping the original spacing. */
export function joinSegments(seg: Segments, parts: string[] = seg.parts): string {
  let out = seg.lead;
  parts.forEach((p, i) => {
    out += p;
    if (i < seg.seps.length) out += seg.seps[i];
  });
  return out + seg.tail;
}

/**
 * The exact cache keys translateSync(locale, text) looks up for this text:
 * the text itself when short, its translatable sentences when long, none
 * when it is not translatable.
 */
export function translationKeys(text: string): string[] {
  if (!isTranslatableText(text)) return [];
  if (text.trim().length <= LONG_TEXT_CHARS) return [text];
  return splitSegments(text).parts.filter(isTranslatableText);
}
