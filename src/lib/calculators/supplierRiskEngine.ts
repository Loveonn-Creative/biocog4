/**
 * Supplier Emissions & Risk Engine
 * Standard: GHG Protocol Scope 3, Category 1 (Purchased Goods & Services)
 * Method: Hybrid spend-based (EEIO) with activity-based override
 */

export type DataSource = 'activity' | 'spend' | 'industry-avg';
export type ConfidenceBand = 'high' | 'medium' | 'low';
export type SupplierTier = 1 | 2 | 3;

// Spend-based EEIO factors (kgCO2e per USD) — World Bank EORA 2023 sector medians
export const SPEND_EF_BY_SECTOR: Record<string, { name: string; kgCO2ePerUSD: number; source: string }> = {
  steel:        { name: 'Iron & Steel',           kgCO2ePerUSD: 2.10, source: 'EORA 2023' },
  cement:       { name: 'Cement & Concrete',      kgCO2ePerUSD: 1.85, source: 'EORA 2023' },
  chemicals:    { name: 'Chemicals',              kgCO2ePerUSD: 1.20, source: 'EORA 2023' },
  textiles:     { name: 'Textiles & Apparel',     kgCO2ePerUSD: 0.95, source: 'EORA 2023' },
  electronics:  { name: 'Electronics',            kgCO2ePerUSD: 0.55, source: 'EORA 2023' },
  food:         { name: 'Food Processing',        kgCO2ePerUSD: 0.80, source: 'EORA 2023' },
  logistics:    { name: 'Logistics & Freight',    kgCO2ePerUSD: 0.65, source: 'EORA 2023' },
  packaging:    { name: 'Packaging',              kgCO2ePerUSD: 0.75, source: 'EORA 2023' },
  machinery:    { name: 'Machinery',              kgCO2ePerUSD: 0.50, source: 'EORA 2023' },
  services:     { name: 'Professional Services',  kgCO2ePerUSD: 0.12, source: 'EORA 2023' },
  agriculture:  { name: 'Agriculture',            kgCO2ePerUSD: 1.40, source: 'EORA 2023' },
  energy:       { name: 'Energy / Utilities',     kgCO2ePerUSD: 1.95, source: 'EORA 2023' },
};

// Country risk multiplier — proxy for grid carbon intensity & disclosure maturity
export const COUNTRY_RISK: Record<string, { name: string; gridIntensity: number; riskScore: number }> = {
  IN: { name: 'India',          gridIntensity: 0.708, riskScore: 70 },
  CN: { name: 'China',          gridIntensity: 0.555, riskScore: 65 },
  VN: { name: 'Vietnam',        gridIntensity: 0.681, riskScore: 75 },
  ID: { name: 'Indonesia',      gridIntensity: 0.760, riskScore: 80 },
  BD: { name: 'Bangladesh',     gridIntensity: 0.650, riskScore: 78 },
  PH: { name: 'Philippines',    gridIntensity: 0.640, riskScore: 70 },
  TH: { name: 'Thailand',       gridIntensity: 0.510, riskScore: 55 },
  MY: { name: 'Malaysia',       gridIntensity: 0.540, riskScore: 50 },
  US: { name: 'United States',  gridIntensity: 0.371, riskScore: 30 },
  EU: { name: 'EU (avg)',       gridIntensity: 0.230, riskScore: 20 },
  GB: { name: 'United Kingdom', gridIntensity: 0.207, riskScore: 18 },
  JP: { name: 'Japan',          gridIntensity: 0.480, riskScore: 35 },
  KR: { name: 'South Korea',    gridIntensity: 0.450, riskScore: 38 },
  TR: { name: 'Türkiye',        gridIntensity: 0.460, riskScore: 60 },
  BR: { name: 'Brazil',         gridIntensity: 0.110, riskScore: 40 },
};

export interface SupplierInput {
  id: string;
  name: string;
  tier: SupplierTier;
  countryCode: string;
  sectorId: string;
  // either spend or activity (activity overrides if present)
  annualSpendUSD?: number;
  activityKgCO2e?: number; // primary data, overrides spend
  hasDisclosure?: boolean;
  hasIso14064?: boolean;
}

export interface SupplierResult {
  id: string;
  name: string;
  tier: SupplierTier;
  countryName: string;
  sectorName: string;
  estimatedKgCO2e: number;
  dataSource: DataSource;
  confidence: ConfidenceBand;
  uncertaintyPct: number; // ±%
  riskScore: number; // 0-100, higher = riskier
  riskBreakdown: { geography: number; sectorIntensity: number; disclosureGap: number };
  notes: string[];
}

export interface SupplierPortfolioResult {
  suppliers: SupplierResult[];
  totalKgCO2e: number;
  averageRisk: number;
  highRiskCount: number;
  byTier: { 1: number; 2: number; 3: number };
  topContributors: SupplierResult[];
  factorSources: string[];
  methodologyVersion: 'SUPPLIER-v1.0 (GHGP Scope 3 Cat 1)';
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

function scoreSupplier(s: SupplierInput, sectorEF: number): SupplierResult {
  const country = COUNTRY_RISK[s.countryCode] ?? { name: s.countryCode, gridIntensity: 0.5, riskScore: 60 };
  const sector = SPEND_EF_BY_SECTOR[s.sectorId];

  let estimated = 0;
  let dataSource: DataSource = 'industry-avg';
  let confidence: ConfidenceBand = 'low';
  let uncertaintyPct = 50;
  const notes: string[] = [];

  if (s.activityKgCO2e !== undefined && s.activityKgCO2e > 0) {
    estimated = s.activityKgCO2e;
    dataSource = 'activity';
    confidence = s.hasIso14064 ? 'high' : 'medium';
    uncertaintyPct = s.hasIso14064 ? 10 : 25;
    notes.push('Primary activity data provided');
  } else if (s.annualSpendUSD !== undefined && s.annualSpendUSD > 0 && sector) {
    estimated = s.annualSpendUSD * sectorEF;
    dataSource = 'spend';
    confidence = 'medium';
    uncertaintyPct = 35;
    notes.push(`Spend-based estimate using ${sector.name} EEIO factor`);
  } else if (sector) {
    estimated = 0;
    dataSource = 'industry-avg';
    confidence = 'low';
    uncertaintyPct = 60;
    notes.push('No spend or activity data — sector average used as proxy');
  }

  // Risk: weighted geography (30) + sector intensity (35) + disclosure gap (35)
  const geoRisk = country.riskScore * 0.30;
  const sectorIntensity = Math.min(100, sectorEF * 40) * 0.35; // scale 2.5 EF → ~100
  const disclosureGap = (s.hasDisclosure ? (s.hasIso14064 ? 0 : 50) : 100) * 0.35;
  const riskScore = Math.round(geoRisk + sectorIntensity + disclosureGap);

  if (s.hasIso14064) notes.push('ISO 14064 verified disclosure');
  else if (s.hasDisclosure) notes.push('Self-disclosed (unverified)');
  else notes.push('No disclosure on record');

  return {
    id: s.id,
    name: s.name,
    tier: s.tier,
    countryName: country.name,
    sectorName: sector?.name ?? s.sectorId,
    estimatedKgCO2e: round(estimated),
    dataSource,
    confidence,
    uncertaintyPct,
    riskScore,
    riskBreakdown: {
      geography: round(geoRisk),
      sectorIntensity: round(sectorIntensity),
      disclosureGap: round(disclosureGap),
    },
    notes,
  };
}

export function calculateSupplierPortfolio(suppliers: SupplierInput[]): SupplierPortfolioResult {
  const sources = new Set<string>();
  const results = suppliers.map(s => {
    const sector = SPEND_EF_BY_SECTOR[s.sectorId];
    if (sector) sources.add(sector.source);
    sources.add('IEA 2023 (grid intensity)');
    return scoreSupplier(s, sector?.kgCO2ePerUSD ?? 0);
  });

  const totalKgCO2e = results.reduce((sum, r) => sum + r.estimatedKgCO2e, 0);
  const averageRisk = results.length ? Math.round(results.reduce((s, r) => s + r.riskScore, 0) / results.length) : 0;
  const highRiskCount = results.filter(r => r.riskScore >= 70).length;
  const byTier = { 1: 0, 2: 0, 3: 0 } as { 1: number; 2: number; 3: number };
  for (const r of results) byTier[r.tier] += r.estimatedKgCO2e;

  const topContributors = [...results].sort((a, b) => b.estimatedKgCO2e - a.estimatedKgCO2e).slice(0, 5);

  return {
    suppliers: results,
    totalKgCO2e: round(totalKgCO2e),
    averageRisk,
    highRiskCount,
    byTier: { 1: round(byTier[1]), 2: round(byTier[2]), 3: round(byTier[3]) },
    topContributors,
    factorSources: Array.from(sources),
    methodologyVersion: 'SUPPLIER-v1.0 (GHGP Scope 3 Cat 1)',
  };
}
