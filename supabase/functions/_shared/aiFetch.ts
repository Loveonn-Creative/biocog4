// Shared chat-completion client for every AI edge function.
// Provider: Google Gemini only, via the GEMINI_API_KEY secret.
// The Lovable AI Gateway route is intentionally not used.
// Callers keep the same OpenAI-compatible request and response shape.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

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
  if (!gemini) {
    return new Response(JSON.stringify({ error: 'AI is not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gemini}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model: toGeminiModel(body.model) }),
    });
    if (!res.ok) console.error('Gemini AI error', res.status);
    return res;
  } catch (e) {
    console.error('Gemini unreachable', String(e));
    return new Response(JSON.stringify({ error: aiErrorMessage(0) }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
}
