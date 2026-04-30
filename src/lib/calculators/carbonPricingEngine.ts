/**
 * Carbon Pricing Impact Engine (Carbon Cost Exposure)
 * Models EU ETS forward curves + CBAM phase-in + sector free allowances
 * Reuses CBAM phase-in schedule from cbamEngine for consistency
 */

import { PHASE_IN_SCHEDULE, FREE_ALLOCATION_PCT } from '@/lib/cbamEngine';

export type PriceScenario = 'best' | 'base' | 'worst';

// EU ETS forward curve assumptions (€/tCO2)
export const EU_ETS_CURVE: Record<number, number> = {
  2026: 80, 2027: 85, 2028: 92, 2029: 100, 2030: 110,
  2031: 118, 2032: 125, 2033: 130, 2034: 135,
};

// Sector EU benchmarks (free allowance — tCO2/t output)
export const SECTOR_BENCHMARKS: Record<string, { name: string; benchmark: number; cbamCovered: boolean }> = {
  steel:        { name: 'Iron & Steel',  benchmark: 1.520, cbamCovered: true },
  aluminium:    { name: 'Aluminium',     benchmark: 1.514, cbamCovered: true },
  cement:       { name: 'Cement',        benchmark: 0.766, cbamCovered: true },
  fertilizers:  { name: 'Fertilizers',   benchmark: 1.619, cbamCovered: true },
  electricity:  { name: 'Electricity',   benchmark: 0.225, cbamCovered: true },
  hydrogen:     { name: 'Hydrogen',      benchmark: 8.850, cbamCovered: true },
  chemicals:    { name: 'Chemicals',     benchmark: 0.500, cbamCovered: false },
  textiles:     { name: 'Textiles',      benchmark: 0.300, cbamCovered: false },
  food:         { name: 'Food Processing', benchmark: 0.200, cbamCovered: false },
  other:        { name: 'Other / Non-regulated', benchmark: 0,  cbamCovered: false },
};

// Currency normalization (1 USD = X local)
const FX_TO_EUR: Record<string, number> = {
  EUR: 1.0, USD: 0.92, GBP: 1.17, INR: 0.011, CNY: 0.13, JPY: 0.0061,
  IDR: 0.0000585, VND: 0.0000363, BDT: 0.0083, PHP: 0.016, THB: 0.027,
};

export interface CarbonPricingInput {
  scope1KgCO2e: number;
  scope2KgCO2e: number;
  scope3KgCO2e: number;
  productionTonnes: number;       // for free allowance calc
  sectorId: string;
  exportsToEU: boolean;
  reductionPctByYear?: number;    // e.g. 0.05 = 5% per year, applied to all scopes
  scenario: PriceScenario;
  startYear: number;              // 2026..2034
  endYear: number;                // 2026..2034
  countryCarbonPrice: number;     // €/tCO2 already paid domestically
  reportingCurrency: string;      // EUR, USD, INR...
}

export interface YearLiability {
  year: number;
  euEtsPrice: number;
  scope1Tonnes: number;
  scope2Tonnes: number;
  scope3Tonnes: number;
  totalTonnes: number;
  freeAllowanceTonnes: number;
  netLiableTonnes: number;
  cbamPhasePct: number;
  grossEur: number;
  domesticCreditEur: number;
  netLiabilityEur: number;
  netLiabilityLocal: number;
}

export interface CarbonPricingResult {
  scenario: PriceScenario;
  yearly: YearLiability[];
  totalLiabilityEur: number;
  totalLiabilityLocal: number;
  reportingCurrency: string;
  sectorName: string;
  isCbamCovered: boolean;
  regulatedShareEur: number;
  nonRegulatedShareEur: number;
  sensitivity: { best: number; base: number; worst: number };
  factorSources: string[];
  methodologyVersion: 'CARBONPRICE-v1.0 (EU ETS + CBAM)';
}

const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

function priceFor(year: number, scenario: PriceScenario): number {
  const base = EU_ETS_CURVE[year] ?? EU_ETS_CURVE[2034];
  if (scenario === 'best') return round(base * 0.8, 1);
  if (scenario === 'worst') return round(base * 1.3, 1);
  return base;
}

function applyScenario(input: CarbonPricingInput, scenario: PriceScenario): { yearly: YearLiability[]; total: number } {
  const sector = SECTOR_BENCHMARKS[input.sectorId] ?? SECTOR_BENCHMARKS.other;
  const yearly: YearLiability[] = [];
  let total = 0;
  const reduction = Math.max(0, Math.min(0.5, input.reductionPctByYear ?? 0));
  const fx = FX_TO_EUR[input.reportingCurrency] ?? 1;
  const fxInverse = fx > 0 ? 1 / fx : 1;

  for (let year = input.startYear; year <= input.endYear; year++) {
    const yearsFromStart = year - input.startYear;
    const reductionFactor = Math.pow(1 - reduction, yearsFromStart);
    const s1 = (input.scope1KgCO2e / 1000) * reductionFactor;
    const s2 = (input.scope2KgCO2e / 1000) * reductionFactor;
    const s3 = (input.scope3KgCO2e / 1000) * reductionFactor;
    const totalT = s1 + s2 + s3;

    const freeAllocPct = sector.cbamCovered ? (FREE_ALLOCATION_PCT[year] ?? 0) : 0;
    const freeAllowance = sector.benchmark * (input.productionTonnes || 0) * freeAllocPct;
    const liable = Math.max(0, totalT - freeAllowance);
    const cbamPhase = (sector.cbamCovered && input.exportsToEU) ? (PHASE_IN_SCHEDULE[year] ?? 1) : 1;
    const price = priceFor(year, scenario);

    const gross = liable * price * cbamPhase;
    const credit = totalT * input.countryCarbonPrice * cbamPhase;
    const net = Math.max(0, gross - credit);
    total += net;

    yearly.push({
      year,
      euEtsPrice: price,
      scope1Tonnes: round(s1, 2),
      scope2Tonnes: round(s2, 2),
      scope3Tonnes: round(s3, 2),
      totalTonnes: round(totalT, 2),
      freeAllowanceTonnes: round(freeAllowance, 2),
      netLiableTonnes: round(liable, 2),
      cbamPhasePct: cbamPhase,
      grossEur: round(gross),
      domesticCreditEur: round(credit),
      netLiabilityEur: round(net),
      netLiabilityLocal: round(net * fxInverse),
    });
  }
  return { yearly, total };
}

export function calculateCarbonPricing(input: CarbonPricingInput): CarbonPricingResult {
  const sector = SECTOR_BENCHMARKS[input.sectorId] ?? SECTOR_BENCHMARKS.other;
  const base = applyScenario(input, input.scenario);
  const fx = FX_TO_EUR[input.reportingCurrency] ?? 1;
  const fxInverse = fx > 0 ? 1 / fx : 1;

  // Run all three for sensitivity
  const sBest = applyScenario(input, 'best').total;
  const sBase = applyScenario(input, 'base').total;
  const sWorst = applyScenario(input, 'worst').total;

  // Regulated vs non-regulated split (simple: if sector is CBAM covered, all scope1+2 → regulated)
  const regulatedRatio = sector.cbamCovered ? (input.scope1KgCO2e + input.scope2KgCO2e) / Math.max(1, input.scope1KgCO2e + input.scope2KgCO2e + input.scope3KgCO2e) : 0;
  const regulatedShareEur = round(base.total * regulatedRatio);
  const nonRegulatedShareEur = round(base.total - regulatedShareEur);

  return {
    scenario: input.scenario,
    yearly: base.yearly,
    totalLiabilityEur: round(base.total),
    totalLiabilityLocal: round(base.total * fxInverse),
    reportingCurrency: input.reportingCurrency,
    sectorName: sector.name,
    isCbamCovered: sector.cbamCovered,
    regulatedShareEur,
    nonRegulatedShareEur,
    sensitivity: { best: round(sBest), base: round(sBase), worst: round(sWorst) },
    factorSources: ['EU ETS forward curve assumption', 'EU CBAM Regulation 2023/956', 'EU sector benchmarks'],
    methodologyVersion: 'CARBONPRICE-v1.0 (EU ETS + CBAM)',
  };
}

export function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function formatLocal(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}
