// Shared chat-completion client for every AI edge function.
// Provider order (owner, October 2026): Agent Platform on Google Cloud
// (VERTEX_API_KEY, billed to the Cloud account and its credits) →
// GEMINI_API_KEY (primary) → Gemini_API_Key (secondary) → the Lovable AI
// Gateway (LOVABLE_API_KEY). Each provider is tried in turn; the next is used
// only when the previous is missing, unreachable, slow to answer or returns
// an error. Any one provider alone is enough to run.
// Callers keep the same OpenAI-compatible request and response shape, and the
// Authorization header they pass is ignored: keys are only read here.
import { vertexApiKey, vertexChat } from './vertexGemini.ts';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
// Time allowed for Gemini to start answering before we switch to the next
// provider. Only the wait for response headers is bounded, so long streams
// still run.
const GEMINI_HEADER_TIMEOUT_MS = 45_000;

// Google retired gemini-2.5-* for new direct API keys; map to "latest" aliases.
export function toGeminiModel(model: unknown): string {
  const m = String(model ?? '').replace(/^google\//, '');
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('pro')) return 'gemini-pro-latest';
  return 'gemini-flash-latest';
}

// The gateway gets a current (non-deprecated) model in the same tier as asked.
// The 2.5 family is deprecated on the gateway and raises warnings.
export function toGatewayModel(model: unknown): string {
  const m = String(model ?? '');
  if (m.includes('lite')) return 'google/gemini-3.1-flash-lite';
  if (m.includes('pro')) return 'google/gemini-3.1-pro-preview';
  return 'google/gemini-3.8-flash';
}

/**
 * The Gemini keys from the edge-function secrets, in failover order
 * (owner, October 2026): GEMINI_API_KEY is primary, Gemini_API_Key the
 * secondary tried when the primary is missing, refused or unreachable.
 * Read here only; never logged, returned or sent to a browser.
 */
export function geminiKeys(): string[] {
  const primary = Deno.env.get('GEMINI_API_KEY')?.trim();
  const secondary = Deno.env.get('Gemini_API_Key')?.trim();
  return [primary, secondary].filter((k): k is string => Boolean(k));
}

/** The primary Gemini key (GEMINI_API_KEY), or the secondary when unset. */
export function geminiKey(): string | undefined {
  return geminiKeys()[0];
}

/** True when at least one AI provider key is set. */
export function aiConfigured(): boolean {
  return Boolean(vertexApiKey() || geminiKey() || Deno.env.get('LOVABLE_API_KEY'));
}

/** Safe user-facing message for a failed AI response status. */
export function aiErrorMessage(status: number): string {
  if (status === 429) return 'AI is handling a lot of requests right now. Please wait a minute and try again.';
  if (status === 402) return 'AI is temporarily unavailable while capacity is topped up. Please try again later.';
  return 'AI is temporarily unavailable. Please try again shortly.';
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

// Gemini's answer, or null when it never answered (unreachable or too slow).
async function tryGemini(key: string, body: Record<string, unknown>): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEMINI_HEADER_TIMEOUT_MS);
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model: toGeminiModel(body.model) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    console.info('Gemini unreachable or slow', (e as Error)?.name ?? 'error');
    return null;
  }
}

// Moving down the cascade is the designed path, not a fault: it is logged at
// info level. While a Gemini key is rate-limited or out of quota (429/402),
// refused (403) or unreachable, it is skipped for a short cooldown in this
// instance instead of being retried (and logged) on every request. Cooldowns
// are tracked per key position so the secondary key can still serve while
// the primary cools down.
const GEMINI_COOLDOWN_MS = 5 * 60_000;
const geminiSkipUntil = new Map<number, number>();
let vertexSkipUntil = 0;
/** Test hook: forget any cooldown. */
export function resetAiFallbackState(): void { geminiSkipUntil.clear(); vertexSkipUntil = 0; }

// Agent Platform first. A refusal that will repeat (key refused, unknown
// model, quota, outage) or no answer puts it on the same cooldown as a Gemini
// key, so later requests go straight to the next provider.
async function tryVertex(key: string, body: Record<string, unknown>, hasNext: boolean): Promise<Response | null> {
  if (hasNext && Date.now() < vertexSkipUntil) return null;
  const res = await vertexChat(key, body, GEMINI_HEADER_TIMEOUT_MS);
  const s = res?.status ?? 0;
  if (!res?.ok) {
    if (hasNext && (s === 0 || s === 401 || s === 403 || s === 404 || s === 402 || s === 429 || s >= 500)) vertexSkipUntil = Date.now() + GEMINI_COOLDOWN_MS;
    if (hasNext) console.info('AI fallback: trying next provider', 'after Agent Platform', s || 'no response');
  }
  return res;
}

// Try each Gemini key in order; returns the first usable response, or null
// when every key is cooling down, unreachable or refused.
async function tryGeminiCascade(keys: string[], body: Record<string, unknown>, hasGateway: boolean): Promise<Response | null> {
  let last: Response | null = null;
  for (let i = 0; i < keys.length; i++) {
    if (hasGateway && Date.now() < (geminiSkipUntil.get(i) ?? 0)) continue;
    const res = await tryGemini(keys[i], body);
    if (res?.ok) { geminiSkipUntil.delete(i); await last?.body?.cancel(); return res; }
    // Keep the latest refusal unread: with no gateway it is returned as is,
    // so the caller still sees why Gemini refused (429 busy, 402 no credit).
    if (res) { await last?.body?.cancel(); last = res; }
    const status = res?.status ?? 0;
    if (hasGateway && (!res || status === 429 || status === 402 || status >= 500)) {
      geminiSkipUntil.set(i, Date.now() + GEMINI_COOLDOWN_MS);
    }
    console.info('AI fallback: trying next provider', i === 0 ? 'Gemini secondary' : 'Lovable AI', status || 'no response');
  }
  return last;
}

export async function aiFetch(init: RequestInit): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = JSON.parse(String(init.body ?? '{}')); } catch { return json(400, 'Invalid AI request'); }
  const keys = geminiKeys();
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  const vertex = vertexApiKey();
  if (!vertex && !keys.length && !lovable) return json(503, 'AI is not configured');

  if (vertex) {
    const hasNext = keys.length > 0 || Boolean(lovable);
    const res = await tryVertex(vertex, body, hasNext);
    if (res?.ok) return res;
    if (!hasNext) return res ?? json(503, aiErrorMessage(0));
    await res?.body?.cancel();
  }

  if (keys.length) {
    const res = await tryGeminiCascade(keys, body, Boolean(lovable));
    if (res?.ok) return res;
    // Without a gateway key, the caller still learns why Gemini refused
    // (429 busy, 402 no credit) instead of a generic failure.
    if (!lovable) return res ?? json(503, aiErrorMessage(0));
    await res?.body?.cancel();
  }
  // Gemini-only options (reasoning effort) are not sent to the gateway.
  const { reasoning_effort: _effort, ...gatewayBody } = body;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovable}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...gatewayBody, model: toGatewayModel(body.model) }),
    });
    if (!res.ok) console.error('Lovable AI error', res.status);
    return res;
  } catch (e) {
    console.error('Lovable AI unreachable', (e as Error)?.name ?? 'error');
    return json(503, aiErrorMessage(0));
  }
}
