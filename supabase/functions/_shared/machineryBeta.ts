// Machinery beta (test only): a signed-in user adds a machine's details with
// live location on, a geo-tagged photo of the machine taken now, and voice
// input. Shared by the page (src/pages/MachineryBeta.tsx) and the
// machinery-beta edge function, which repeats every check on the server.
// Entries are always Unverified; only a matching document or an IoT, sensor
// or live feed could verify one later, and nothing here can.
// Pure: no Deno or Supabase imports.

export const MAX_DISTANCE_M = 150;
export const MAX_PHOTO_AGE_MIN = 30;
export const MAX_FIX_AGE_MS = 2 * 60 * 1000;
export const MAX_ACCURACY_M = 100;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_ENTRIES_PER_DAY = 20;

export const POWER_UNITS = ['kW', 'HP', 'kVA', 'TR'] as const;
export type PowerUnit = (typeof POWER_UNITS)[number];
export const FUELS = ['electricity', 'diesel', 'petrol', 'lpg', 'png', 'cng', 'furnace_oil', 'coal', 'biomass', 'other'] as const;
export type Fuel = (typeof FUELS)[number];
export const FUEL_LABELS: Record<Fuel, string> = {
  electricity: 'Electricity', diesel: 'Diesel', petrol: 'Petrol', lpg: 'LPG', png: 'PNG', cng: 'CNG',
  furnace_oil: 'Furnace oil', coal: 'Coal', biomass: 'Biomass', other: 'Other',
};

export interface GeoPoint { lat: number; lng: number }
export interface PhotoTags extends GeoPoint { takenAt: string | null }
export interface LiveFix extends GeoPoint { accuracy: number; at: string }

export interface MachineFields {
  machineType: string;
  makeModel: string;
  ratedPower: number | null;
  powerUnit: PowerUnit | null;
  fuel: Fuel | null;
  hoursPerDay: number | null;
}

const validPoint = (p: GeoPoint) =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0);

/** Great-circle distance in metres. */
export function distanceM(a: GeoPoint, b: GeoPoint): number {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------- EXIF (JPEG APP1) ----------

const TAG_EXIF_IFD = 0x8769, TAG_GPS_IFD = 0x8825, TAG_DATETIME_ORIGINAL = 0x9003, TAG_OFFSET_ORIGINAL = 0x9011;

function findExif(bytes: Uint8Array): number | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) return null; // image data: no more metadata
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) return null;
    if (marker === 0xe1 && i + 10 <= bytes.length &&
        bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66 && bytes[i + 8] === 0 && bytes[i + 9] === 0) {
      return i + 10; // TIFF header
    }
    i += 2 + len;
  }
  return null;
}

/**
 * Reads GPS position and capture time from a JPEG's EXIF. Capture time comes
 * from the GPS UTC stamp, else DateTimeOriginal with its offset, else
 * DateTimeOriginal read with `fallbackOffsetMin` (the device's offset from
 * UTC, minutes east). Returns null when the photo has no usable GPS tags.
 */
export function readExifGps(bytes: Uint8Array, fallbackOffsetMin: number | null = null): PhotoTags | null {
  const t = findExif(bytes);
  if (t === null || t + 8 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const le = bytes[t] === 0x49 && bytes[t + 1] === 0x49;
  if (!le && !(bytes[t] === 0x4d && bytes[t + 1] === 0x4d)) return null;
  const u16 = (o: number) => view.getUint16(t + o, le);
  const u32 = (o: number) => view.getUint32(t + o, le);
  const inRange = (o: number, n: number) => o >= 0 && t + o + n <= bytes.length;
  if (u16(2) !== 42) return null;

  type Entry = { type: number; count: number; valueOff: number };
  const ifd = (off: number): Map<number, Entry> | null => {
    if (!inRange(off, 2)) return null;
    const n = u16(off);
    if (n > 512 || !inRange(off + 2, n * 12)) return null;
    const m = new Map<number, Entry>();
    for (let k = 0; k < n; k++) {
      const e = off + 2 + k * 12;
      const type = u16(e + 2), count = u32(e + 4);
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 0;
      const valueOff = size * count <= 4 ? e + 8 : u32(e + 8);
      m.set(u16(e), { type, count, valueOff });
    }
    return m;
  };
  const ascii = (e?: Entry) => {
    if (!e || e.type !== 2 || !inRange(e.valueOff, e.count)) return null;
    let s = '';
    for (let k = 0; k < e.count; k++) { const c = bytes[t + e.valueOff + k]; if (!c) break; s += String.fromCharCode(c); }
    return s;
  };
  const rationals = (e: Entry | undefined, n: number) => {
    if (!e || e.type !== 5 || e.count < n || !inRange(e.valueOff, n * 8)) return null;
    const out: number[] = [];
    for (let k = 0; k < n; k++) {
      const den = u32(e.valueOff + k * 8 + 4);
      if (!den) return null;
      out.push(u32(e.valueOff + k * 8) / den);
    }
    return out;
  };

  const ifd0 = ifd(u32(4));
  const gpsPtr = ifd0?.get(TAG_GPS_IFD);
  if (!ifd0 || !gpsPtr) return null;
  const gps = ifd(u32(gpsPtr.valueOff));
  if (!gps) return null;
  const lat = rationals(gps.get(2), 3), lng = rationals(gps.get(4), 3);
  const latRef = ascii(gps.get(1)), lngRef = ascii(gps.get(3));
  if (!lat || !lng || !latRef || !lngRef) return null;
  const dms = (v: number[]) => v[0] + v[1] / 60 + v[2] / 3600;
  const point = { lat: dms(lat) * (latRef.toUpperCase() === 'S' ? -1 : 1), lng: dms(lng) * (lngRef.toUpperCase() === 'W' ? -1 : 1) };
  if (!validPoint(point)) return null;

  let takenAt: string | null = null;
  const gDate = ascii(gps.get(0x1d)), gTime = rationals(gps.get(0x07), 3);
  const dm = gDate?.match(/^(\d{4}):(\d{2}):(\d{2})$/);
  if (dm && gTime) {
    const ms = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], gTime[0], gTime[1], 0) + Math.round(gTime[2] * 1000);
    if (Number.isFinite(ms)) takenAt = new Date(ms).toISOString();
  }
  if (!takenAt) {
    const exifPtr = ifd0.get(TAG_EXIF_IFD);
    const exif = exifPtr ? ifd(u32(exifPtr.valueOff)) : null;
    const dto = ascii(exif?.get(TAG_DATETIME_ORIGINAL))?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    const off = ascii(exif?.get(TAG_OFFSET_ORIGINAL))?.match(/^([+-])(\d{2}):(\d{2})$/);
    const offsetMin = off ? (off[1] === '-' ? -1 : 1) * (+off[2] * 60 + +off[3]) : fallbackOffsetMin;
    if (dto && offsetMin !== null && Number.isFinite(offsetMin)) {
      const ms = Date.UTC(+dto[1], +dto[2] - 1, +dto[3], +dto[4], +dto[5], +dto[6]) - offsetMin * 60000;
      if (Number.isFinite(ms)) takenAt = new Date(ms).toISOString();
    }
  }
  return { ...point, takenAt };
}

/**
 * Adds an EXIF block (GPS position and UTC time) to a JPEG with no EXIF, as
 * made by an in-page camera capture, so the saved photo carries its own geo
 * tag. Little-endian TIFF. Any existing APP1 Exif segment is replaced.
 */
export function writeExifGps(jpeg: Uint8Array, tag: GeoPoint & { at: Date }): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('not a JPEG');
  const ifd0Count = 1, gpsCount = 7;
  const ifd0Off = 8, gpsOff = ifd0Off + 2 + ifd0Count * 12 + 4;
  const dataOff = gpsOff + 2 + gpsCount * 12 + 4;
  const tiff = new Uint8Array(dataOff + 3 * 8 * 3 + 11);
  const v = new DataView(tiff.buffer);
  tiff.set([0x49, 0x49]); v.setUint16(2, 42, true); v.setUint32(4, ifd0Off, true);
  v.setUint16(ifd0Off, ifd0Count, true);
  const entry = (at: number, id: number, type: number, count: number, value: number, inline = false, bytes?: number[]) => {
    v.setUint16(at, id, true); v.setUint16(at + 2, type, true); v.setUint32(at + 4, count, true);
    if (inline && bytes) bytes.forEach((b, k) => { tiff[at + 8 + k] = b; }); else v.setUint32(at + 8, value, true);
  };
  entry(ifd0Off + 2, TAG_GPS_IFD, 4, 1, gpsOff);
  v.setUint32(ifd0Off + 2 + 12, 0, true);
  const dmsOf = (x: number) => { const a = Math.abs(x), d = Math.floor(a), m = Math.floor((a - d) * 60); return [d, m, (a - d - m / 60) * 3600]; };
  let p = dataOff;
  const rat = (vals: number[], dens: number[]) => {
    const at = p;
    vals.forEach((x, k) => { v.setUint32(p, Math.round(x * dens[k]), true); v.setUint32(p + 4, dens[k], true); p += 8; });
    return at;
  };
  const latAt = rat(dmsOf(tag.lat), [1, 1, 10000]);
  const lngAt = rat(dmsOf(tag.lng), [1, 1, 10000]);
  const d = tag.at;
  const timeAt = rat([d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()], [1, 1, 1]);
  const dateAt = p;
  const ds = `${d.getUTCFullYear()}:${String(d.getUTCMonth() + 1).padStart(2, '0')}:${String(d.getUTCDate()).padStart(2, '0')}\0`;
  for (let k = 0; k < ds.length; k++) tiff[p + k] = ds.charCodeAt(k);
  let g = gpsOff + 2;
  v.setUint16(gpsOff, gpsCount, true);
  const ch = (s: string) => [s.charCodeAt(0), 0, 0, 0];
  entry(g, 0, 1, 4, 0, true, [2, 3, 0, 0]); g += 12; // GPSVersionID 2.3
  entry(g, 1, 2, 2, 0, true, ch(tag.lat < 0 ? 'S' : 'N')); g += 12;
  entry(g, 2, 5, 3, latAt); g += 12;
  entry(g, 3, 2, 2, 0, true, ch(tag.lng < 0 ? 'W' : 'E')); g += 12;
  entry(g, 4, 5, 3, lngAt); g += 12;
  entry(g, 7, 5, 3, timeAt); g += 12;
  entry(g, 0x1d, 2, 11, dateAt); g += 12;
  v.setUint32(g, 0, true);

  // Drop an existing Exif APP1, keep everything else.
  const rest: Uint8Array[] = [];
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff && jpeg[i + 1] !== 0xda) {
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    const isExif = jpeg[i + 1] === 0xe1 && jpeg[i + 4] === 0x45 && jpeg[i + 5] === 0x78 && jpeg[i + 6] === 0x69 && jpeg[i + 7] === 0x66;
    if (!isExif) rest.push(jpeg.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  rest.push(jpeg.subarray(i));
  const segLen = 2 + 6 + tiff.length;
  const app1 = new Uint8Array(2 + segLen);
  app1.set([0xff, 0xe1, segLen >> 8, segLen & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  app1.set(tiff, 10);
  const total = 2 + app1.length + rest.reduce((n, r) => n + r.length, 0);
  const out = new Uint8Array(total);
  out.set([0xff, 0xd8]); let o = 2;
  out.set(app1, o); o += app1.length;
  for (const r of rest) { out.set(r, o); o += r.length; }
  return out;
}

// ---------- evidence check ----------

export type EvidenceProblem = 'no_location' | 'stale_location' | 'weak_location' | 'no_photo_gps' | 'no_photo_time' | 'old_photo' | 'future_photo' | 'too_far';

export interface EvidenceResult {
  ok: boolean;
  distanceM: number | null;
  photoAgeMin: number | null;
  problems: EvidenceProblem[];
}

/** Photo must be taken within MAX_PHOTO_AGE_MIN, within MAX_DISTANCE_M of a fresh, accurate live fix. */
export function checkEvidence(photo: PhotoTags | null, live: LiveFix | null, now: Date): EvidenceResult {
  const problems: EvidenceProblem[] = [];
  const nowMs = now.getTime();
  if (!live || !validPoint(live) || !Number.isFinite(Date.parse(live.at))) problems.push('no_location');
  else {
    const age = nowMs - Date.parse(live.at);
    if (age > MAX_FIX_AGE_MS || age < -60000) problems.push('stale_location');
    if (!(live.accuracy > 0) || live.accuracy > MAX_ACCURACY_M) problems.push('weak_location');
  }
  let photoAgeMin: number | null = null;
  if (!photo) problems.push('no_photo_gps');
  else if (!photo.takenAt || !Number.isFinite(Date.parse(photo.takenAt))) problems.push('no_photo_time');
  else {
    photoAgeMin = (nowMs - Date.parse(photo.takenAt)) / 60000;
    if (photoAgeMin > MAX_PHOTO_AGE_MIN) problems.push('old_photo');
    if (photoAgeMin < -2) problems.push('future_photo');
  }
  const d = photo && live && validPoint(live) ? distanceM(photo, live) : null;
  if (d !== null && d > MAX_DISTANCE_M) problems.push('too_far');
  return { ok: problems.length === 0, distanceM: d === null ? null : Math.round(d), photoAgeMin: photoAgeMin === null ? null : Math.round(photoAgeMin * 10) / 10, problems };
}

export const PROBLEM_TEXT: Record<EvidenceProblem, string> = {
  no_location: 'Turn on location.',
  stale_location: 'Location is old. Refresh it.',
  weak_location: `Location is not precise enough (needs ${MAX_ACCURACY_M} m or better).`,
  no_photo_gps: 'Photo has no location tag.',
  no_photo_time: 'Photo has no time tag.',
  old_photo: `Photo is older than ${MAX_PHOTO_AGE_MIN} minutes.`,
  future_photo: 'Photo time is ahead of now.',
  too_far: `Photo was taken more than ${MAX_DISTANCE_M} m from you.`,
};

// ---------- voice to fields ----------

const WORD_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, sixteen: 16, eighteen: 18, twenty: 20, 'twenty four': 24, thirty: 30, fifty: 50, hundred: 100,
};
const MACHINE_TYPES: Array<[RegExp, string]> = [
  [/\b(diesel generator|dg set|d g set|genset|generator)\b/, 'Generator'],
  [/\bboiler\b/, 'Boiler'],
  [/\b(air compressor|compressor)\b/, 'Compressor'],
  [/\b(furnace|kiln)\b/, 'Furnace'],
  [/\b(motor)\b/, 'Motor'],
  [/\b(pump)\b/, 'Pump'],
  [/\b(chiller)\b/, 'Chiller'],
  [/\b(air conditioner|ac unit|hvac)\b/, 'Air conditioner'],
  [/\b(injection moulding|injection molding|moulding machine|molding machine)\b/, 'Moulding machine'],
  [/\b(cnc|lathe|milling)\b/, 'CNC machine'],
  [/\b(loom)\b/, 'Loom'],
  [/\b(welding|welder)\b/, 'Welding machine'],
  [/\b(forklift)\b/, 'Forklift'],
  [/\b(dryer|drier)\b/, 'Dryer'],
  [/\b(press)\b/, 'Press'],
];
const FUEL_WORDS: Array<[RegExp, Fuel]> = [
  [/\b(furnace oil|fo|lshs|ldo)\b/, 'furnace_oil'],
  [/\b(diesel|hsd)\b/, 'diesel'],
  [/\b(petrol|gasoline)\b/, 'petrol'],
  [/\b(lpg)\b/, 'lpg'],
  [/\b(png|piped gas|natural gas)\b/, 'png'],
  [/\b(cng)\b/, 'cng'],
  [/\b(coal|lignite|pet coke|petcoke)\b/, 'coal'],
  [/\b(biomass|briquette|briquettes|wood|husk|bagasse)\b/, 'biomass'],
  [/\b(electric|electricity|grid power|power supply)\b/, 'electricity'],
];

function wordsToDigits(s: string): string {
  let out = s;
  for (const [w, n] of Object.entries(WORD_NUM).sort((a, b) => b[0].length - a[0].length)) out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), String(n));
  return out;
}

/** Turns a spoken description into editable fields. Unknown parts stay empty. */
export function parseMachineSpeech(transcript: string): MachineFields {
  const raw = transcript.trim().replace(/\s+/g, ' ');
  const s = wordsToDigits(raw.toLowerCase()).replace(/(\d),(\d)/g, '$1$2');
  const fields: MachineFields = { machineType: '', makeModel: '', ratedPower: null, powerUnit: null, fuel: null, hoursPerDay: null };
  for (const [re, label] of MACHINE_TYPES) if (re.test(s)) { fields.machineType = label; break; }
  const power = s.match(/(\d+(?:\.\d+)?)\s*(kilo ?watts?|kw|horse ?power|hp|kva|k v a|tons? of refrigeration|tr)\b/);
  if (power) {
    const n = Number(power[1]), u = power[2].replace(/\s/g, '');
    fields.ratedPower = n > 0 && n < 100000 ? n : null;
    fields.powerUnit = /^kva$/.test(u) ? 'kVA' : /^(kw|kilowatts?)$/.test(u) ? 'kW' : /^(hp|horsepower)$/.test(u) ? 'HP' : 'TR';
    if (fields.ratedPower === null) fields.powerUnit = null;
  }
  for (const [re, fuel] of FUEL_WORDS) if (re.test(s)) { fields.fuel = fuel; break; }
  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:a|per|each|every)?\s*(?:day|daily-?)?/);
  if (hours) { const h = Number(hours[1]); fields.hoursPerDay = h >= 0 && h <= 24 ? h : null; }
  const make = wordsToDigits(raw).match(/\b(?:make|brand|model|by)\s+(?:is\s+)?([A-Za-z0-9][\w\- .]{1,60}?)(?=[,.]|\s+(?:rated|with|running|runs|on|uses|of|\d)|$)/i);
  if (make) fields.makeModel = make[1].trim();
  return fields;
}

// ---------- validation ----------

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Validates and normalises the saved fields. Returns the cleaned fields or the first error. */
export function validateFields(input: Partial<Record<keyof MachineFields, unknown>> & { transcript?: unknown }):
  { ok: true; fields: MachineFields; transcript: string } | { ok: false; error: string } {
  const transcript = clean(input.transcript, 1000);
  if (transcript.split(' ').filter(Boolean).length < 3) return { ok: false, error: 'Describe the machine by voice.' };
  const machineType = clean(input.machineType, 80);
  if (machineType.length < 2) return { ok: false, error: 'Add the machine type.' };
  const makeModel = clean(input.makeModel, 120);
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  const ratedPower = num(input.ratedPower);
  if (ratedPower !== null && !(Number.isFinite(ratedPower) && ratedPower > 0 && ratedPower < 100000)) return { ok: false, error: 'Rated power looks wrong.' };
  const powerUnit = input.powerUnit ? String(input.powerUnit) : null;
  if (powerUnit !== null && !(POWER_UNITS as readonly string[]).includes(powerUnit)) return { ok: false, error: 'Pick a power unit.' };
  if ((ratedPower === null) !== (powerUnit === null)) return { ok: false, error: 'Add both rated power and its unit.' };
  const fuel = input.fuel ? String(input.fuel) : null;
  if (fuel !== null && !(FUELS as readonly string[]).includes(fuel)) return { ok: false, error: 'Pick a fuel.' };
  const hoursPerDay = num(input.hoursPerDay);
  if (hoursPerDay !== null && !(Number.isFinite(hoursPerDay) && hoursPerDay >= 0 && hoursPerDay <= 24)) return { ok: false, error: 'Hours per day must be 0 to 24.' };
  return { ok: true, transcript, fields: { machineType, makeModel, ratedPower, powerUnit: powerUnit as PowerUnit | null, fuel: fuel as Fuel | null, hoursPerDay } };
}
