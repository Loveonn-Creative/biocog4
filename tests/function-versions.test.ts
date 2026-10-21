import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
// @ts-expect-error plain ESM script without types
import { VERSIONED, generated } from '../scripts/function-versions.mjs';
import { versionProbe } from '../supabase/functions/_shared/versionProbe';

const FN = new URL('../supabase/functions/', import.meta.url).pathname;

describe('function versions', () => {
  test('generated fingerprints match the source (run node scripts/function-versions.mjs)', () => {
    expect(readFileSync(`${FN}_shared/functionVersions.generated.ts`, 'utf8')).toBe(generated());
  });

  test('every versioned function answers the probe before anything else', () => {
    for (const name of VERSIONED as string[]) {
      const src = readFileSync(`${FN}${name}/index.ts`, 'utf8');
      expect(src).toMatch(new RegExp(`versionProbe\\(req, ['"]${name}['"]\\)`));
    }
  });

  test('GET ?__version returns only the function name and fingerprint', async () => {
    const r = versionProbe(new Request('https://x.supabase.co/functions/v1/extract-document?__version'), 'extract-document')!;
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const body = await r.json();
    expect(Object.keys(body).sort()).toEqual(['function', 'version']);
    expect(body.version).toMatch(/^[0-9a-f]{16}$/);
  });

  test('normal requests pass straight through', () => {
    expect(versionProbe(new Request('https://x/functions/v1/extract-document?__version', { method: 'POST', body: '{}' }), 'extract-document')).toBeNull();
    expect(versionProbe(new Request('https://x/functions/v1/esg-report-access?t=abc'), 'esg-report-access')).toBeNull();
    expect(versionProbe(new Request('https://x/functions/v1/extract-document', { method: 'OPTIONS' }), 'extract-document')).toBeNull();
  });
});
