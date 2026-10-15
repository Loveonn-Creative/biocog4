// Shared chat-completion client for every AI edge function.
// Default provider: Lovable AI Gateway (LOVABLE_API_KEY, auto-provisioned).
// Optional: if GEMINI_API_KEY is set, Gemini is tried first; any failure
// (bad key, no credit, rate limit, network) falls back to Lovable AI.
// Callers keep the same OpenAI-compatible request and response shape.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Google retired gemini-2.5-* for new direct API keys; map to "latest" aliases.
export function toGeminiModel(model: unknown): string {
  const m = String(model ?? '').replace(/^google\//, '');
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('pro')) return 'gemini-pro-latest';
  return 'gemini-flash-latest';
}

/** Safe user-facing message for a failed AI response status. */
export function aiErrorMessage(status: number): string {
  if (status === 429) return 'AI is handling a lot of requests right now. Please wait a minute and try again.';
  if (status === 402) return 'AI is temporarily unavailable while capacity is topped up. Please try again later.';
  return 'AI is temporarily unavailable. Please try again shortly.';
}

export async function aiFetch(init: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init.body ?? '{}'));
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gemini}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, model: toGeminiModel(body.model) }),
      });
      if (res.ok) return res;
      console.warn('Gemini failed, falling back to Lovable AI', res.status);
      await res.body?.cancel();
    } catch (e) {
      console.warn('Gemini unreachable, falling back to Lovable AI', String(e));
    }
  }
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (!lovable) {
    return new Response(JSON.stringify({ error: 'AI is not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovable}`, 'Content-Type': 'application/json', 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error('Lovable AI error', res.status);
  return res;
}
