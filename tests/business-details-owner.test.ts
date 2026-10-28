import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { changedProfileColumns } from '../src/lib/profileSave';

// Owner rule: business name and GSTIN are edited in Settings only, so a stale
// Profile tab can never overwrite them.
const profile = readFileSync(new URL('../src/pages/Profile.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8');

const profileSavePayload = () => {
  const start = profile.indexOf('saveProfileFields(');
  expect(start).toBeGreaterThan(-1);
  return profile.slice(start, profile.indexOf('});', start));
};

describe('business name and GSTIN live in Settings', () => {
  test('Profile save payload has no business_name or gstin', () => {
    const payload = profileSavePayload();
    expect(payload).not.toMatch(/business_name/);
    expect(payload).not.toMatch(/gstin/);
    expect(payload).toMatch(/phone: profile\.phone/);
  });

  test('Profile has no editable business name or GSTIN inputs', () => {
    expect(profile).not.toMatch(/id="business_name"/);
    expect(profile).not.toMatch(/id="gstin"/);
    expect(profile).not.toMatch(/business_name:\s*e\.target/);
  });

  test('Profile shows them read-only with one link to Settings', () => {
    expect(profile).toMatch(/<Label>Business<\/Label>/);
    expect(profile).toMatch(/<Label>GSTIN<\/Label>/);
    expect(profile).toMatch(/'Not added'/);
    expect(profile).toMatch(/to="\/settings#company-profile"[^>]*>Edit in Settings<\/Link>/);
    expect(settings).toMatch(/id="company-profile"/);
  });

  test('Settings still edits both and saves only what changed', () => {
    expect(settings).toMatch(/id="businessName"/);
    expect(settings).toMatch(/id="gstin"/);
    expect(settings).toMatch(/changedProfileColumns\(profile, changedKeys, PROFILE_COLUMNS\)/);
  });
});

describe('changedProfileColumns', () => {
  const columns = { businessName: 'business_name', gstin: 'gstin', sector: 'sector' } as const;
  const values = { businessName: 'Rao Textiles', gstin: '27AAPFU0939F1ZV', sector: 'textiles', exportsToEU: true };

  test('sends only the changed fields that have a column', () => {
    expect(changedProfileColumns(values, ['gstin', 'exportsToEU'], columns)).toEqual({ gstin: '27AAPFU0939F1ZV' });
  });
  test('nothing changed sends nothing', () => {
    expect(changedProfileColumns(values, [], columns)).toEqual({});
  });
});
