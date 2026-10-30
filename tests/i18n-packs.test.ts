import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// autoTranslate schedules with window.setTimeout and fetches misses through
// the lazily loaded Supabase client; both are stubbed here.
(globalThis as any).window ??= globalThis;
const invoked: { locale: string; strings: string[] }[] = [];
mock.module('@/integrations/supabase/lazyClient', () => ({
  loadSupabase: async () => ({
    functions: {
      invoke: async (_name: string, { body }: { body: { locale: string; strings: string[] } }) => {
        invoked.push(body);
        return { data: { translations: Object.fromEntries(body.strings.map(s => [s, `RT:${s}`])) }, error: null };
      },
    },
  }),
}));

const { splitLongText, splitSpacing, cacheKeysFor, routeKey, isTranslatable, LONG_TEXT_CHARS } = await import('../src/lib/i18n/textRules');
const auto = await import('../src/lib/i18n/autoTranslate');
const packs = await import('../src/lib/i18n/packs');
const { isSensitiveRoute, SENSITIVE_PREFIXES } = await import('../src/lib/i18n/sensitiveRoutes');
const build = await import('../scripts/i18n/build-packs.mjs');

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const sentence = (i: number) => `Sentence number ${i} explains what BRSR Core asks a listed company to disclose.`;
const LONG = Array.from({ length: 12 }, (_, i) => sentence(i)).join('  ');

let served: Record<string, unknown> = {};
const fetched: string[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  invoked.length = 0;
  fetched.length = 0;
  served = {};
  packs.resetPacksForTest();
  auto.setRuntimeTranslationAllowed(true);
  globalThis.fetch = (async (url: string) => {
    fetched.push(url);
    const body = served[url];
    return body === undefined
      ? new Response('not found', { status: 404 })
      : new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

describe('long text split and rejoin', () => {
  test('short text is one piece', () => {
    expect(splitLongText('Hello there.')).toEqual(['Hello there.']);
  });

  test('pieces join back to the exact original, spacing included', () => {
    const pieces = splitLongText(LONG);
    expect(LONG.length).toBeGreaterThan(LONG_TEXT_CHARS);
    expect(pieces.length).toBe(12);
    expect(pieces.join('')).toBe(LONG);
    expect(pieces[0].endsWith('.  ')).toBe(true);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(LONG_TEXT_CHARS);
  });

  test('a single over-long sentence is cut at clause boundaries and still rejoins', () => {
    const run = Array.from({ length: 30 }, (_, i) => `clause ${i} about supplier emissions`).join(', ');
    const pieces = splitLongText(run);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.join('')).toBe(run);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(LONG_TEXT_CHARS);
  });

  test('cache keys are the trimmed sentences; skip rules still apply', () => {
    const keys = cacheKeysFor(LONG);
    expect(keys).toEqual(Array.from({ length: 12 }, (_, i) => sentence(i)));
    expect(cacheKeysFor('12,500.00')).toEqual([]);
    expect(cacheKeysFor('GSTIN-1234')).toEqual([]);
    expect(cacheKeysFor('hello@senseible.earth')).toEqual([]);
    expect(isTranslatable('https://senseible.earth')).toBe(false);
    expect(splitSpacing('  a b  ')).toEqual(['  ', 'a b', '  ']);
  });

  test('translateSync translates each sentence and keeps the original spacing', () => {
    const map = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [sentence(i), `वाक्य ${i}।`]));
    auto.seedTranslations('hi', map);
    const out = auto.translateSync('hi', LONG);
    expect(out).toBe(Array.from({ length: 12 }, (_, i) => `वाक्य ${i}।`).join('  '));
  });
});

describe('pack seeding', () => {
  test('route key naming', () => {
    expect(routeKey('/')).toBe('index');
    expect(routeKey('/brsr-reporting/')).toBe('brsr-reporting');
    expect(routeKey('/vs/sprih?x=1')).toBe('vs__sprih');
  });

  test('common and route packs seed the memory cache before any network call', async () => {
    served['/i18n/packs/ta/_common.json'] = { Contact: 'தொடர்பு' };
    served['/i18n/packs/ta/brsr-reporting.json'] = { 'What BRSR asks': 'BRSR என்ன கேட்கிறது' };
    // A miss queued while the pack loads waits for it instead of going out.
    expect(auto.translateSync('ta', 'Contact')).toBe('Contact');
    const n = await packs.loadPacks('ta', '/brsr-reporting');
    expect(n).toBe(2);
    expect(fetched).toEqual(['/i18n/packs/ta/_common.json', '/i18n/packs/ta/brsr-reporting.json']);
    expect(auto.translateSync('ta', 'Contact')).toBe('தொடர்பு');
    expect(auto.translateSync('ta', 'What BRSR asks')).toBe('BRSR என்ன கேட்கிறது');
    await wait(200);
    expect(invoked.length).toBe(0);
  });

  test('prefetch on intent warms the pack once', async () => {
    served['/i18n/packs/bn/_common.json'] = {};
    served['/i18n/packs/bn/about.json'] = { 'Who we are': 'আমরা কারা' };
    await packs.loadPacks('bn', '/brsr-reporting');
    fetched.length = 0;
    packs.prefetchPack('/about');
    packs.prefetchPack('/about');
    expect(fetched).toEqual(['/i18n/packs/bn/about.json']);
    await packs.loadPacks('bn', '/about');
    expect(fetched).toEqual(['/i18n/packs/bn/about.json']);
    expect(auto.translateSync('bn', 'Who we are')).toBe('আমরা কারা');
  });
});

describe('sensitive routes untouched', () => {
  test('no pack is fetched on any sensitive route, and none for English', async () => {
    for (const p of SENSITIVE_PREFIXES) {
      expect(await packs.loadPacks('hi', p)).toBe(0);
      expect(await packs.loadPacks('hi', `${p}/x`)).toBe(0);
      packs.prefetchPack(p);
    }
    expect(await packs.loadPacks('en', '/brsr-reporting')).toBe(0);
    expect(fetched).toEqual([]);
  });

  test('runtime translation stays off where the page turns it off', () => {
    auto.seedTranslations('mr', { Pricing: 'किंमत' });
    auto.setRuntimeTranslationAllowed(false);
    expect(auto.translateSync('mr', 'Pricing')).toBe('Pricing');
    auto.setRuntimeTranslationAllowed(true);
    expect(auto.translateSync('mr', 'Pricing')).toBe('किंमत');
  });

  test('the pack builder never collects a sensitive route', () => {
    const routes = build.packRoutes(['/', '/pricing', '/help/plans', '/answers', '/answers/what-is-brsr', '/hi/answers/x', '/de/cbam-kosten', '/brsr-reporting/', '/climate-intelligence/x']);
    expect(routes).toEqual(['/', '/answers', '/brsr-reporting']);
    for (const r of routes) expect(isSensitiveRoute(r)).toBe(false);
  });
});

describe('fallback path', () => {
  test('strings missing from the pack go to translate-batch once the pack settles', async () => {
    served['/i18n/packs/gu/_common.json'] = { Home: 'હોમ' };
    // No route pack (404): the page still works through the runtime path.
    const loading = packs.loadPacks('gu', '/careers');
    expect(auto.translateSync('gu', 'Open roles')).toBe('Open roles');
    await loading;
    await wait(250);
    expect(invoked.length).toBe(1);
    expect(invoked[0]).toEqual({ locale: 'gu', strings: ['Open roles'] });
    expect(auto.translateSync('gu', 'Open roles')).toBe('RT:Open roles');
    expect(auto.translateSync('gu', 'Home')).toBe('હોમ');
  });

  test('a long paragraph with no pack is requested sentence by sentence, each under the server limit', async () => {
    auto.translateSync('pa', LONG);
    await wait(250);
    const sent = invoked.flatMap(c => c.strings);
    expect(sent).toEqual(Array.from({ length: 12 }, (_, i) => sentence(i)));
    for (const s of sent) expect(s.length).toBeLessThanOrEqual(600);
    expect(auto.translateSync('pa', LONG)).toBe(Array.from({ length: 12 }, (_, i) => `RT:${sentence(i)}`).join('  '));
  });
});

describe('pack files', () => {
  test('strings on 3 or more routes go to _common, the rest to the route', () => {
    const routes = {
      a: { strings: ['Nav', 'Only A'] },
      b: { strings: ['Nav', 'Shared AB'] },
      c: { strings: ['Nav', 'Shared AB', 'Untranslated'] },
    };
    const t = { Nav: 'N', 'Only A': 'A', 'Shared AB': 'S' };
    const files = build.buildPacks(routes, t);
    expect(files._common).toEqual({ Nav: 'N' });
    expect(files.a).toEqual({ 'Only A': 'A' });
    expect(files.c).toEqual({ 'Shared AB': 'S' });
  });

  test('collected strings use the same skip rules and split as the page', () => {
    const got = build.stringsFrom({ texts: ['Contact', '2,400', LONG], attrs: ['Search answers', 'GSTIN-1234'] });
    expect(got).toEqual(['Contact', ...Array.from({ length: 12 }, (_, i) => sentence(i)), 'Search answers']);
  });
});

describe('embedded code is never translated', () => {
  const { readFileSync, readdirSync } = require('fs');
  const looksLikeCss = (k: string) => k.includes('{') && k.includes(';') && k.includes(':');

  test('shipped packs and collected strings carry no stylesheet text', () => {
    const root = 'public/i18n/packs';
    for (const locale of readdirSync(root)) {
      for (const file of readdirSync(`${root}/${locale}`)) {
        const keys = Object.keys(JSON.parse(readFileSync(`${root}/${locale}/${file}`, 'utf8')));
        expect(keys.filter(looksLikeCss)).toEqual([]);
      }
    }
    expect(readFileSync('scripts/i18n/data/sources.json', 'utf8')).not.toContain('drop-shadow(');
  });

  test('lowercase SVG <style> and <script> are skipped in the page and the pack builder', () => {
    expect(readFileSync('src/lib/i18n/domTranslator.ts', 'utf8')).toContain('EMBEDDED_CODE.has(node.tagName)');
    expect(readFileSync('scripts/i18n/build-packs.mjs', 'utf8')).toContain("n.tagName === 'style' || n.tagName === 'script'");
  });
});
