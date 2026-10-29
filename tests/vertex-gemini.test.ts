import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

const env = new Map<string, string>();
(globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => env.get(k) } };
const { toGeminiRequest, toOpenAiCompletion, toOpenAiStream, toFinishReason, toVertexModel } = await import('../supabase/functions/_shared/vertexGemini.ts');
const { aiFetch, aiConfigured, resetAiFallbackState } = await import('../supabase/functions/_shared/aiFetch.ts');

const realFetch = globalThis.fetch;
let calls: { url: string; body: Record<string, unknown> }[] = [];
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const route = (handler: (url: string) => Response) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return handler(url);
  }) as typeof fetch;
};
const answer = (text: string, finishReason = 'STOP') => ({ candidates: [{ content: { parts: [{ text: 'thinking...', thought: true }, { text }] }, finishReason }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 } });
const ask = (extra: Record<string, unknown> = {}) => aiFetch({ method: 'POST', body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: 'Be brief.' }, { role: 'user', content: 'Hi' }], ...extra }) });
const isVertex = (url: string) => url.startsWith('https://aiplatform.googleapis.com/');

beforeEach(() => { env.clear(); calls = []; resetAiFallbackState(); });
afterEach(() => { globalThis.fetch = realFetch; });

describe('request translation', () => {
  test('system, user and assistant turns, settings and an inline invoice image', () => {
    const req = toGeminiRequest({
      messages: [
        { role: 'system', content: 'Read invoices.' },
        { role: 'user', content: [{ type: 'text', text: 'Extract' }, { type: 'image_url', image_url: { url: 'data:application/pdf;base64,QUJD' } }] },
        { role: 'assistant', content: 'OK' },
      ],
      max_tokens: 900, temperature: 0, response_format: { type: 'json_object' }, reasoning_effort: 'low',
    })!;
    expect(req.systemInstruction).toEqual({ parts: [{ text: 'Read invoices.' }] });
    expect(req.contents).toEqual([
      { role: 'user', parts: [{ text: 'Extract' }, { inlineData: { mimeType: 'application/pdf', data: 'QUJD' } }] },
      { role: 'model', parts: [{ text: 'OK' }] },
    ]);
    expect(req.generationConfig).toEqual({ maxOutputTokens: 900, temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } });
  });

  test('requests it cannot translate are left to the next provider', () => {
    expect(toGeminiRequest({ messages: [{ role: 'user', content: 'x' }], tools: [{}] })).toBeNull();
    expect(toGeminiRequest({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://x/y.png' } }] }] })).toBeNull();
    expect(toGeminiRequest({ messages: [{ role: 'system', content: 'only system' }] })).toBeNull();
  });

  test('answers come back in the shape every caller reads, without thinking text', () => {
    const out = toOpenAiCompletion(answer('Hello'), 'gemini-3.8-flash');
    expect(out.choices[0].message.content).toBe('Hello');
    expect(out.choices[0].finish_reason).toBe('stop');
    expect(out.usage).toEqual({ prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 });
    expect(toFinishReason('MAX_TOKENS')).toBe('length');
  });

  test('streamed answers become OpenAI chunks ending in [DONE]', async () => {
    const enc = new TextEncoder();
    const src = new ReadableStream<Uint8Array>({ start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify(answer('Hel', ''))}\n\nda`));
      c.enqueue(enc.encode(`ta: ${JSON.stringify(answer('lo'))}\n\n`));
      c.close();
    } });
    const text = await new Response(toOpenAiStream(src, 'm')).text();
    const deltas = text.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]')).map((l) => JSON.parse(l.slice(6)).choices[0]);
    expect(deltas.map((d) => d.delta.content ?? '').join('')).toBe('Hello');
    expect(deltas.at(-1).finish_reason).toBe('stop');
    expect(text.trimEnd().endsWith('data: [DONE]')).toBe(true);
  });

  test('model tiers and overrides', () => {
    expect(toVertexModel('google/gemini-2.5-flash-lite')).toBe('gemini-3.1-flash-lite');
    expect(toVertexModel('google/gemini-2.5-pro')).toBe('gemini-3.1-pro-preview');
    env.set('VERTEX_MODEL_FLASH', 'gemini-x');
    expect(toVertexModel('google/gemini-2.5-flash')).toBe('gemini-x');
  });
});

describe('aiFetch with the Google Cloud key first', () => {
  test('the grant answers: Gemini keys and Lovable are never called', async () => {
    env.set('VERTEX_API_KEY', 'vk'); env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route(() => reply(200, answer('Hi there')));
    expect(aiConfigured()).toBe(true);
    const res = await ask();
    expect(res.status).toBe(200);
    expect((await res.json()).choices[0].message.content).toBe('Hi there');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.8-flash:generateContent?key=vk');
  });

  test('streaming uses the streaming route', async () => {
    env.set('VERTEX_API_KEY', 'vk');
    route(() => new Response(`data: ${JSON.stringify(answer('Hi'))}\n\n`, { status: 200 }));
    const res = await ask({ stream: true });
    expect(calls[0].url).toContain(':streamGenerateContent?alt=sse&key=vk');
    expect(await res.text()).toContain('"content":"Hi"');
  });

  test('a thinking-setting refusal is retried once without it', async () => {
    env.set('VERTEX_API_KEY', 'vk'); env.set('GEMINI_API_KEY', 'g');
    let n = 0;
    route((url) => (isVertex(url) && n++ === 0 ? reply(400, { error: 'thinking' }) : reply(200, answer('ok'))));
    expect((await ask({ reasoning_effort: 'low' })).status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(isVertex(calls[1].url)).toBe(true);
    expect((calls[1].body.generationConfig as Record<string, unknown>).thinkingConfig).toBeUndefined();
  });

  for (const status of [403, 404, 429, 500]) {
    test(`grant refused (${status}): Gemini key answers, and the grant is skipped for a while`, async () => {
      env.set('VERTEX_API_KEY', 'vk'); env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
      route((url) => (isVertex(url) ? reply(status, { error: 'x' }) : reply(200, { choices: [] })));
      expect((await ask()).status).toBe(200);
      expect(calls.at(-1)!.url).toContain('generativelanguage.googleapis.com');
      calls = [];
      await ask();
      expect(calls.some((c) => isVertex(c.url))).toBe(false);
    });
  }

  test('grant only, and it refuses: the caller sees the status', async () => {
    env.set('VERTEX_API_KEY', 'vk');
    route(() => reply(429, { error: 'x' }));
    expect((await ask()).status).toBe(429);
  });

  test('no grant key: behaviour is exactly as before (Gemini first)', async () => {
    env.set('GEMINI_API_KEY', 'g');
    route(() => reply(200, { choices: [] }));
    await ask();
    expect(calls.map((c) => c.url)).toEqual([expect.stringContaining('generativelanguage.googleapis.com')]);
  });
});
