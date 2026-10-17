// Biocog Intelligence: what stands behind an answer, and the questions it
// will not answer. Pure apart from Web Streams (in Deno, Bun and browsers),
// so the website tests run it too.
//
//  - Evidence: after the streamed answer the server sends one extra SSE event
//    (`event: evidence`) naming the records, calculation, basis, projection and
//    public resources behind it. Records come only from this user's own brief
//    on Pro and Scale; a record ID in the text that is not in the brief is
//    removed from the stream, so a link never points at a record that does not
//    exist.
//  - Probes: obvious attempts to read the instructions, the model or vendor,
//    keys or code get a short canned reply without calling the model and
//    without using a question from the monthly pool.
//  - Resources: keyword retrieval over public content only (the answer
//    library, the article index and the public product facts), generated into
//    ./intelligenceLibrary.generated.ts.

import type { Audience, Access, Projection, RecordBrief, EmissionRow, SavingsInsight } from './intelligence.ts';

// ---------------------------------------------------------------- types

export type EvidenceBasis = 'verified' | 'unverified' | 'sample' | 'general';

export interface EvidenceRecord {
  /** Full emission record ID. */
  id: string;
  /** For example "Electricity bill · 14 Mar 2026". */
  label: string;
  kgCO2e: number;
}

export interface Evidence {
  basis: EvidenceBasis;
  records: EvidenceRecord[];
  calculation: string | null;
  projection: { label: string; method: string } | null;
  resources: Array<{ title: string; url: string }>;
  /** How many record IDs in the answer were not this user's records and were removed. */
  removedIds: number;
}

/** A record the model may cite: one of the hotspot records in this user's brief. */
export interface CitableRecord {
  id: string;
  category: string;
  scope: number;
  kg: number;
  /** Invoice date, else upload date, YYYY-MM-DD. */
  date: string;
  activity: { quantity: number; unit: string } | null;
}

export interface LibraryEntry {
  kind: 'answer' | 'article' | 'fact';
  title: string;
  text: string;
  /** Public page; null for product facts. */
  url: string | null;
}

// ---------------------------------------------------------------- citable records

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** The records named in the brief's hotspots, with what a label needs. */
export function citableRecords(brief: RecordBrief | null | undefined, rows: EmissionRow[]): CitableRecord[] {
  if (!brief || brief.basis === 'none') return [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: CitableRecord[] = [];
  for (const h of brief.hotspots) {
    for (const id of h.recordIds) {
      const r = byId.get(id);
      if (!r) continue;
      const date = (r.invoice_date && /^\d{4}-\d{2}-\d{2}/.test(r.invoice_date) ? r.invoice_date : r.created_at).slice(0, 10);
      const qty = r.activity_data == null ? null : num(r.activity_data);
      out.push({
        id: r.id, category: (r.category || 'other').toLowerCase(), scope: r.scope ?? 3, kg: round(num(r.co2_kg)), date,
        activity: qty && qty > 0 && r.activity_unit ? { quantity: qty, unit: r.activity_unit.trim() } : null,
      });
    }
  }
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const titleCase = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** "Electricity bill · 14 Mar 2026". */
export function recordLabel(r: Pick<CitableRecord, 'category' | 'scope' | 'date'>): string {
  const c = r.category;
  const kind = /electric|grid|power|kwh/.test(c) ? 'Electricity bill'
    : /freight|logistic|transport|shipping|courier/.test(c) ? 'Freight invoice'
      : `${titleCase(c)} invoice`;
  const [y, m, d] = r.date.split('-').map(Number);
  const when = y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : r.date;
  return `${kind} · ${when}`;
}

// ---------------------------------------------------------------- record IDs in the stream

const ID_RE = /\[?\b([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{8})\b(?!-[0-9a-f])\]?/gi;
/** A bare 8-character token is treated as an ID only when it mixes letters and digits (so 12000000 or "deadbeef" stay). */
const looksLikeId = (t: string) => t.length > 8 || (/[0-9]/.test(t) && /[a-f]/i.test(t));

/**
 * Removes record IDs that are not this user's from streamed text, and notes
 * the ones that are. Text that could be the start of an ID is held back until
 * the next delta shows where the token ends.
 */
export class IdScrubber {
  private pending = '';
  private readonly known: Map<string, string>;
  /** Full IDs of this user's records named in the answer, in order. */
  readonly seen: string[] = [];
  removed = 0;

  constructor(citable: Array<Pick<CitableRecord, 'id'>>) {
    this.known = new Map();
    for (const r of citable) {
      this.known.set(r.id.toLowerCase(), r.id);
      this.known.set(r.id.slice(0, 8).toLowerCase(), r.id);
    }
  }

  push(delta: string): string {
    this.pending += delta;
    // Trailing spaces are held too, so a removed ID does not leave a gap before the next word or stop.
    const m = /(\s*)(\[?[0-9a-f-]*)$/i.exec(this.pending)!;
    const token = m[2];
    const tokenStart = m.index + m[1].length;
    let hold = this.pending.length;
    if (!token) hold = m.index;
    else if (token.length <= 40) {
      const before = this.pending[tokenStart - 1];
      if (token.startsWith('[') || !before || !/[0-9a-z]/i.test(before)) hold = m.index;
    }
    const out = this.pending.slice(0, hold);
    this.pending = this.pending.slice(hold);
    return this.scrub(out);
  }

  flush(): string {
    const out = this.scrub(this.pending);
    this.pending = '';
    return out;
  }

  private scrub(text: string): string {
    if (!text) return text;
    let changed = false;
    const out = text.replace(ID_RE, (match, id: string) => {
      const full = this.known.get(id.toLowerCase());
      if (full) {
        if (!this.seen.includes(full)) this.seen.push(full);
        return match;
      }
      const bracketed = match.startsWith('[') && match.endsWith(']');
      if (!bracketed && !looksLikeId(id)) return match;
      this.removed += 1;
      changed = true;
      return '';
    });
    return changed ? out.replace(/\(\s*[,;\s]*\)/g, '').replace(/ {2,}/g, ' ').replace(/ ([.,;:])/g, '$1') : out;
  }
}

/** Every record ID a finished answer names, mapped to this user's records; unknown ones counted. */
export function mapAnswerIds(text: string, citable: Array<Pick<CitableRecord, 'id'>>): { seen: string[]; removed: number; text: string } {
  const s = new IdScrubber(citable);
  const out = s.push(text) + s.flush();
  return { seen: [...s.seen], removed: s.removed, text: out };
}

// ---------------------------------------------------------------- evidence

export interface EvidenceInput {
  text: string;
  audience: Audience;
  access: Access;
  brief: RecordBrief | null;
  citable: CitableRecord[];
  /** Full IDs the answer named (from IdScrubber.seen). */
  seen: string[];
  removed: number;
  projection: Projection | null;
  insights: SavingsInsight[] | null;
  resources: LibraryEntry[];
  sampleCalculation: string;
}

const FIGURE_RE = /\d[\d,.]*\s*(?:t|kg|tonnes?|tons?)\b/i;
const PROJECTION_RE = /project|forecast|next (?:12|twelve|3|three|6|six) months|next (?:quarter|year)|coming months|trend/i;

const fmt = (n: number, dp = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });

function calculationFor(records: CitableRecord[]): string | null {
  if (!records.length) return null;
  if (records.length === 1) {
    const r = records[0];
    if (r.activity && r.activity.quantity > 0) {
      const factor = round(r.kg / r.activity.quantity, 3);
      return `${fmt(r.activity.quantity)} ${r.activity.unit} × ${fmt(factor, 3)} kg/${r.activity.unit} = ${fmt(r.kg)} kg CO2e`;
    }
    return `${fmt(r.kg)} kg CO2e on this record`;
  }
  const total = round(records.reduce((n, r) => n + r.kg, 0));
  return `${records.map((r) => `${fmt(r.kg)} kg`).join(' + ')} = ${fmt(total)} kg CO2e`;
}

/** What one answer rests on. Records only for Pro and Scale and only from this user's brief. */
export function buildEvidence(i: EvidenceInput): Evidence {
  const resources = i.resources.filter((r) => r.url).slice(0, 3).map((r) => ({ title: r.title, url: r.url! }));
  const mentionsSample = /\bsample\b/i.test(i.text);
  const usesFigures = FIGURE_RE.test(i.text);

  if (i.access.ownRecords && i.brief && i.brief.basis !== 'none') {
    const byId = new Map(i.citable.map((r) => [r.id, r]));
    const used = i.seen.map((id) => byId.get(id)).filter((r): r is CitableRecord => !!r);
    const projection = i.access.projection && i.projection && PROJECTION_RE.test(i.text)
      ? { label: 'Projection', method: i.projection.method }
      : null;
    const rests = used.length > 0 || projection !== null || usesFigures;
    return {
      basis: rests ? i.brief.basis : 'general',
      records: used.map((r) => ({ id: r.id, label: recordLabel(r), kgCO2e: r.kg })),
      calculation: used.length ? calculationFor(used) : rests && usesFigures ? i.brief.calculation : null,
      projection,
      resources,
      removedIds: i.removed,
    };
  }

  // Essential: Savings Insights come from their own records (no record-level answers).
  if (i.access.savingsInsights && i.insights?.length) {
    const hit = i.insights.find((s) => i.text.toLowerCase().includes(s.category.replace(/[_-]+/g, ' ').toLowerCase()));
    if (hit && usesFigures) {
      return { basis: hit.label === 'Verified' ? 'verified' : 'unverified', records: [], calculation: null, projection: null, resources, removedIds: i.removed };
    }
  }
  if (mentionsSample) {
    return { basis: 'sample', records: [], calculation: i.sampleCalculation, projection: null, resources, removedIds: i.removed };
  }
  return { basis: 'general', records: [], calculation: null, projection: null, resources, removedIds: i.removed };
}

// ---------------------------------------------------------------- SSE

export const sseDelta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
export const sseEvidence = (evidence: Evidence) => `event: evidence\ndata: ${JSON.stringify({ evidence })}\n\n`;
export const SSE_DONE = 'data: [DONE]\n\n';

/**
 * Reads the model's SSE stream and re-sends it as plain deltas, with unknown
 * record IDs removed, then one evidence event and [DONE]. Cuts the answer off
 * if it starts to repeat the instructions.
 */
export function answerStream(
  upstream: ReadableStream<Uint8Array>,
  opts: { scrubber: IdScrubber; leak: (text: string) => boolean; leakReply: string; finish: (text: string, leaked: boolean) => Evidence },
): ReadableStream<Uint8Array> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const reader = upstream.getReader();
  let raw = '';
  let sent = '';
  let buffer = '';
  let ended = false;
  const end = (controller: ReadableStreamDefaultController<Uint8Array>, leaked: boolean) => {
    ended = true;
    let tail = '';
    if (leaked) tail = sseDelta(opts.leakReply);
    else {
      const rest = opts.scrubber.flush();
      if (rest) { sent += rest; tail = sseDelta(rest); }
    }
    controller.enqueue(enc.encode(tail + sseEvidence(opts.finish(leaked ? opts.leakReply : sent, leaked)) + SSE_DONE));
    controller.close();
  };
  return new ReadableStream({
    async pull(controller) {
      if (ended) return;
      const { done, value } = await reader.read();
      if (done) { end(controller, false); return; }
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      let out = '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { if (out) controller.enqueue(enc.encode(out)); end(controller, false); reader.cancel().catch(() => {}); return; }
        let delta = '';
        try { delta = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? ''; } catch { /* partial or noise */ }
        if (typeof delta !== 'string' || !delta) continue;
        raw += delta;
        if (opts.leak(raw)) { if (out) controller.enqueue(enc.encode(out)); end(controller, true); reader.cancel().catch(() => {}); return; }
        const clean = opts.scrubber.push(delta);
        if (clean) { sent += clean; out += sseDelta(clean); }
      }
      if (out) controller.enqueue(enc.encode(out));
    },
    cancel() { reader.cancel().catch(() => {}); },
  });
}

// ---------------------------------------------------------------- probes

const PROBES: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b.{0,30}\b(previous|prior|above|earlier|all|your|the)\b.{0,20}\b(instructions?|prompts?|guidelines|directions)\b/i,
  /\b(ignore|disregard|forget)\s+(all\s+|any\s+)?(of\s+)?(your|the)\s+rules\b/i,
  /\b(system|developer|hidden|initial|internal|original)\s+(prompt|message|instructions?)\b/i,
  /\b(show|reveal|print|repeat|output|display|share|leak|dump|give)\b.{0,20}\b(your|the)\s+(prompt|instructions|rules|guidelines|configuration|config)\b/i,
  /\bwhat (are|were) your (instructions|rules|guidelines)\b/i,
  /\b(which|what)\s+(llm|ai model|language model|large language model|ai|model|engine)\s+(are you|is this|powers you|runs you|do you (use|run on)|are you (built|running) on|is behind you)\b/i,
  /\bare you\s+(gpt|chatgpt|gemini|claude|llama|mistral|openai|an openai|a gpt)\b/i,
  /\bwho (made|built|trained|created|developed) you\b/i,
  /\b(api|secret|private|access)[ _-]?(key|token)s?\b/i,
  /\bservice[ _-]role\b|\bsupabase key\b|\benv(ironment)? variables?\b/i,
  /\b(your|the platform'?s?|senseible'?s?|biocog'?s?)\s+(source code|codebase|code base|github|repo(sitory)?|architecture|tech stack|backend|database schema)\b/i,
  /\bsource code\b/i,
  /\bjailbreak|\bdeveloper mode\b|\bdo anything now\b|\bDAN mode\b/i,
  /\bpretend (you are|to be|you're)\b.{0,30}\b(unrestricted|unfiltered|no rules|without rules|another ai)\b/i,
  /\b(other|another|different)\s+(customers?|users?|companies|clients?|businesses)'?s?\s+(data|emissions|records|invoices|reports|details)\b/i,
  /\bBIOCOG-INTERNAL\b|\bcanary\b/i,
];

/** An obvious probe for instructions, model, keys, code or other customers' data. */
export function isProbe(text: string): boolean {
  const t = text.normalize('NFKC');
  return PROBES.some((re) => re.test(t));
}

export const PROBE_REPLIES = [
  "Nice try. My recipe stays in the kitchen, but I'm happy to cook up an answer on your emissions, ESG reporting or anything on the platform.",
  "That one's off the menu, I'm afraid. Ask me about Scope 1, 2 or 3, CBAM, your records or how a report is put together, and I'm all yours.",
  "I keep my wiring to myself, the way a good meter keeps its seal. What can I help with on carbon, ESG or your invoices?",
  "A magician never shows the trick. I can show you how your emissions add up, though. What would you like to look at?",
] as const;

/** A short canned reply for a probe, or null for a normal question. `index` picks the reply (deterministic). */
export function probeReply(text: string, index: number): string | null {
  if (!isProbe(text)) return null;
  const i = ((Math.trunc(index) % PROBE_REPLIES.length) + PROBE_REPLIES.length) % PROBE_REPLIES.length;
  return PROBE_REPLIES[i];
}

/** A stable small number from a string, to vary canned replies without randomness. */
export function textIndex(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

// ---------------------------------------------------------------- resources

const STOP = new Set(('a an and are as at be by can could do does for from get got had has have how i if in into is it its me my of on or our should so that the their them then there these this to us was we what when where which who why will with would you your about any some much many more most than also just like need want tell explain please give'
).split(' '));

/** Lower-case keywords, stop words dropped, a plural "s" removed ("bills" matches "bill"). */
export function tokens(text: string): string[] {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w && !STOP.has(w) && (w.length >= 3 || /\d/.test(w)))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

interface Indexed { entry: LibraryEntry; title: Set<string>; text: Set<string> }
const indexCache = new WeakMap<LibraryEntry[], Indexed[]>();

function indexed(library: LibraryEntry[]): Indexed[] {
  let idx = indexCache.get(library);
  if (!idx) {
    idx = library.map((entry) => ({ entry, title: new Set(tokens(entry.title)), text: new Set(tokens(entry.text)) }));
    indexCache.set(library, idx);
  }
  return idx;
}

/**
 * Top public resources for a question by simple keyword overlap: a word in the
 * title counts 3, in the text 1. Needs at least two matching words (or one in
 * a title) so a stray word does not pull in a page.
 */
export function retrieveResources(question: string, library: LibraryEntry[], k = 4): LibraryEntry[] {
  const q = [...new Set(tokens(question))];
  if (!q.length) return [];
  const scored: Array<{ e: LibraryEntry; s: number }> = [];
  for (const it of indexed(library)) {
    let s = 0;
    let hits = 0;
    for (const w of q) {
      if (it.title.has(w)) { s += 3; hits++; } else if (it.text.has(w)) { s += 1; hits++; }
    }
    if (s >= 3 && (hits >= 2 || q.length === 1)) scored.push({ e: it.entry, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title)).slice(0, k).map((x) => x.e);
}
