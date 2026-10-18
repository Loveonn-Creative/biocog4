// Runs the machinery-beta edge function in Deno against an in-memory Supabase.
//   deno test --allow-env --import-map=supabase/function-tests/import_map.json supabase/function-tests/machinery-beta.deno.ts
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { db, resetDb } from './supabase-mock.ts';
import { writeExifGps, MAX_PHOTO_BYTES } from '../functions/_shared/machineryBeta.ts';

let handler: (req: Request) => Promise<Response> = () => { throw new Error('function not loaded'); };
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: (req: Request) => Promise<Response>) => { handler = h; return { finished: Promise.resolve(), shutdown: async () => {} }; };
for (const [k, v] of Object.entries({ SUPABASE_URL: 'http://db', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })) Deno.env.set(k, v);
await import('../functions/machinery-beta/index.ts');

const USER = { id: '00000000-0000-4000-8000-00000000aa01' };
const SITE = { lat: 28.4595, lng: 77.0266 };
const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xda, 0, 2, 0, 0, 0xff, 0xd9]);
const dto = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, ':');
const photo = (opts: { minutesAgo?: number; at?: { lat: number; lng: number }; noTime?: boolean } = {}) =>
  writeExifGps(bare, { ...(opts.at ?? SITE), dateTimeOriginal: opts.noTime ? null : dto(new Date(Date.now() - (opts.minutesAgo ?? 2) * 60000)), offsetTime: '+00:00' });
/** Pads a JPEG past a size with APP2 segments after SOI. */
function pad(jpeg: Uint8Array, size: number) {
  const parts: number[] = [];
  while (jpeg.length + parts.length < size) { const n = 60000; parts.push(0xff, 0xe2, (n + 2) >> 8, (n + 2) & 0xff, ...new Array(n).fill(0)); }
  const out = new Uint8Array(jpeg.length + parts.length);
  out.set(jpeg.subarray(0, 2)); out.set(parts, 2); out.set(jpeg.subarray(2), 2 + parts.length);
  return out;
}
const b64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const live = (over: Record<string, unknown> = {}) => ({ lat: 28.4600, lng: 77.0266, accuracy: 15, at: new Date().toISOString(), ...over });
const fields = { machineType: 'Generator', makeModel: 'Kirloskar', ratedPower: 125, powerUnit: 'kVA', fuel: 'diesel', hoursPerDay: 6 };
const call = (body: unknown, token = 'good') =>
  handler(new Request('http://fn/machinery-beta', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, body: JSON.stringify(body) }));
const save = (bytes: Uint8Array, over: Record<string, unknown> = {}) =>
  call({ action: 'save', fields, transcript: 'diesel generator make Kirloskar 125 kVA 6 hours a day', live: live(), photo: b64(bytes), tzOffsetMin: 330, ...over });

function setup(enabled = true) {
  resetDb();
  db.users.good = USER;
  if (enabled) Deno.env.set('MACHINERY_BETA_ENABLED', 'true'); else Deno.env.delete('MACHINERY_BETA_ENABLED');
}
const stored = () => db.tables.machinery_entries ?? [];

Deno.test('closed unless the secret is set', async () => {
  setup(false);
  const res = await call({ action: 'list' });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).code, 'not_open');
});

Deno.test('needs a signed-in user', async () => {
  setup();
  assertEquals((await call({ action: 'list' }, '')).status, 401);
  assertEquals((await call({ action: 'list' }, 'expired')).status, 401);
});

Deno.test('saves a GPS camera photo near the live location as Unverified', async () => {
  setup();
  const res = await save(photo());
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.entry.status, 'unverified');
  assertEquals(body.entry.distance_m, 56);
  assert(!('photo_lat' in body.entry) && !('photo_path' in body.entry), 'no coordinates or paths returned');
  const row = stored()[0];
  assertEquals(row.geo_source, 'photo_exif');
  assertEquals(row.user_id, USER.id);
  assertMatch(String(row.photo_path), new RegExp(`^${USER.id}/[0-9a-f-]{36}\\.jpg$`));
  assert(db.files[`machinery-photos/${row.photo_path}`], 'photo stored in the private bucket');
  const list = await (await call({ action: 'list' })).json();
  assertEquals(list.entries.length, 1);
  assert(!('live_lat' in list.entries[0]), 'list has no coordinates');
});

Deno.test('rejects a photo over 400 KB and stores nothing', async () => {
  setup();
  const big = pad(photo(), MAX_PHOTO_BYTES + 10);
  const res = await save(big);
  assertEquals(res.status, 413);
  assertMatch((await res.json()).error, /400 KB/);
  assertEquals(stored().length, 0);
  assertEquals(Object.keys(db.files).length, 0);
});

Deno.test('accepts a photo just under 400 KB', async () => {
  setup();
  assertEquals((await save(pad(photo(), MAX_PHOTO_BYTES - 70000))).status, 200);
});

Deno.test('rejects a photo without GPS tags', async () => {
  setup();
  const res = await save(bare);
  assertEquals(res.status, 422);
  assertEquals((await res.json()).problems, ['no_photo_gps']);
});

Deno.test('rejects a photo without DateTimeOriginal', async () => {
  setup();
  const res = await save(photo({ noTime: true }));
  assertEquals(res.status, 422);
  assertEquals((await res.json()).problems, ['no_photo_time']);
});

Deno.test('rejects a photo taken more than 150 m away', async () => {
  setup();
  const res = await save(photo({ at: { lat: 28.4640, lng: 77.0266 } }));
  assertEquals(res.status, 422);
  assertEquals((await res.json()).problems, ['too_far']);
});

Deno.test('rejects a photo older than 30 minutes, and a stale or weak location', async () => {
  setup();
  assertEquals((await (await save(photo({ minutesAgo: 45 }))).json()).problems, ['old_photo']);
  const res = await save(photo(), { live: live({ at: new Date(Date.now() - 10 * 60000).toISOString(), accuracy: 400 }) });
  assertEquals((await res.json()).problems, ['stale_location', 'weak_location']);
  assertEquals(stored().length, 0);
});

Deno.test('needs a voice description and a machine type', async () => {
  setup();
  assertEquals((await save(photo(), { transcript: 'hi' })).status, 400);
  assertEquals((await save(photo(), { fields: { ...fields, machineType: '' } })).status, 400);
});

Deno.test('refuses the same photo twice and removes the second upload', async () => {
  setup();
  const p = photo();
  assertEquals((await save(p)).status, 200);
  assertEquals((await save(p)).status, 409);
  assertEquals(stored().length, 1);
  assertEquals(Object.keys(db.files).length, 1);
});

Deno.test('caps entries per day', async () => {
  setup();
  db.tables.machinery_entries = Array.from({ length: 20 }, (_, i) => ({ id: String(i), user_id: USER.id, photo_sha256: String(i), created_at: new Date().toISOString() }));
  assertEquals((await save(photo())).status, 429);
});

Deno.test('a failed insert leaves no photo behind', async () => {
  setup();
  db.failInsert = { code: 'XX000' };
  assertEquals((await save(photo())).status, 500);
  assertEquals(Object.keys(db.files).length, 0);
});
