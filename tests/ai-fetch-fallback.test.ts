import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// aiFetch reads keys from Deno.env; give it a small stand-in.
const env = new Map<string, string>();
(globalThis as any).Deno = { env: { get: (k: string) => env.get(k) } };
const { aiFetch, aiConfigured, toGatewayModel, toGeminiModel } = await import('../supabase/functions/_shared/aiFetch.ts');

const realFetch = globalThis.fetch;
let calls: { url: string; body: any; auth: string | null }[] = [];
const reply = (status: number, body: unknown = { choices: [] }) => new Response(JSON.stringify(body), { status });
const route = (handler: (url: string) => Response | Promise<Response>) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('Authorization') });
    return handler(url);
  }) as typeof fetch;
};
const ask = () => aiFetch({ method: 'POST', headers: { Authorization: 'Bearer client-must-be-ignored' }, body: JSON.stringify({ model: 'google/gemini-2.5-pro', messages: [] }) });

beforeEach(() => { env.clear(); calls = []; });
afterEach(() => { globalThis.fetch = realFetch; });

describe('aiFetch provider order', () => {
  test('no key at all: 503 without calling anyone', async () => {
    route(() => reply(200));
    expect(aiConfigured()).toBe(false);
    expect((await ask()).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  test('Gemini answers: gateway is never called', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route(() => reply(200));
    expect((await ask()).status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([expect.stringContaining('generativelanguage.googleapis.com')]);
    expect(calls[0].body.model).toBe(toGeminiModel('google/gemini-2.5-pro'));
    expect(calls[0].auth).toBe('Bearer g');
  });

  for (const status of [400, 401, 404, 429, 500, 503]) {
    test(`Gemini ${status}: falls back to the Lovable gateway`, async () => {
      env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
      route((url) => (url.includes('googleapis') ? reply(status, { error: 'x' }) : reply(200)));
      expect((await ask()).status).toBe(200);
      expect(calls).toHaveLength(2);
      expect(calls[1].url).toContain('ai.gateway.lovable.dev');
      expect(calls[1].body.model).toBe('google/gemini-2.5-pro');
      expect(calls[1].auth).toBe('Bearer l');
    });
  }

  test('Gemini network failure: falls back', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => { if (url.includes('googleapis')) throw new TypeError('network'); return reply(200); });
    expect((await ask()).status).toBe(200);
    expect(calls[1].url).toContain('ai.gateway.lovable.dev');
  });

  test('only the Lovable key set: gateway directly', async () => {
    env.set('LOVABLE_API_KEY', 'l');
    route(() => reply(200));
    expect(aiConfigured()).toBe(true);
    expect((await ask()).status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('ai.gateway.lovable.dev');
  });

  test('Gemini fails and no Lovable key: clear 503, not a crash', async () => {
    env.set('GEMINI_API_KEY', 'g');
    route(() => reply(500));
    const res = await ask();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/temporarily unavailable/);
  });

  test('both fail: the gateway status reaches the caller', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => (url.includes('googleapis') ? reply(500) : reply(429)));
    expect((await ask()).status).toBe(429);
  });

  test('gateway models stay in the asked tier', () => {
    expect(toGatewayModel('google/gemini-2.5-flash')).toBe('google/gemini-2.5-flash');
    expect(toGatewayModel('google/gemini-3.6-flash')).toBe('google/gemini-2.5-flash');
    expect(toGatewayModel('google/gemini-2.5-pro')).toBe('google/gemini-2.5-pro');
    expect(toGatewayModel('google/gemini-2.5-flash-lite')).toBe('google/gemini-2.5-flash-lite');
  });
});
