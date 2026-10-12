import { describe, expect, test } from 'bun:test';
import {
  buildOrganizationUpdate,
  isOrganizationProfileEmpty,
  planIncludesTeam,
  planSeatsLabel,
  readOrganizationProfile,
  validateOrganizationProfile,
  ROLE_DESCRIPTIONS,
} from '../src/lib/organizationProfile';

describe('organisation profile', () => {
  test('reads safely from missing or malformed metadata', () => {
    expect(readOrganizationProfile(null).name).toBe('');
    expect(readOrganizationProfile({ name: 'Acme', metadata: [] })).toEqual({
      name: 'Acme', taxId: '', sector: '', country: '', size: '', website: '',
    });
    const p = readOrganizationProfile({ name: 'Acme', metadata: { profile: { sector: 'not-a-sector', size: 'small', taxId: 42 } } });
    expect(p.sector).toBe('');
    expect(p.size).toBe('small');
    expect(p.taxId).toBe('');
    expect(isOrganizationProfileEmpty(p)).toBe(false);
  });

  test('keeps unrelated metadata keys when saving', () => {
    const update = buildOrganizationUpdate(
      { billing: { po: 'X1' }, profile: { taxId: 'OLD' } },
      { name: '  Acme Steel ', taxId: '27abcde1234f1z5', sector: 'manufacturing', country: 'India', size: 'small', website: '' },
    );
    expect(update.name).toBe('Acme Steel');
    expect(update.metadata.billing).toEqual({ po: 'X1' });
    expect(update.metadata.profile.taxId).toBe('27ABCDE1234F1Z5');
  });

  test('validates name, tax ID and website', () => {
    const base = { name: 'Acme', taxId: '', sector: '', country: '', size: '', website: '' };
    expect(validateOrganizationProfile(base)).toEqual({});
    expect(validateOrganizationProfile({ ...base, name: ' ' }).name).toBeDefined();
    expect(validateOrganizationProfile({ ...base, taxId: 'a b' }).taxId).toBeDefined();
    expect(validateOrganizationProfile({ ...base, website: 'acme' }).website).toBeDefined();
    expect(validateOrganizationProfile({ ...base, website: 'https://acme.in' })).toEqual({});
  });
});

describe('team plan facts', () => {
  test('seats match the Pricing page', () => {
    expect(planSeatsLabel('snapshot')).toBe('1 team member');
    expect(planSeatsLabel('essential')).toBe('3 team members');
    expect(planSeatsLabel('basic')).toBe('3 team members');
    expect(planSeatsLabel('pro')).toBe('10 team members');
    expect(planSeatsLabel('scale')).toBe('Team seats set in your Scale quote');
  });

  test('every plan with more than one seat gets the Team page', () => {
    expect(planIncludesTeam('snapshot')).toBe(false);
    expect(['essential', 'basic', 'pro', 'scale'].every(planIncludesTeam)).toBe(true);
  });

  test('role text does not promise shared records', () => {
    for (const text of Object.values(ROLE_DESCRIPTIONS)) {
      expect(text).not.toMatch(/full access|intelligence|all features|dashboard and reports/i);
      expect(text).not.toContain('—');
    }
  });
});
