/**
 * Scope 3 supplier ledger.
 *
 * Suppliers are not a separate dataset in this platform — they are derived
 * from the documents a business has already captured and verified. Every
 * figure below is computed from stored records (`compliance_ledger`,
 * `documents`). Where evidence is missing the supplier is reported as a
 * stated gap; nothing is estimated silently and no supplier data is invented.
 */

export type EvidenceTier = 'primary' | 'factor_derived' | 'spend_only' | 'none';

export interface SupplierSourceRecord {
  vendor: string | null;
  invoiceDate: string | null;
  amount: number | null;
  currency: string | null;
  co2Kg: number | null;
  scope: number | null;
  category: string | null;
  hsnCode: string | null;
  factorSource: string | null;
  verificationStatus: string | null;
  documentHash: string | null;
}

export interface SupplierRecord {
  /** Normalised vendor key used for grouping. */
  key: string;
  name: string;
  documentCount: number;
  verifiedCount: number;
  spend: number;
  currency: string;
  co2Kg: number;
  scope3Co2Kg: number;
  categories: string[];
  hsnCodes: string[];
  factorSources: string[];
  firstSeen: string | null;
  lastSeen: string | null;
  tier: EvidenceTier;
  /** Human-readable reasons this supplier is not fully evidenced. */
  gaps: string[];
}

export interface SupplierCoverage {
  suppliers: SupplierRecord[];
  supplierCount: number;
  /** Suppliers with at least one verified, factor-backed record. */
  evidencedCount: number;
  /** Share of supplier spend covered by verified evidence, 0-100. */
  spendCoveragePct: number;
  /** Share of supplier-attributed CO2 that is verified, 0-100. */
  emissionsCoveragePct: number;
  totalSpend: number;
  totalCo2Kg: number;
  verifiedCo2Kg: number;
  gapSuppliers: SupplierRecord[];
  currency: string;
}

const normaliseVendor = (v: string | null | undefined): string =>
  (v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]+$/, '');

const titleCase = (v: string): string =>
  v.replace(/\b\w/g, (c) => c.toUpperCase());

const isVerified = (status: string | null | undefined): boolean =>
  ['verified', 'approved', 'passed'].includes((status || '').toLowerCase());

function tierFor(s: {
  verifiedCount: number;
  hsnCodes: string[];
  factorSources: string[];
  co2Kg: number;
  spend: number;
}): EvidenceTier {
  if (s.verifiedCount > 0 && s.hsnCodes.length > 0 && s.co2Kg > 0) return 'primary';
  if (s.co2Kg > 0 && s.factorSources.length > 0) return 'factor_derived';
  if (s.spend > 0) return 'spend_only';
  return 'none';
}

function gapsFor(s: SupplierRecord): string[] {
  const gaps: string[] = [];
  if (s.documentCount === 0) gaps.push('No document captured for this supplier');
  if (s.verifiedCount === 0 && s.documentCount > 0)
    gaps.push('Documents captured but not yet verified');
  if (s.hsnCodes.length === 0)
    gaps.push('No HSN/CN code on the invoice — category mapped from description only');
  if (s.co2Kg <= 0)
    gaps.push('No emission factor could be applied to this supplier’s line items');
  if (s.factorSources.length === 0 && s.co2Kg > 0)
    gaps.push('Emission factor source not recorded');
  return gaps;
}

export function buildSupplierLedger(records: SupplierSourceRecord[]): SupplierRecord[] {
  const map = new Map<string, SupplierRecord>();

  for (const r of records) {
    const key = normaliseVendor(r.vendor);
    if (!key) continue;

    let s = map.get(key);
    if (!s) {
      s = {
        key,
        name: titleCase(key),
        documentCount: 0,
        verifiedCount: 0,
        spend: 0,
        currency: r.currency || 'INR',
        co2Kg: 0,
        scope3Co2Kg: 0,
        categories: [],
        hsnCodes: [],
        factorSources: [],
        firstSeen: null,
        lastSeen: null,
        tier: 'none',
        gaps: [],
      };
      map.set(key, s);
    }

    s.documentCount += 1;
    if (isVerified(r.verificationStatus)) s.verifiedCount += 1;
    s.spend += Number(r.amount) || 0;
    const co2 = Number(r.co2Kg) || 0;
    s.co2Kg += co2;
    if (r.scope === 3) s.scope3Co2Kg += co2;
    if (r.category && !s.categories.includes(r.category)) s.categories.push(r.category);
    if (r.hsnCode && !s.hsnCodes.includes(r.hsnCode)) s.hsnCodes.push(r.hsnCode);
    if (r.factorSource && !s.factorSources.includes(r.factorSource))
      s.factorSources.push(r.factorSource);

    if (r.invoiceDate) {
      if (!s.firstSeen || r.invoiceDate < s.firstSeen) s.firstSeen = r.invoiceDate;
      if (!s.lastSeen || r.invoiceDate > s.lastSeen) s.lastSeen = r.invoiceDate;
    }
  }

  const list = [...map.values()];
  for (const s of list) {
    s.tier = tierFor(s);
    s.gaps = gapsFor(s);
  }

  return list.sort((a, b) => b.co2Kg - a.co2Kg || b.spend - a.spend);
}

export function summariseCoverage(suppliers: SupplierRecord[]): SupplierCoverage {
  const totalSpend = suppliers.reduce((t, s) => t + s.spend, 0);
  const totalCo2Kg = suppliers.reduce((t, s) => t + s.co2Kg, 0);

  const evidenced = suppliers.filter((s) => s.tier === 'primary' || s.tier === 'factor_derived');
  const evidencedSpend = evidenced.reduce((t, s) => t + s.spend, 0);
  const verifiedCo2Kg = suppliers
    .filter((s) => s.verifiedCount > 0)
    .reduce((t, s) => t + s.co2Kg, 0);

  return {
    suppliers,
    supplierCount: suppliers.length,
    evidencedCount: evidenced.length,
    spendCoveragePct: totalSpend > 0 ? (evidencedSpend / totalSpend) * 100 : 0,
    emissionsCoveragePct: totalCo2Kg > 0 ? (verifiedCo2Kg / totalCo2Kg) * 100 : 0,
    totalSpend,
    totalCo2Kg,
    verifiedCo2Kg,
    gapSuppliers: suppliers.filter((s) => s.gaps.length > 0),
    currency: suppliers[0]?.currency || 'INR',
  };
}

export const TIER_LABEL: Record<EvidenceTier, string> = {
  primary: 'Primary invoice evidence',
  factor_derived: 'Factor-derived from invoice',
  spend_only: 'Spend recorded, no factor applied',
  none: 'No usable evidence',
};
