// Routes all chat-completion calls to Google's Gemini API using GEMINI_API_KEY.
// No Lovable AI Gateway fallback: if the key is missing, the call fails fast.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const GEMINI_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite']);

export function toGeminiModel(model: unknown): string {
  const m = String(model ?? '').replace(/^google\//, '');
  return GEMINI_MODELS.has(m) ? m : 'gemini-2.5-flash';
}

export async function aiFetch(init: RequestInit): Promise<Response> {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) {
    const body = JSON.parse(String(init.body ?? '{}'));
    body.model = toGeminiModel(body.model);
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gemini}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error('Gemini API error', res.status);
    return res;
  }
  return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
