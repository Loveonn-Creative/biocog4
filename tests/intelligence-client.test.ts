import { describe, expect, test } from 'bun:test';
import { chatBits, chatFailure, readSse } from '../src/lib/intelligenceClient';

describe('failure messages', () => {
  test('the AI provider being out of credit (402) is never shown as the person\'s plan', () => {
    const f = chatFailure(402, { error: 'Usage limit reached. Please upgrade your plan.' }, 'pro');
    expect(f.kind).toBe('unavailable');
    expect(f.retry).toBe(true);
    expect(f.message.toLowerCase()).not.toContain('upgrade');
  });
  test('daily limit: guests are offered sign-in, free and Essential see Pro, Pro sees no upsell', () => {
    const body = { error: 'daily_limit', limit: 10, resetsAt: 'x' };
    expect(chatFailure(429, body, 'guest')).toMatchObject({ kind: 'daily_limit', retry: false, action: { to: '/auth?next=/intelligence' } });
    expect(chatFailure(429, { ...body, limit: 20 }, 'snapshot').action?.to).toBe('/pricing');
    expect(chatFailure(429, { ...body, limit: 200 }, 'pro').action).toBeUndefined();
    expect(chatFailure(429, body, 'guest').message).toBe("You've used today's 10 questions. They reset at midnight India time.");
  });
  test('a provider rate limit (429 without daily_limit) is temporary and retryable', () => {
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
