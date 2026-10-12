/**
 * Organisation profile and team facts shared by the Team, Subscription and Profile pages.
 *
 * The profile is stored on the existing `organizations` row: `name` plus
 * `metadata.profile`. The owner can already update that row under the current
 * RLS policy, so no database change is needed.
 */

export interface OrganizationProfile {
  name: string;
  taxId: string;
  sector: string;
  country: string;
  size: string;
  website: string;
}

export const COMPANY_SECTORS = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'textile', label: 'Textile & Apparel' },
  { value: 'food_processing', label: 'Food Processing' },
  { value: 'chemicals', label: 'Chemicals & Pharma' },
  { value: 'logistics', label: 'Logistics & Transport' },
  { value: 'construction', label: 'Construction' },
  { value: 'services', label: 'Services' },
  { value: 'retail', label: 'Retail & Trading' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

export const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (<10 employees)' },
  { value: 'small', label: 'Small (10-50 employees)' },
  { value: 'medium', label: 'Medium (50-250 employees)' },
  { value: 'large', label: 'Large (>250 employees)' },
];

const asText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Reads the profile from an organizations row, tolerating missing or malformed metadata. */
export function readOrganizationProfile(org: { name?: string | null; metadata?: unknown } | null | undefined): OrganizationProfile {
  const meta = org?.metadata && typeof org.metadata === 'object' && !Array.isArray(org.metadata)
    ? (org.metadata as Record<string, unknown>)
    : {};
  const p = meta.profile && typeof meta.profile === 'object' && !Array.isArray(meta.profile)
    ? (meta.profile as Record<string, unknown>)
    : {};
  return {
    name: asText(org?.name, 120),
    taxId: asText(p.taxId, 20),
    sector: COMPANY_SECTORS.some(s => s.value === p.sector) ? (p.sector as string) : '',
    country: asText(p.country, 80),
    size: COMPANY_SIZES.some(s => s.value === p.size) ? (p.size as string) : '',
    website: asText(p.website, 200),
  };
}

/** Returns a field-keyed error map; empty when the profile can be saved. */
export function validateOrganizationProfile(p: OrganizationProfile): Partial<Record<keyof OrganizationProfile, string>> {
  const errors: Partial<Record<keyof OrganizationProfile, string>> = {};
  if (!p.name.trim()) errors.name = 'Enter the organisation name.';
  else if (p.name.trim().length > 120) errors.name = 'Keep the name under 120 characters.';
  if (p.taxId && !/^[A-Z0-9-]{5,20}$/.test(p.taxId.trim().toUpperCase())) {
    errors.taxId = 'Use 5 to 20 letters, digits or dashes.';
  }
  if (p.website && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(p.website.trim())) {
    errors.website = 'Start with https:// and include the domain.';
  }
  return errors;
}

/**
 * Builds the update for the organizations row. Other metadata keys are kept so
 * nothing written by other features is lost.
 */
export function buildOrganizationUpdate(existingMetadata: unknown, p: OrganizationProfile) {
  const base = existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
    ? (existingMetadata as Record<string, unknown>)
    : {};
  return {
    name: p.name.trim(),
    metadata: {
      ...base,
      profile: {
        taxId: p.taxId.trim().toUpperCase(),
        sector: p.sector,
        country: p.country,
        size: p.size,
        website: p.website.trim(),
      },
    },
  };
}

export const isOrganizationProfileEmpty = (p: OrganizationProfile) =>
  !p.taxId && !p.sector && !p.country && !p.size && !p.website;

/** Team seats per plan, as published on the Pricing page. */
export const PLAN_TEAM_SEATS: Record<string, number | 'quote'> = {
  snapshot: 1,
  essential: 3,
  basic: 3,
  pro: 10,
  scale: 'quote', // seats on the customer's Scale quote, at least 10
};

export function planSeatsLabel(tier: string): string {
  const seats = PLAN_TEAM_SEATS[tier] ?? 1;
  if (seats === 'quote') return 'Team seats set in your Scale quote';
  return `${seats} team member${seats === 1 ? '' : 's'}`;
}

/** Plans that include more than one seat, so the Team page is useful. */
export const planIncludesTeam = (tier: string) => (PLAN_TEAM_SEATS[tier] ?? 1) !== 1;

/**
 * What each role can do today. Only permissions the database enforces are
 * listed; carbon records are not shared between members yet.
 */
export { LEGACY_ROLE_DESCRIPTIONS as ROLE_DESCRIPTIONS } from './teamRoles';

export const TEAM_SHARING_NOTE =
  'Each member\'s uploads, verified records and reports stay in their own account. Shared organisation records are not live yet.';
