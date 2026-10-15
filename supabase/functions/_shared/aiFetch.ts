// Shared chat-completion client for every AI edge function.
// Provider order: Google Gemini (GEMINI_API_KEY) first, then the Lovable AI
// Gateway (LOVABLE_API_KEY) whenever Gemini is missing, unreachable, slow to
// answer or returns an error. Either key alone is enough to run.
// Callers keep the same OpenAI-compatible request and response shape, and the
// Authorization header they pass is ignored: keys are only read here.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
// Time allowed for Gemini to start answering before we switch to the gateway.
// Only the wait for response headers is bounded, so long streams still run.
const GEMINI_HEADER_TIMEOUT_MS = 45_000;

// Google retired gemini-2.5-* for new direct API keys; map to "latest" aliases.
export function toGeminiModel(model: unknown): string {
  const m = String(model ?? '').replace(/^google\//, '');
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('pro')) return 'gemini-pro-latest';
  return 'gemini-flash-latest';
}

// The gateway gets a model it is known to serve, in the same tier as asked.
export function toGatewayModel(model: unknown): string {
  const m = String(model ?? '');
  if (m.includes('lite')) return 'google/gemini-2.5-flash-lite';
  if (m.includes('pro')) return 'google/gemini-2.5-pro';
  return 'google/gemini-2.5-flash';
}

/** True when at least one AI provider key is set. */
export function aiConfigured(): boolean {
  return Boolean(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('LOVABLE_API_KEY'));
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
    console.warn('Gemini unreachable or slow', (e as Error)?.name ?? 'error');
    return null;
  }
}

export async function aiFetch(init: RequestInit): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = JSON.parse(String(init.body ?? '{}')); } catch { return json(400, 'Invalid AI request'); }
  const gemini = Deno.env.get('GEMINI_API_KEY');
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (!gemini && !lovable) return json(503, 'AI is not configured');

  if (gemini) {
    const res = await tryGemini(gemini, body);
    if (res?.ok) return res;
    // Without a gateway key, the caller still learns why Gemini refused
    // (429 busy, 402 no credit) instead of a generic failure.
    if (!lovable) return res ?? json(503, aiErrorMessage(0));
    if (res) { console.warn('Gemini error, switching to Lovable AI', res.status); await res.body?.cancel(); }
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
