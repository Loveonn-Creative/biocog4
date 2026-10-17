import { describe, expect, test } from 'bun:test';
import { chatBits, chatFailure, displayAnswer, parseEvidence, planLine, readSse, suggestionsFor } from '../src/lib/intelligenceClient';

describe('failure messages', () => {
  test('the AI provider being out of credit (402) is never shown as the person\'s plan', () => {
    const f = chatFailure(402, { error: 'Usage limit reached. Please upgrade your plan.' }, 'pro');
    expect(f.kind).toBe('unavailable');
    expect(f.retry).toBe(true);
    expect(f.message.toLowerCase()).not.toContain('upgrade');
  });
  test('daily limit: guests are offered sign-in, free and Essential see Pro, Pro sees no upsell', () => {
    const body = { error: 'monthly_limit', limit: 10, resetsAt: 'x' };
    const now = new Date('2026-10-17T06:00:00Z');
    expect(chatFailure(429, body, 'guest', now)).toMatchObject({ kind: 'limit', retry: false, action: { label: 'Sign in', to: '/auth?next=/intelligence' } });
    expect(chatFailure(429, { ...body, limit: 20 }, 'snapshot', now).action?.to).toBe('/pricing');
    expect(chatFailure(429, { ...body, limit: 2000 }, 'pro', now).action).toEqual({ label: 'See plans', to: '/pricing' });
    expect(chatFailure(429, { ...body, limit: 20, used: 20 }, 'snapshot', now).message).toBe("You've used 20 of 20 in October. Resets 1 November.");
    expect(chatFailure(429, body, 'guest', now).message).not.toMatch(/a day/);
  });
  test('a provider rate limit (429 without monthly_limit) is temporary and retryable', () => {
    expect(chatFailure(429, { error: 'unavailable' }, 'pro').kind).toBe('unavailable');
  });
  test('a rejected question shows the server reason', () => {
    expect(chatFailure(400, { error: 'Keep your message under 4000 characters' }, 'guest')).toMatchObject({ kind: 'rejected', message: 'Keep your message under 4000 characters', retry: false });
  });
  test('anything else: retryable server error', () => {
    expect(chatFailure(500, null, null)).toMatchObject({ kind: 'server', retry: true });
  });
});

describe('chat bits', () => {
  test('blank-line separated messages become separate bubbles', () => {
    expect(chatBits('Your bills show 2.1 t CO2e.\n\nMost is electricity.\n \nNext: try /solar-signal.')).toEqual(['Your bills show 2.1 t CO2e.', 'Most is electricity.', 'Next: try /solar-signal.']);
    expect(chatBits('one line')).toEqual(['one line']);
    expect(chatBits('  ')).toEqual([]);
  });
});

describe('stream reading', () => {
  const ev = (c: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n`;
  test('complete lines are read, a partial line waits', () => {
    const r = readSse(ev('Hel') + ev('lo') + 'data: {"choi');
    expect(r.deltas.join('')).toBe('Hello');
    expect(r.rest).toBe('data: {"choi');
    expect(r.done).toBe(false);
  });
  test('[DONE], comments and junk lines', () => {
    const r = readSse(': keep-alive\n' + 'data: not json\n' + ev('x') + 'data: [DONE]\n');
    expect(r).toEqual({ deltas: ['x'], rest: '', done: true });
  });
});

describe('evidence event', () => {
  const ev = (c: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n`;
  const evidence = { basis: 'verified', records: [{ id: 'a1b2c3d4-0000-4000-8000-000000000001', label: 'Electricity bill · 14 Mar 2026', kgCO2e: 6731 }], calculation: '9,480 kWh × 0.71 kg/kWh = 6,731 kg CO2e', projection: null, resources: [{ title: 'CBAM', url: 'https://senseible.earth/answers/cbam' }], removedIds: 0 };
  test('the evidence event is read after the text', () => {
    const r = readSse(ev('Hi') + 'event: evidence\n' + `data: ${JSON.stringify({ evidence })}\n\n` + 'data: [DONE]\n');
    expect(r.deltas).toEqual(['Hi']);
    expect(r.evidence).toEqual(evidence as never);
    expect(r.done).toBe(true);
  });
  test('malformed records and outside links are dropped', () => {
    const e = parseEvidence({ ...evidence, records: [{ id: 'not-a-uuid', label: 'x', kgCO2e: 1 }], resources: [{ title: 'x', url: 'https://evil.example/' }] });
    expect(e?.records).toEqual([]);
    expect(e?.resources).toEqual([]);
    expect(parseEvidence({ basis: 'certified' })).toBeUndefined();
  });
  test('bracketed record IDs are hidden from the prose', () => {
    expect(displayAnswer('March was 6.7 t [a1b2c3d4].')).toBe('March was 6.7 t.');
  });
});

describe('plan line', () => {
  test('real values, month in India time', () => {
    expect(planLine('pro', 180, 2000, new Date('2026-10-17T06:00:00Z'))).toBe('Pro · 1,820 of 2,000 questions left in October');
    expect(planLine('snapshot', 25, 20, new Date('2026-10-31T19:00:00Z'))).toBe('Snapshot · 0 of 20 questions left in November');
  });
});

describe('suggestion chips', () => {
  const labels = (x: { label: string }[]) => x.map((s) => s.label);
  test('guest and Snapshot get general platform questions', () => {
    for (const audience of ['guest', 'snapshot'] as const) {
      expect(labels(suggestionsFor({ audience }))).toEqual(['What is Scope 3?', 'CBAM in 2026', 'Read a kVAh bill']);
    }
  });
  test('no green loan or carbon credit value chips on any plan', () => {
    for (const audience of ['guest', 'snapshot', 'essential', 'pro', 'scale'] as const) {
      const l = labels(suggestionsFor({ audience, brief: { basis: 'verified', hotspots: [{ category: 'electricity', scope: 2 }] }, projection: {} })).join(' ');
      expect(l).not.toMatch(/green loan|credit value/i);
    }
  });
  test('Pro uses the real top category; "Next 3 months" only with a projection', () => {
    const brief = { basis: 'verified' as const, hotspots: [{ category: 'diesel', scope: 1 }, { category: 'grid_electricity', scope: 2 }] };
    const withP = suggestionsFor({ audience: 'pro', brief, projection: { next12Kg: 1 } });
    expect(withP[0].label).toBe('Biggest hotspot this quarter');
    expect(withP[0].prompt).toContain('diesel');
    expect(labels(withP)).toContain('Next 3 months');
    expect(labels(suggestionsFor({ audience: 'scale', brief, projection: null }))).not.toContain('Next 3 months');
    expect(labels(suggestionsFor({ audience: 'pro', brief, insights: [{ unitCostInr: { value: 9, unit: 'kwh' } }] }))).toContain('Unit cost per kWh');
  });
  test('Pro with no records is pointed to the first upload', () => {
    expect(suggestionsFor({ audience: 'pro', brief: { basis: 'none', hotspots: [] } })[0].label).toBe('Add my first invoice');
  });
  test('Essential with insights asks about them', () => {
    expect(labels(suggestionsFor({ audience: 'essential', insights: [{ category: 'electricity' }] }))).toEqual(['Where to start saving', 'About electricity', 'CBAM in 2026']);
  });
});
