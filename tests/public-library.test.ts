import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { findResources, syncLibrary, validEntries } from '../supabase/functions/_shared/publicLibrary';
import type { LibraryEntry } from '../supabase/functions/_shared/intelligenceEvidence';

const steel: LibraryEntry = { kind: 'answer', title: 'How do I calculate CBAM embedded emissions for steel?', text: 'Direct plus indirect emissions per tonne.', url: 'https://senseible.earth/answers/cbam-steel' };
const solar: LibraryEntry = { kind: 'answer', title: 'Does rooftop solar cut Scope 2?', text: 'Yes, by the units it replaces.', url: 'https://senseible.earth/answers/rooftop-solar' };
const bundle = [steel, solar];

type Call = { fn: string; args?: Record<string, unknown> };
const fakeDb = (handlers: Record<string, (args?: Record<string, unknown>) => { data?: unknown; error?: unknown }>) => {
  const calls: Call[] = [];
  return {
    calls,
    rpc: (fn: string, args?: Record<string, unknown>) => {
      calls.push({ fn, args });
      const h = handlers[fn];
      if (!h) return Promise.resolve({ data: null, error: { message: 'function does not exist' } });
      const r = h(args);
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    },
  };
};

describe('findResources', () => {
  test('falls back to the bundled copy when the table is missing', async () => {
    const r = await findResources(fakeDb({}), 'CBAM steel embedded emissions', bundle);
    expect(r.source).toBe('bundle');
    expect(r.entries[0]).toEqual(steel);
  });

  test('falls back while the database copy is not synced yet', async () => {
    const db = fakeDb({ search_public_library: () => ({ data: { ready: false, rows: [] } }) });
    expect((await findResources(db, 'CBAM steel', bundle)).source).toBe('bundle');
  });

  test('reads only candidates from the database and scores them the same way', async () => {
    const db = fakeDb({ search_public_library: () => ({ data: { ready: true, rows: [solar, steel] } }) });
    const r = await findResources(db, 'How do I work out CBAM emissions for steel?', [], 4);
    expect(r.source).toBe('db');
    expect(r.entries).toEqual([steel]);
    expect(db.calls[0].args).toEqual({ p_terms: ['work', 'out', 'cbam', 'emission', 'steel'], p_limit: 24 });
  });

  test('an empty database answer is an answer, not a fallback', async () => {
    const db = fakeDb({ search_public_library: () => ({ data: { ready: true, rows: [] } }) });
    expect(await findResources(db, 'CBAM steel', bundle)).toEqual({ entries: [], source: 'db' });
  });

  test('a malformed row from the database is not cited', async () => {
    const db = fakeDb({ search_public_library: () => ({ data: { ready: true, rows: [{ ...steel, url: 'https://evil.example/x' }] } }) });
    expect((await findResources(db, 'CBAM steel emissions', bundle)).entries).toEqual([]);
  });
});

describe('validEntries', () => {
  test('accepts the published shape and rejects anything else', () => {
    expect(validEntries(bundle)).toEqual(bundle);
    expect(validEntries([{ ...steel, url: null, kind: 'fact' }])).toHaveLength(1);
    expect(validEntries([{ ...steel, kind: 'secret' }])).toBeNull();
    expect(validEntries([{ ...steel, url: 'http://senseible.earth/answers/x' }])).toBeNull();
    expect(validEntries([{ ...steel, url: 'https://senseible.earth.evil.com/x' }])).toBeNull();
    expect(validEntries([{ ...steel, text: 'x'.repeat(1001) }])).toBeNull();
    expect(validEntries({})).toBeNull();
  });
});

describe('syncLibrary', () => {
  const text = JSON.stringify(bundle);
  const version = createHash('sha256').update(text).digest('hex').slice(0, 16);
  const site = (body = text, v = version) => {
    const urls: string[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      urls.push(url);
      expect(init?.redirect).toBe('error');
      if (url.endsWith('/_library-version.json')) return new Response(JSON.stringify({ version: v, count: 2 }));
      if (url.endsWith('/_library.json')) return new Response(body);
      return new Response('', { status: 404 });
    }) as typeof fetch;
    return { f, urls };
  };

  test('does nothing when another caller checked recently', async () => {
    const db = fakeDb({ claim_public_library_check: () => ({ data: [{ claimed: false, version: null }] }) });
    const s = site();
    expect(await syncLibrary(db, s.f)).toBe('skipped');
    expect(s.urls).toEqual([]);
  });

  test('does nothing before the migration is applied', async () => {
    expect(await syncLibrary(fakeDb({}), site().f)).toBe('skipped');
  });

  test('stops at the version file when the loaded version is current', async () => {
    const db = fakeDb({ claim_public_library_check: () => ({ data: [{ claimed: true, version }] }) });
    const s = site();
    expect(await syncLibrary(db, s.f)).toBe('current');
    expect(s.urls).toEqual(['https://senseible.earth/answer-data/_library-version.json']);
  });

  test('loads a new version from the fixed public site only', async () => {
    let applied: Record<string, unknown> | undefined;
    const db = fakeDb({
      claim_public_library_check: () => ({ data: [{ claimed: true, version: '0000000000000000' }] }),
      apply_public_library: (args) => { applied = args; return { data: 2 }; },
    });
    const s = site();
    expect(await syncLibrary(db, s.f)).toBe('updated');
    expect(s.urls.every((u) => u.startsWith('https://senseible.earth/answer-data/'))).toBe(true);
    expect(applied).toEqual({ p_version: version, p_entries: bundle });
  });

  test('a download that does not match the published version changes nothing', async () => {
    const db = fakeDb({ claim_public_library_check: () => ({ data: [{ claimed: true, version: null }] }), apply_public_library: () => ({ data: 1 }) });
    expect(await syncLibrary(db, site(JSON.stringify([steel])).f)).toBe('failed');
    expect(db.calls.map((c) => c.fn)).not.toContain('apply_public_library');
  });

  test('a library with one bad entry changes nothing', async () => {
    const bad = JSON.stringify([steel, { ...solar, url: 'https://evil.example/' }]);
    const v = createHash('sha256').update(bad).digest('hex').slice(0, 16);
    const db = fakeDb({ claim_public_library_check: () => ({ data: [{ claimed: true, version: null }] }), apply_public_library: () => ({ data: 1 }) });
    expect(await syncLibrary(db, site(bad, v).f)).toBe('failed');
    expect(db.calls.map((c) => c.fn)).not.toContain('apply_public_library');
  });

  test('a malformed version file changes nothing', async () => {
    const db = fakeDb({ claim_public_library_check: () => ({ data: [{ claimed: true, version: null }] }) });
    expect(await syncLibrary(db, site(text, 'not-a-version').f)).toBe('failed');
  });
});
