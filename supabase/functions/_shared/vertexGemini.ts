// Agent Platform (formerly Vertex AI) on Google Cloud, called with an API key
// bound to a service account (owner, October 2026: the organisation blocks
// service-account key files, so this key is the way in). Billed to the Cloud
// account and its credits. API keys work on Google's own generateContent
// route, not on the OpenAI-compatible one, so this file translates the
// OpenAI-shaped requests every AI function sends into that format and the
// answers back, including streamed answers. Pure apart from fetch.

const VERTEX_BASE = 'https://aiplatform.googleapis.com/v1/publishers/google/models';

/** The bound API key from the edge-function secrets. Read here only; never logged or returned. */
export function vertexApiKey(): string | undefined {
  return Deno.env.get('VERTEX_API_KEY')?.trim() || undefined;
}

// Model in the same tier as asked. VERTEX_MODEL_LITE / _PRO / _FLASH override
// the defaults without a code change if Google renames a model.
export function toVertexModel(model: unknown): string {
  const m = String(model ?? '');
  if (m.includes('lite')) return Deno.env.get('VERTEX_MODEL_LITE')?.trim() || 'gemini-3.1-flash-lite';
  if (m.includes('pro')) return Deno.env.get('VERTEX_MODEL_PRO')?.trim() || 'gemini-3.1-pro-preview';
  return Deno.env.get('VERTEX_MODEL_FLASH')?.trim() || 'gemini-3.8-flash';
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
interface GeminiRequest {
  contents: { role: 'user' | 'model'; parts: Part[] }[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig: Record<string, unknown>;
}

function toParts(content: unknown): Part[] | null {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return null;
  const parts: Part[] = [];
  for (const p of content as Record<string, unknown>[]) {
    if (p?.type === 'text' && typeof p.text === 'string') { parts.push({ text: p.text }); continue; }
    const url = (p?.image_url as { url?: unknown } | undefined)?.url;
    const m = p?.type === 'image_url' && typeof url === 'string' ? /^data:([^;,]+);base64,(.+)$/s.exec(url) : null;
    if (!m) return null; // remote URLs and other part types are not translated
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  return parts;
}

/**
 * The OpenAI-style request as a generateContent request, or null when it uses
 * something not translated here (tools, remote images), so the next provider
 * serves it unchanged.
 */
export function toGeminiRequest(body: Record<string, unknown>, withThinking = true): GeminiRequest | null {
  if (body.tools || body.functions) return null;
  const messages = Array.isArray(body.messages) ? body.messages as { role?: string; content?: unknown }[] : [];
  const system: string[] = [];
  const contents: GeminiRequest['contents'] = [];
  for (const msg of messages) {
    if (msg.role === 'system' || msg.role === 'developer') {
      const parts = toParts(msg.content);
      if (!parts) return null;
      for (const p of parts) if ('text' in p) system.push(p.text);
      continue;
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') return null;
    const parts = toParts(msg.content);
    if (!parts) return null;
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
  }
  if (!contents.length) return null;

  const generationConfig: Record<string, unknown> = {};
  if (typeof body.max_tokens === 'number') generationConfig.maxOutputTokens = body.max_tokens;
  if (typeof body.temperature === 'number') generationConfig.temperature = body.temperature;
  if (typeof body.top_p === 'number') generationConfig.topP = body.top_p;
  if ((body.response_format as { type?: string } | undefined)?.type === 'json_object') generationConfig.responseMimeType = 'application/json';
  const effort = typeof body.reasoning_effort === 'string' ? body.reasoning_effort : '';
  if (withThinking && effort) generationConfig.thinkingConfig = { thinkingLevel: /^(medium|high)$/.test(effort) ? 'high' : 'low' };

  const req: GeminiRequest = { contents, generationConfig };
  if (system.length) req.systemInstruction = { parts: [{ text: system.join('\n\n') }] };
  return req;
}

type Candidate = { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string };
type GeminiResponse = { candidates?: Candidate[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } };

const answerText = (c?: Candidate) => (c?.content?.parts ?? []).filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');

/** Google's finish reason in the OpenAI words callers check ('length' means cut off). */
export function toFinishReason(reason: unknown): string | null {
  if (!reason) return null;
  if (reason === 'MAX_TOKENS') return 'length';
  if (reason === 'STOP' || reason === 'FINISH_REASON_UNSPECIFIED') return 'stop';
  return 'content_filter';
}

/** A generateContent answer in the OpenAI chat-completion shape. */
export function toOpenAiCompletion(data: GeminiResponse, model: string) {
  const c = data.candidates?.[0];
  const u = data.usageMetadata ?? {};
  return {
    object: 'chat.completion',
    model,
    choices: [{ index: 0, message: { role: 'assistant', content: answerText(c) }, finish_reason: toFinishReason(c?.finishReason) ?? 'stop' }],
    usage: { prompt_tokens: u.promptTokenCount ?? 0, completion_tokens: u.candidatesTokenCount ?? 0, total_tokens: u.totalTokenCount ?? 0 },
  };
}

/** Google's streamed answer (SSE of generateContent chunks) as OpenAI chat-completion chunks ending in [DONE]. */
export function toOpenAiStream(body: ReadableStream<Uint8Array>, model: string): ReadableStream<Uint8Array> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buffer = '';
  const chunk = (delta: Record<string, unknown>, finish: string | null) =>
    `data: ${JSON.stringify({ object: 'chat.completion.chunk', model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
  const translate = (line: string) => {
    if (!line.startsWith('data:')) return '';
    let data: GeminiResponse;
    try { data = JSON.parse(line.slice(5).trim()); } catch { return ''; }
    const c = data.candidates?.[0];
    const text = answerText(c);
    const finish = toFinishReason(c?.finishReason);
    return text || finish ? chunk(text ? { content: text } : {}, finish) : '';
  };
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(bytes, controller) {
      buffer += dec.decode(bytes, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      const out = lines.map((l) => translate(l.trim())).join('');
      if (out) controller.enqueue(enc.encode(out));
    },
    flush(controller) {
      const out = translate(buffer.trim());
      controller.enqueue(enc.encode(`${out}data: [DONE]\n\n`));
    },
  }));
}

/**
 * One Agent Platform call. Returns the answer already in the OpenAI shape
 * (JSON or stream), Google's refusal as is, or null when the request is not
 * translatable or Google never answered (the caller moves to the next provider).
 * A refusal caused only by the thinking setting is retried once without it.
 */
export async function vertexChat(key: string, body: Record<string, unknown>, timeoutMs: number): Promise<Response | null> {
  const model = toVertexModel(body.model);
  const stream = body.stream === true;
  const url = `${VERTEX_BASE}/${encodeURIComponent(model)}:${stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=${encodeURIComponent(key)}`;
  const send = async (req: GeminiRequest) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const req = toGeminiRequest(body);
  if (!req) return null;
  let res: Response;
  try {
    res = await send(req);
    if (res.status === 400 && req.generationConfig.thinkingConfig) {
      await res.body?.cancel();
      res = await send(toGeminiRequest(body, false)!);
    }
  } catch (e) {
    console.info('Agent Platform unreachable or slow', (e as Error)?.name ?? 'error');
    return null;
  }
  if (!res.ok) return res;
  const headers = { 'Content-Type': stream ? 'text/event-stream' : 'application/json' };
  if (stream && res.body) return new Response(toOpenAiStream(res.body, model), { status: 200, headers });
  const data = await res.json().catch(() => null) as GeminiResponse | null;
  if (!data) return new Response(JSON.stringify({ error: 'Unreadable AI answer' }), { status: 502, headers });
  return new Response(JSON.stringify(toOpenAiCompletion(data, model)), { status: 200, headers });
}
