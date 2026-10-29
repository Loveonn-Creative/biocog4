import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// Unknown addresses must get a real 404 (vercel.json has no catch-all rewrite).
// Every route with a parameter is therefore either prerendered page by page for
// search, or rewritten to the app in vercel.json. A new one must be placed here.
const PRERENDERED = ['/answers/:slug', '/hi/answers/:slug', '/case-studies/:slug', '/cbam-cost/:sector', '/climate-intelligence/:slug', '/emission-factors/:slug', '/help/:slug', '/industries/:industry', '/legal/:slug', '/solutions/:useCase', '/templates/:slug', '/vs/:competitor'];
const REWRITTEN = ['/supplier-request/:token', '/supplier-share/:requestId'];

describe('not-found status', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const params = [...new Set([...app.matchAll(/path="([^"]*:[^"]*)"/g)].map((m) => m[1]))].sort();
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

  test('no catch-all rewrite, so unknown URLs return 404', () => {
    expect(vercel.rewrites.some((r: { source: string }) => /\(\.\*\)|:path\*/.test(r.source))).toBe(false);
  });

  test('every parameter route is prerendered or rewritten to the app', () => {
    expect(params).toEqual([...PRERENDERED, ...REWRITTEN].sort());
    expect(vercel.rewrites.map((r: { source: string }) => r.source).sort()).toEqual([...REWRITTEN].sort());
  });

  test('the prerender step writes the 404 page', () => {
    expect(readFileSync('scripts/generate-static-html.js', 'utf8')).toContain("'404.html'");
  });
});
