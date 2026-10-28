// A fixed sample used by "Try a sample invoice" on the homepage. It is
// computed locally from published factors, never uploaded or saved, and is
// always labelled as sample data in the UI.
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from '@/lib/cbamEngine';

export interface SampleLine {
  description: string;
  quantity: number;
  unit: string;
  scope: 1 | 2 | 3;
  factor: number; // kgCO2 per unit
  factorSource: string;
}

export const SAMPLE_LINES: SampleLine[] = [
  {
    description: 'Grid electricity, March',
    quantity: 4200,
    unit: 'kWh',
    scope: 2,
    factor: 0.675,
    factorSource: 'CEA CO2 Baseline Database v22.0, FY 2025-26 weighted average',
  },
  {
    description: 'Diesel for standby generator',
    quantity: 120,
    unit: 'litre',
    scope: 1,
    factor: 2.645,
    factorSource: 'Diesel combustion, about 2.645 kgCO2 per litre (IPCC 2006 default basis)',
  },
];

export interface SampleResultData {
  lines: (SampleLine & { co2Kg: number })[];
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  totalKg: number;
  cbam: { tonnes: number; costVerified2026: number; costDefault2026: number; price: number };
}

/** Deterministic, synchronous: the result is ready immediately. */
export function computeSampleResult(): SampleResultData {
  const lines = SAMPLE_LINES.map(l => ({ ...l, co2Kg: Math.round(l.quantity * l.factor * 10) / 10 }));
  const sum = (scope: number) => lines.filter(l => l.scope === scope).reduce((t, l) => t + l.co2Kg, 0);
  const scope1Kg = sum(1);
  const scope2Kg = sum(2);
  const scope3Kg = sum(3);

  // CBAM exposure if this unit shipped 100 tonnes of blast-furnace steel to the EU.
  const common = {
    sectorId: 'steel', productionRouteId: 'bf-bof', countryCode: 'IN', supplierName: 'Sample',
    tonnage: 100, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE,
  };
  const fallback = calculateCBAM({ ...common, actualEmissionsIntensity: null });
  const verified = calculateCBAM({ ...common, actualEmissionsIntensity: fallback.emissionsIntensityUsed });

  return {
    lines,
    scope1Kg,
    scope2Kg,
    scope3Kg,
    totalKg: scope1Kg + scope2Kg + scope3Kg,
    cbam: {
      tonnes: 100,
      costVerified2026: verified.yearlyResults[0].netCbamCost,
      costDefault2026: fallback.yearlyResults[0].netCbamCost,
      price: DEFAULT_EU_ETS_PRICE,
    },
  };
}
