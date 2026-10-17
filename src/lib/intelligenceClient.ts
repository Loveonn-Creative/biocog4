// Biocog Intelligence on the page: turning server and network outcomes into a
// status the person can act on, and a reply into chat-sized bits. Pure, so it
// is tested directly. Never produces an answer; only says what happened.

import type { Evidence } from '../../supabase/functions/_shared/intelligenceEvidence';
import { limitSentence, monthLabelsIst } from '../../supabase/functions/_shared/intelligence';

export type { Evidence };

export type ChatFailureKind = 'limit' | 'unavailable' | 'rejected' | 'network' | 'timeout' | 'empty' | 'server';

export interface ChatFailure {
  kind: ChatFailureKind;
  message: string;
  /** Sending the same question again can work. */
  retry: boolean;
  action?: { label: string; to: string };
}

export type Audience = 'guest' | 'snapshot' | 'essential' | 'pro' | 'scale';

/** What a failed response means. 402/429/503 from the AI provider are Senseible's capacity, never the person's plan. */
export function chatFailure(status: number, body: unknown, audience: Audience | null, now = new Date()): ChatFailure {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = typeof b.message === 'string' ? b.message : typeof b.error === 'string' ? b.error : '';
  if (status === 429 && (b.error === 'monthly_limit' || b.error === 'daily_limit')) {
    const limit = typeof b.limit === 'number' ? b.limit : null;
    const used = typeof b.used === 'number' ? b.used : limit;
    return {
      kind: 'limit',
      message: limit ? limitSentence(used ?? limit, limit, now) : `You've used this month's questions. Resets ${monthLabelsIst(now).resets}.`,
      retry: false,
      action: audience === 'guest' || audience === null
        ? { label: 'Sign in', to: '/auth?next=/intelligence' }
        : { label: 'See plans', to: '/pricing' },
    };
  }
  if (status === 402 || status === 429 || status === 502 || status === 503) {
    return { kind: 'unavailable', message: "Biocog Intelligence can't answer right now. This is on our side, not your account. Try again in a few minutes.", retry: true };
  }
  if (status === 400 || status === 403) {
    return { kind: 'rejected', message: text && text.length < 160 ? text : 'That question could not be sent. Try rephrasing it.', retry: false };
  }
  return { kind: 'server', message: 'Something went wrong on our side. Try again.', retry: true };
}

export const NETWORK_FAILURE: ChatFailure = { kind: 'network', message: 'No connection. Check your internet and try again.', retry: true };
export const TIMEOUT_FAILURE: ChatFailure = { kind: 'timeout', message: 'That took too long to answer. Try again.', retry: true };
export const EMPTY_FAILURE: ChatFailure = { kind: 'empty', message: 'No answer came back. Try again.', retry: true };

/** How long to wait for the first byte of an answer. */
export const CHAT_TIMEOUT_MS = 45000;

/** A reply as the short messages the model was asked to send (blank-line separated). */
export function chatBits(text: string): string[] {
  const bits = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return bits.length ? bits : text.trim() ? [text.trim()] : [];
}

/**
 * Reads complete SSE lines from a buffer. Returns the text deltas found, the
 * evidence event if it arrived, the unread remainder, and whether the stream
 * said it is done.
 */
export function readSse(buffer: string): { deltas: string[]; rest: string; done: boolean; evidence?: Evidence } {
  const deltas: string[] = [];
  let evidence: Evidence | undefined;
  let done = false;
  let rest = buffer;
  let nl: number;
  while ((nl = rest.indexOf('\n')) !== -1) {
    let line = rest.slice(0, nl);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line.startsWith('data: ')) { rest = rest.slice(nl + 1); continue; }
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') { done = true; rest = rest.slice(nl + 1); continue; }
    rest = rest.slice(nl + 1);
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object' && parsed.evidence) { evidence = parseEvidence(parsed.evidence) ?? evidence; continue; }
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) deltas.push(delta);
    } catch {
      // A complete line that is not JSON (keep-alive or noise): skip it.
    }
  }
  return evidence ? { deltas, rest, done, evidence } : { deltas, rest, done };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASES = new Set(['verified', 'unverified', 'sample', 'general']);

/** The evidence event, checked field by field; anything malformed is dropped. */
export function parseEvidence(v: unknown): Evidence | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const e = v as Record<string, unknown>;
  if (typeof e.basis !== 'string' || !BASES.has(e.basis)) return undefined;
  const records = (Array.isArray(e.records) ? e.records : [])
    .filter((r): r is { id: string; label: string; kgCO2e: number } => !!r && typeof r.id === 'string' && UUID_RE.test(r.id) && typeof r.label === 'string' && typeof r.kgCO2e === 'number')
    .slice(0, 12)
    .map((r) => ({ id: r.id, label: r.label.slice(0, 80), kgCO2e: r.kgCO2e }));
  const p = e.projection as Record<string, unknown> | null | undefined;
  const resources = (Array.isArray(e.resources) ? e.resources : [])
    .filter((r): r is { title: string; url: string } => !!r && typeof r.title === 'string' && typeof r.url === 'string' && /^https:\/\/senseible\.earth\//.test(r.url))
    .slice(0, 3)
    .map((r) => ({ title: r.title.slice(0, 160), url: r.url }));
  return {
    basis: e.basis as Evidence['basis'],
    records,
    calculation: typeof e.calculation === 'string' ? e.calculation.slice(0, 400) : null,
    projection: p && typeof p.label === 'string' && typeof p.method === 'string' ? { label: p.label, method: p.method } : null,
    resources,
    removedIds: typeof e.removedIds === 'number' ? e.removedIds : 0,
  };
}

/** History, focused on the invoice one record came from. */
export const historyLink = (id: string) => `/history?record=${encodeURIComponent(id)}`;

/** The answer as shown: bracketed record IDs become the evidence list, so they are hidden from the prose. */
export function displayAnswer(text: string): string {
  return text.replace(/\s?\[[0-9a-f]{8}(?:-[0-9a-f]{4}){0,3}(?:-[0-9a-f]{12})?\]/gi, '').replace(/ +([.,;:])/g, '$1');
}

// ---------------------------------------------------------------- plan line and suggestions

const PLAN_NAMES: Record<Audience, string> = { guest: 'Guest', snapshot: 'Snapshot', essential: 'Essential', pro: 'Pro', scale: 'Scale' };
export const planName = (a: Audience) => PLAN_NAMES[a];

/** "Pro · 1,820 of 2,000 questions left in October". */
export function planLine(audience: Audience, used: number, limit: number, now = new Date()): string {
  const left = Math.max(0, limit - used);
  return `${PLAN_NAMES[audience]} · ${left.toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} questions left in ${monthLabelsIst(now).month}`;
}

export interface Suggestion { label: string; prompt: string }

/** What the suggestion chips need from the brief. */
export interface SuggestionInput {
  audience: Audience;
  brief?: null | { basis: 'verified' | 'unverified' | 'none'; hotspots: Array<{ category: string; scope: number }> };
  insights?: null | Array<{ category?: string; unitCostInr?: { value: number; unit: string } | null }>;
  projection?: null | object;
}

const nice = (c: string) => c.replace(/[_-]+/g, ' ').trim();
const UNIT_NAMES: Record<string, string> = { kwh: 'kWh', kvah: 'kVAh', mwh: 'MWh', l: 'L', litre: 'litre', kg: 'kg', scm: 'scm' };
const unitName = (u: string) => UNIT_NAMES[u.toLowerCase()] ?? u;

/** Suggestion chips by plan and by what this person's data can answer. */
export function suggestionsFor(i: SuggestionInput): Suggestion[] {
  const general: Suggestion[] = [
    { label: 'What is Scope 3?', prompt: 'What is Scope 3, in simple words?' },
    { label: 'CBAM in 2026', prompt: 'What changes for exporters under CBAM in 2026?' },
    { label: 'Read a kVAh bill', prompt: 'How do I read a kVAh electricity bill for emissions?' },
  ];
  if (i.audience === 'pro' || i.audience === 'scale') {
    const b = i.brief;
    if (!b || b.basis === 'none') {
      return [{ label: 'Add my first invoice', prompt: 'How do I add my first invoice?' }, ...general.slice(0, 2)];
    }
    const out: Suggestion[] = [];
    const top = b.hotspots[0];
    if (top) out.push({ label: 'Biggest hotspot this quarter', prompt: `What is driving my ${nice(top.category)} emissions this quarter, and which records make it up?` });
    const unit = i.insights?.find((x) => x.unitCostInr);
    if (unit?.unitCostInr) out.push({ label: `Unit cost per ${unitName(unit.unitCostInr.unit)}`, prompt: `How has my cost per ${unitName(unit.unitCostInr.unit)} changed, and what does it mean for emissions?` });
    if (i.projection) out.push({ label: 'Next 3 months', prompt: 'Project my emissions for the next 3 months from my records.' });
    if (b.basis === 'unverified') out.push({ label: 'Verify my records', prompt: 'Which of my records still need verification, and how do I verify them?' });
    if (b.hotspots[1]) out.push({ label: `${nice(b.hotspots[1].category)[0].toUpperCase()}${nice(b.hotspots[1].category).slice(1)} breakdown`, prompt: `Break down my ${nice(b.hotspots[1].category)} emissions by record.` });
    return out.slice(0, 4);
  }
  if (i.audience === 'essential' && i.insights?.length) {
    const c = i.insights[0].category;
    return [
      { label: 'Where to start saving', prompt: 'Based on my Savings Insights, where should I start?' },
      ...(c ? [{ label: `About ${nice(c)}`, prompt: `Explain my ${nice(c)} Savings Insight in simple words.` }] : []),
      general[1],
    ];
  }
  return general;
}

