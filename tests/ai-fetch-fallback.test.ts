import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// aiFetch reads keys from Deno.env; give it a small stand-in.
const env = new Map<string, string>();
(globalThis as any).Deno = { env: { get: (k: string) => env.get(k) } };
const { aiFetch, aiConfigured, toGatewayModel, toGeminiModel, toVertexModel, vertexUrl, resetAiFallbackState } = await import('../supabase/functions/_shared/aiFetch.ts');

const realFetch = globalThis.fetch;
let calls: { url: string; body: any; auth: string | null }[] = [];
const reply = (status: number, body: unknown = { choices: [] }) => new Response(JSON.stringify(body), { status });
const route = (handler: (url: string) => Response | Promise<Response>) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const raw = String(init.body ?? '');
    calls.push({ url, body: raw.startsWith('{') ? JSON.parse(raw) : raw, auth: new Headers(init.headers).get('Authorization') });
    return handler(url);
  }) as typeof fetch;
};
const ask = () => aiFetch({ method: 'POST', headers: { Authorization: 'Bearer client-must-be-ignored' }, body: JSON.stringify({ model: 'google/gemini-2.5-pro', messages: [] }) });

beforeEach(() => { env.clear(); calls = []; resetAiFallbackState(); });
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
      expect(calls[1].body.model).toBe('google/gemini-3.1-pro-preview');
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

  for (const status of [429, 402, 500]) {
    test(`Gemini ${status} and no Lovable key: the caller sees Gemini's status`, async () => {
      env.set('GEMINI_API_KEY', 'g');
      route(() => reply(status, { error: 'x' }));
      expect((await ask()).status).toBe(status);
      expect(calls).toHaveLength(1);
    });
  }

  test('Gemini unreachable and no Lovable key: clear 503, not a crash', async () => {
    env.set('GEMINI_API_KEY', 'g');
    route(() => { throw new TypeError('network'); });
    const res = await ask();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/temporarily unavailable/);
  });

  test('Gemini-only reasoning_effort is not sent to the gateway', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => (url.includes('googleapis') ? reply(400) : reply(200)));
    await aiFetch({ method: 'POST', body: JSON.stringify({ model: 'google/gemini-2.5-flash', reasoning_effort: 'low', response_format: { type: 'json_object' }, messages: [] }) });
    expect(calls[0].body.reasoning_effort).toBe('low');
    expect(calls[1].body.reasoning_effort).toBeUndefined();
    expect(calls[1].body.response_format).toEqual({ type: 'json_object' });
  });

  test('both fail: the gateway status reaches the caller', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => (url.includes('googleapis') ? reply(500) : reply(429)));
    expect((await ask()).status).toBe(429);
  });

  test('gateway models stay in the asked tier and are never deprecated 2.5 ids', () => {
    expect(toGatewayModel('google/gemini-2.5-flash')).toBe('google/gemini-3.8-flash');
    expect(toGatewayModel('google/gemini-3.6-flash')).toBe('google/gemini-3.8-flash');
    expect(toGatewayModel('google/gemini-2.5-pro')).toBe('google/gemini-3.1-pro-preview');
    expect(toGatewayModel('google/gemini-2.5-flash-lite')).toBe('google/gemini-3.1-flash-lite');
    expect(toGatewayModel(undefined)).toBe('google/gemini-3.8-flash');
  });
});

describe('aiFetch Gemini cooldown', () => {
  test('after Gemini 429, the next request goes straight to the gateway', async () => {
    env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => reply(url.includes('generativelanguage') ? 429 : 200));
    expect((await ask()).status).toBe(200);
    calls = [];
    expect((await ask()).status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([expect.stringContaining('ai.gateway.lovable.dev')]);
  });

  test('without a gateway key, Gemini is retried even after a 429', async () => {
    env.set('GEMINI_API_KEY', 'g');
    route(() => reply(429));
    expect((await ask()).status).toBe(429);
    expect((await ask()).status).toBe(429);
    expect(calls).toHaveLength(2);
  });
});

describe('Gemini key order', () => {
  test('GEMINI_API_KEY is primary, Gemini_API_Key the secondary', async () => {
    const { geminiKey, geminiKeys } = await import('../supabase/functions/_shared/aiFetch');
    const env = (globalThis as any).Deno.env;
    const orig = env.get;
    env.get = (k: string) => (k === 'Gemini_API_Key' ? ' new-key ' : undefined);
    expect(geminiKey()).toBe('new-key');
    env.get = (k: string) => (k === 'GEMINI_API_KEY' ? 'primary' : k === 'Gemini_API_Key' ? 'other' : undefined);
    expect(geminiKey()).toBe('primary');
    expect(geminiKeys()).toEqual(['primary', 'other']);
    env.get = (k: string) => (k === 'GEMINI_API_KEY' ? 'primary' : undefined);
    expect(geminiKeys()).toEqual(['primary']);
    env.get = orig;
  });

  test('primary 429: the secondary key answers before the gateway', async () => {
    env.set('GEMINI_API_KEY', 'p'); env.set('Gemini_API_Key', 's'); env.set('LOVABLE_API_KEY', 'l');
    let n = 0;
    route(() => reply(++n === 1 ? 429 : 200));
    expect((await ask()).status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[0].auth).toBe('Bearer p');
    expect(calls[1].auth).toBe('Bearer s');
    expect(calls[1].url).toContain('generativelanguage.googleapis.com');
  });

  test('primary unreachable: the secondary key is used', async () => {
    env.set('GEMINI_API_KEY', 'p'); env.set('Gemini_API_Key', 's');
    let n = 0;
    route(() => { if (++n === 1) throw new TypeError('network'); return reply(200); });
    expect((await ask()).status).toBe(200);
    expect(calls[1].auth).toBe('Bearer s');
  });

  test('both Gemini keys fail: the gateway is the last resort', async () => {
    env.set('GEMINI_API_KEY', 'p'); env.set('Gemini_API_Key', 's'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => reply(url.includes('googleapis') ? 429 : 200));
    expect((await ask()).status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(calls[2].url).toContain('ai.gateway.lovable.dev');
    expect(calls[2].auth).toBe('Bearer l');
  });

  test('primary cooling down: the next request tries the secondary first', async () => {
    env.set('GEMINI_API_KEY', 'p'); env.set('Gemini_API_Key', 's'); env.set('LOVABLE_API_KEY', 'l');
    let first = true;
    route((url) => {
      if (url.includes('googleapis') && first) { first = false; return reply(429); }
      return reply(200);
    });
    expect((await ask()).status).toBe(200);
    calls = [];
    expect((await ask()).status).toBe(200);
    expect(calls[0].auth).toBe('Bearer s');
  });
});

// A throwaway service account, generated per run: never a real key.
const testKeyPair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', testKeyPair.privateKey));
const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8)).replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
const serviceAccount = JSON.stringify({ client_email: 'ai@test-project.iam.gserviceaccount.com', private_key: pem, project_id: 'test-project', token_uri: 'https://oauth2.googleapis.com/token' });
const tokenReply = () => reply(200, { access_token: 'vt', expires_in: 3600 });
const isToken = (url: string) => url.startsWith('https://oauth2.googleapis.com/token');
const isVertex = (url: string) => url.includes('aiplatform.googleapis.com');

describe('aiFetch with Vertex AI first', () => {
  test('Vertex answers: Gemini and the gateway are never called', async () => {
    env.set('VERTEX_SERVICE_ACCOUNT', serviceAccount); env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
    route((url) => (isToken(url) ? tokenReply() : reply(200)));
    expect(aiConfigured()).toBe(true);
    expect((await ask()).status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(isToken(calls[0].url)).toBe(true);
    expect(String(calls[0].body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    expect(calls[1].url).toBe('https://aiplatform.googleapis.com/v1/projects/test-project/locations/global/endpoints/openapi/chat/completions');
    expect(calls[1].auth).toBe('Bearer vt');
    expect(calls[1].body.model).toBe(toVertexModel('google/gemini-2.5-pro'));
  });

  test('the access token is reused across requests', async () => {
    env.set('VERTEX_SERVICE_ACCOUNT', serviceAccount);
    route((url) => (isToken(url) ? tokenReply() : reply(200)));
    await ask(); await ask();
    expect(calls.filter((c) => isToken(c.url))).toHaveLength(1);
    expect(calls.filter((c) => isVertex(c.url))).toHaveLength(2);
  });

  for (const status of [403, 404, 429, 500]) {
    test(`Vertex ${status}: falls back to Gemini, then skips Vertex for a while`, async () => {
      env.set('VERTEX_SERVICE_ACCOUNT', serviceAccount); env.set('GEMINI_API_KEY', 'g'); env.set('LOVABLE_API_KEY', 'l');
      route((url) => (isToken(url) ? tokenReply() : isVertex(url) ? reply(status, { error: 'x' }) : reply(200)));
      expect((await ask()).status).toBe(200);
      expect(calls.at(-1)!.url).toContain('generativelanguage.googleapis.com');
      calls = [];
      expect((await ask()).status).toBe(200);
      expect(calls.some((c) => isVertex(c.url))).toBe(false);
    });
  }

  test('token refused: goes straight to Gemini', async () => {
    env.set('VERTEX_SERVICE_ACCOUNT', serviceAccount); env.set('GEMINI_API_KEY', 'g');
    route((url) => (isToken(url) ? reply(400, { error: 'invalid_grant' }) : reply(200)));
    expect((await ask()).status).toBe(200);
    expect(calls.some((c) => isVertex(c.url))).toBe(false);
    expect(calls.at(-1)!.url).toContain('generativelanguage.googleapis.com');
  });

  test('Vertex only, and it refuses: the caller sees its status', async () => {
    env.set('VERTEX_SERVICE_ACCOUNT', serviceAccount);
    route((url) => (isToken(url) ? tokenReply() : reply(429, { error: 'x' })));
    expect((await ask()).status).toBe(429);
  });

  test('an unreadable service account is ignored', async () => {
    env.set('VERTEX_SERVICE_ACCOUNT', '{not json'); env.set('GEMINI_API_KEY', 'g');
    route(() => reply(200));
    expect((await ask()).status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([expect.stringContaining('generativelanguage.googleapis.com')]);
  });

  test('regional endpoint and model overrides', () => {
    expect(vertexUrl({ project: 'p', location: 'asia-south1' })).toBe('https://asia-south1-aiplatform.googleapis.com/v1/projects/p/locations/asia-south1/endpoints/openapi/chat/completions');
    env.set('VERTEX_MODEL_FLASH', 'google/gemini-x-flash');
    expect(toVertexModel('google/gemini-2.5-flash')).toBe('google/gemini-x-flash');
    expect(toVertexModel('google/gemini-2.5-flash-lite')).toBe('google/gemini-3.1-flash-lite');
  });
});
