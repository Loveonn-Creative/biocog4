// Machinery beta (test only; pending migration 20261031100000). The only
// writer of machinery_entries and the private machinery-photos bucket.
// Switched off unless the MACHINERY_BETA_ENABLED secret is 'true'.
//
// save: needs a fresh, precise live location, a JPEG of the machine from a GPS
// camera app (at most MAX_PHOTO_KB) whose EXIF GPS position is within
// MAX_DISTANCE_M of that location and whose DateTimeOriginal is within
// MAX_PHOTO_AGE_MIN, and a voice description. All checks run again here from
// the photo's bytes (_shared/machineryBeta.ts). Entries are
// stored Unverified and nothing here can change that.
// list: the caller's own entries, without coordinates or photo paths.
// Coordinates are never logged.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkEvidence, readExifGps, validateFields, MAX_ENTRIES_PER_DAY, MAX_PHOTO_BYTES, MAX_PHOTO_KB, PROBLEM_TEXT, type LiveFix,
} from '../_shared/machineryBeta.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const MISSING = new Set(['42P01', 'PGRST205']);
const NOT_OPEN = { error: 'This beta is closed.', code: 'not_open' };
const BUCKET = 'machinery-photos';
const TOO_BIG = { error: `Photo must be a JPEG under ${MAX_PHOTO_KB} KB.` };
const PUBLIC_COLUMNS = 'id, machine_type, make_model, rated_power, power_unit, fuel, hours_per_day, distance_m, geo_source, status, created_at';

function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (Deno.env.get('MACHINERY_BETA_ENABLED') !== 'true') return json(NOT_OPEN, 403);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in first.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const { data: { user }, error: authError } = await createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    if (body?.action !== 'save') {
      const { data, error } = await admin.from('machinery_entries').select(PUBLIC_COLUMNS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (error && MISSING.has(error.code ?? '')) return json(NOT_OPEN, 403);
      if (error) return json({ error: 'Could not load your machines.' }, 500);
      return json({ entries: data ?? [] });
    }

    // ---- save ----
    const v = validateFields({ ...(body?.fields ?? {}), transcript: body?.transcript });
    if (!v.ok) return json({ error: v.error }, 400);
    const l = body?.live ?? {};
    const live: LiveFix | null = [l.lat, l.lng, l.accuracy].every((x) => typeof x === 'number') && typeof l.at === 'string'
      ? { lat: l.lat, lng: l.lng, accuracy: l.accuracy, at: l.at } : null;

    if (typeof body?.photo !== 'string' || !body.photo) return json({ error: 'Upload a photo of the machine.' }, 400);
    if (body.photo.length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 64) return json(TOO_BIG, 413);
    const bytes = b64ToBytes(body.photo);
    if (bytes && bytes.length > MAX_PHOTO_BYTES) return json(TOO_BIG, 413);
    if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return json({ error: 'Use a JPEG photo.' }, 400);
    const tz = Number(body?.tzOffsetMin);
    const tags = readExifGps(bytes, Number.isFinite(tz) && Math.abs(tz) <= 14 * 60 ? tz : null);
    const evidence = checkEvidence(tags, live, new Date());
    if (!evidence.ok || !tags || !live || !tags.takenAt) {
      return json({ error: evidence.problems.map((p) => PROBLEM_TEXT[p]).join(' '), problems: evidence.problems, distanceM: evidence.distanceM, photoAgeMin: evidence.photoAgeMin }, 422);
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countError } = await admin.from('machinery_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
    if (countError && MISSING.has(countError.code ?? '')) return json(NOT_OPEN, 403);
    if (countError) return json({ error: 'Could not save. Try again.' }, 500);
    if ((count ?? 0) >= MAX_ENTRIES_PER_DAY) return json({ error: `Up to ${MAX_ENTRIES_PER_DAY} machines a day in the beta.` }, 429);

    const sha = hex(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: upError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (upError) { console.error('machinery-beta: photo upload failed'); return json({ error: 'Could not save the photo. Try again.' }, 500); }

    const f = v.fields;
    const { data: row, error: insError } = await admin.from('machinery_entries').insert({
      user_id: user.id, machine_type: f.machineType, make_model: f.makeModel, rated_power: f.ratedPower, power_unit: f.powerUnit,
      fuel: f.fuel, hours_per_day: f.hoursPerDay, voice_transcript: v.transcript,
      photo_path: path, photo_sha256: sha, photo_taken_at: tags.takenAt, photo_lat: tags.lat, photo_lng: tags.lng,
      live_lat: live.lat, live_lng: live.lng, live_accuracy_m: live.accuracy, live_at: live.at,
      distance_m: evidence.distanceM, geo_source: 'photo_exif',
    }).select(PUBLIC_COLUMNS).single();
    if (insError) {
      await admin.storage.from(BUCKET).remove([path]);
      if (insError.code === '23505') return json({ error: 'This photo is already saved.' }, 409);
      console.error('machinery-beta: insert failed', insError.code);
      return json({ error: 'Could not save. Try again.' }, 500);
    }
    return json({ entry: row, photoAgeMin: evidence.photoAgeMin });
  } catch (e) {
    console.error('machinery-beta: unexpected error', e instanceof Error ? e.name : 'unknown');
    return json({ error: 'Could not save. Try again.' }, 500);
  }
});
