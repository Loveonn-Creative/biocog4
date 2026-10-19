import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  checkEvidence, distanceM, parseMachineSpeech, readExifGps, readRawExif, validateFields, writeExifGps,
  MAX_DISTANCE_M, MAX_PHOTO_AGE_MIN,
} from '../supabase/functions/_shared/machineryBeta';

// Big-endian EXIF built independently (Python struct): 28°27'34.2"N 77°1'35.76"E,
// DateTimeOriginal 2026:10:18 18:05:00 with OffsetTimeOriginal +05:30, no GPS time.
const fixture = new Uint8Array(readFileSync(join(import.meta.dir, 'fixtures/machinery-exif-be.jpg')));
const bareJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xda, 0, 2, 0, 0, 0xff, 0xd9]);

describe('EXIF GPS reader', () => {
  test('reads a big-endian GPS block and DateTimeOriginal with its offset', () => {
    const tags = readExifGps(fixture)!;
    expect(tags.lat).toBeCloseTo(28.4595, 6);
    expect(tags.lng).toBeCloseTo(77.0266, 6);
    expect(tags.takenAt).toBe('2026-10-18T12:35:00.000Z');
    expect(readRawExif(fixture)).toMatchObject({ dateTimeOriginal: '2026:10:18 18:05:00', offsetTime: '+05:30' });
  });

  test('returns null when the photo has no EXIF', () => {
    expect(readExifGps(bareJpeg)).toBeNull();
    expect(readExifGps(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  test('carries GPS, DateTimeOriginal and offset into a re-encoded JPEG, south and west', () => {
    const raw = { lat: -33.8688, lng: -151.2093, dateTimeOriginal: '2026:10:18 09:41:27', offsetTime: '-03:00' };
    const out = writeExifGps(bareJpeg, raw);
    expect(readRawExif(out)!.dateTimeOriginal).toBe(raw.dateTimeOriginal);
    const tags = readExifGps(out)!;
    expect(tags.lat).toBeCloseTo(-33.8688, 5);
    expect(tags.lng).toBeCloseTo(-151.2093, 5);
    expect(tags.takenAt).toBe('2026-10-18T12:41:27.000Z');
    // The image data after the metadata is kept.
    expect(Array.from(out.slice(-8))).toEqual(Array.from(bareJpeg.slice(-8)));
  });

  test('a photo read from a GPS camera app survives a rewrite unchanged', () => {
    const raw = readRawExif(fixture)!;
    const again = readRawExif(writeExifGps(bareJpeg, raw))!;
    expect(again.lat).toBeCloseTo(raw.lat, 6);
    expect(again.lng).toBeCloseTo(raw.lng, 6);
    expect(again.dateTimeOriginal).toBe(raw.dateTimeOriginal);
    expect(again.offsetTime).toBe(raw.offsetTime);
  });

  test('without an offset tag the device offset is used; without DateTimeOriginal there is no time', () => {
    const noOffset = writeExifGps(bareJpeg, { lat: 19.076, lng: 72.8777, dateTimeOriginal: '2026:10:18 18:05:00', offsetTime: null });
    expect(readExifGps(noOffset, 330)!.takenAt).toBe('2026-10-18T12:35:00.000Z');
    expect(readExifGps(noOffset, null)!.takenAt).toBeNull();
    const noTime = writeExifGps(bareJpeg, { lat: 19.076, lng: 72.8777, dateTimeOriginal: null, offsetTime: null });
    expect(readExifGps(noTime, 330)).toMatchObject({ lat: expect.any(Number), takenAt: null });
  });

  test('writer replaces an existing Exif block', () => {
    const tags = readExifGps(writeExifGps(fixture, { lat: 19.076, lng: 72.8777, dateTimeOriginal: '2026:10:18 10:00:00', offsetTime: '+00:00' }))!;
    expect(tags.lat).toBeCloseTo(19.076, 5);
    expect(tags.takenAt).toBe('2026-10-18T10:00:00.000Z');
  });

  test('survives a truncated file', () => {
    expect(() => readExifGps(fixture.slice(0, 60))).not.toThrow();
  });
});

describe('distance and age check', () => {
  const now = new Date('2026-10-18T12:40:00Z');
  const photo = { lat: 28.4595, lng: 77.0266, takenAt: '2026-10-18T12:35:00.000Z' };
  const live = { lat: 28.4600, lng: 77.0266, accuracy: 20, at: '2026-10-18T12:39:30Z' };

  test('distance is right to the metre', () => {
    expect(Math.round(distanceM({ lat: 28.4595, lng: 77.0266 }, { lat: 28.4600, lng: 77.0266 }))).toBe(56);
  });

  test('passes a fresh photo near a fresh, precise fix', () => {
    const r = checkEvidence(photo, live, now);
    expect(r).toEqual({ ok: true, distanceM: 56, photoAgeMin: 5, problems: [] });
  });

  test('rejects a photo taken too far away', () => {
    const r = checkEvidence({ ...photo, lat: 28.4595 + (MAX_DISTANCE_M + 50) / 111195 }, { ...live, lat: 28.4595 }, now);
    expect(r.problems).toEqual(['too_far']);
  });

  test('rejects an old photo, a stale fix and a weak fix', () => {
    const r = checkEvidence(
      { ...photo, takenAt: new Date(now.getTime() - (MAX_PHOTO_AGE_MIN + 1) * 60000).toISOString() },
      { ...live, at: '2026-10-18T12:30:00Z', accuracy: 500 }, now,
    );
    expect(r.problems).toEqual(['stale_location', 'weak_location', 'old_photo']);
  });

  test('needs location, photo GPS and photo time', () => {
    expect(checkEvidence(null, null, now).problems).toEqual(['no_location', 'no_photo_gps']);
    expect(checkEvidence({ ...photo, takenAt: null }, live, now).problems).toEqual(['no_photo_time']);
    expect(checkEvidence(photo, { ...live, lat: 0, lng: 0 }, now).problems).toContain('no_location');
  });
});

describe('voice to fields', () => {
  test('reads a generator description', () => {
    expect(parseMachineSpeech('Diesel generator, make Kirloskar 125 kVA, runs 6 hours a day')).toEqual({
      machineType: 'Generator', makeModel: 'Kirloskar', ratedPower: 125, powerUnit: 'kVA', fuel: 'diesel', hoursPerDay: 6,
    });
  });

  test('reads spoken numbers and horsepower', () => {
    const f = parseMachineSpeech('electric motor brand Crompton fifteen horse power running twenty four hours per day');
    expect(f).toMatchObject({ machineType: 'Motor', makeModel: 'Crompton', ratedPower: 15, powerUnit: 'HP', fuel: 'electricity', hoursPerDay: 24 });
  });

  test('boiler on furnace oil in kW', () => {
    expect(parseMachineSpeech('boiler on furnace oil 1,200 kW 16 hrs daily')).toMatchObject({ machineType: 'Boiler', fuel: 'furnace_oil', ratedPower: 1200, powerUnit: 'kW', hoursPerDay: 16 });
  });

  test('leaves unknown parts empty and rejects impossible hours', () => {
    expect(parseMachineSpeech('this one is big and old 30 hours a day')).toEqual({ machineType: '', makeModel: '', ratedPower: null, powerUnit: null, fuel: null, hoursPerDay: null });
  });
});

describe('field validation', () => {
  const base = { transcript: 'diesel generator 125 kVA', machineType: 'Generator', makeModel: 'Kirloskar', ratedPower: 125, powerUnit: 'kVA', fuel: 'diesel', hoursPerDay: 6 };
  test('accepts a complete entry and strips markup', () => {
    const r = validateFields({ ...base, makeModel: '<b>Kirloskar</b>' });
    expect(r.ok && r.fields.makeModel).toBe('b Kirloskar /b');
  });
  test('needs a voice description and a machine type', () => {
    expect(validateFields({ ...base, transcript: 'hi' })).toEqual({ ok: false, error: 'Describe the machine by voice.' });
    expect(validateFields({ ...base, machineType: '' })).toEqual({ ok: false, error: 'Add the machine type.' });
  });
  test('rejects bad units, fuels and hours, and power without a unit', () => {
    expect(validateFields({ ...base, powerUnit: 'MW' }).ok).toBe(false);
    expect(validateFields({ ...base, fuel: 'uranium' }).ok).toBe(false);
    expect(validateFields({ ...base, hoursPerDay: 25 }).ok).toBe(false);
    expect(validateFields({ ...base, powerUnit: null }).ok).toBe(false);
  });
});
