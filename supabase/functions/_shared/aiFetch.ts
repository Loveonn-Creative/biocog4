// Routes chat-completion calls to Google's Gemini API when GEMINI_API_KEY is set,
// otherwise to the Lovable AI Gateway. Same OpenAI-compatible request/response shape.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
    if (res.ok || !Deno.env.get('LOVABLE_API_KEY')) return res;
    console.error('Gemini API error', res.status, '- falling back to gateway');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${Deno.env.get('LOVABLE_API_KEY') ?? ''}`);
  return fetch(LOVABLE_URL, { ...init, headers });
}
