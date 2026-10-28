// Response headers in vercel.json: an enforced Content-Security-Policy whose inline
// allowances are sha256 hashes of the exact inline code we ship, and HSTS.
import { describe, expect, test } from 'bun:test';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const rule = (source: string) => vercel.headers.find((r) => r.source === source);
const header = (source: string, key: string) => rule(source)?.headers.find((h) => h.key === key)?.value;
const MAIN = '/((?!play(?:/|$)).*)';
const csp = header(MAIN, 'Content-Security-Policy') ?? '';
const directive = (name: string) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) ?? '').split(/\s+/).slice(1);
const sha = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
// Same matching as Vercel's path-to-regexp for these two sources.
const mainRe = new RegExp('^' + MAIN + '$');
const playRe = /^\/play(?:\/.*)?$/;

describe('security headers', () => {
  test('the policy is enforced, not report-only', () => {
    const keys = vercel.headers.flatMap((r) => r.headers.map((h) => h.key));
    expect(keys).not.toContain('Content-Security-Policy-Report-Only');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  test('HSTS covers subdomains and is not submitted for preload', () => {
    const hsts = header('/(.*)', 'Strict-Transport-Security') ?? '';
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toMatch(/max-age=\d{8,}/);
    expect(hsts).not.toContain('preload');
  });

  test("scripts get no blanket 'unsafe-inline' or eval", () => {
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
  });

  test('every inline script in index.html is allowed by its hash', () => {
    const html = readFileSync('index.html', 'utf8');
    const inline = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter((m) => !/\ssrc=/.test(m[1] ?? '') && !/type="application\/(ld\+)?json"/.test(m[1] ?? ''));
    expect(inline.length).toBeGreaterThan(0);
    for (const m of inline) expect(directive('script-src')).toContain(sha(m[2]));
  });

  test('the non-blocking stylesheet onload handler is allowed by its hash', () => {
    const vite = readFileSync('vite.config.ts', 'utf8');
    const handler = vite.match(/onload="([^"]*)"/)?.[1];
    expect(handler).toBeTruthy();
    expect(directive('script-src')).toContain("'unsafe-hashes'");
    expect(directive('script-src')).toContain(sha(handler!));
  });

  test('retired-URL pages use an external script, not inline code', () => {
    const gen = readFileSync('scripts/generate-static-html.js', 'utf8');
    expect(gen).toContain('<script src="/moved.js"');
    expect(gen).not.toContain('<script>location.replace');
  });

  test('first-party services stay reachable', () => {
    for (const host of ['https://www.googletagmanager.com', 'https://www.clarity.ms', 'https://checkout.razorpay.com', 'blob:']) expect(directive('script-src')).toContain(host);
    for (const host of ['https://*.supabase.co', 'wss://*.supabase.co', 'https://*.google-analytics.com', 'https://*.clarity.ms', 'https://api.razorpay.com', 'https://*.elevenlabs.io', 'wss://*.elevenlabs.io', 'wss://*.livekit.cloud']) expect(directive('connect-src')).toContain(host);
    expect(directive('frame-src')).toContain('https://api.razorpay.com');
    expect(directive('worker-src')).toContain("'self'");
  });

  test('the offline arcade at /play gets its own policy and the rest of the site the main one', () => {
    for (const p of ['/play', '/play/', '/play/index.html']) { expect(mainRe.test(p)).toBe(false); expect(playRe.test(p)).toBe(true); }
    for (const p of ['/', '/pricing', '/playbook', '/answers/x', '/assets/a.js']) { expect(mainRe.test(p)).toBe(true); expect(playRe.test(p)).toBe(false); }
    expect(header('/play/:path*', 'Content-Security-Policy')).toContain("object-src 'none'");
  });
});
