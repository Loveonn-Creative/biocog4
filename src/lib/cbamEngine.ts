/**
 * CBAM Cost Estimator Engine
 * Deterministic calculations based on EU CBAM Regulation (EU) 2023/956
 * Phase-in: 2026–2034, full financial obligation from 2026
 */

// CBAM Phase-in schedule: % of CBAM certificates required
export const PHASE_IN_SCHEDULE: Record<number, number> = {
  2026: 0.025,
  2027: 0.05,
  2028: 0.10,
  2029: 0.225,
  2030: 0.485,
  2031: 0.61,
  2032: 0.735,
  2033: 0.86,
  2034: 1.0,
};

// Free allocation decline (% of benchmark still given free)
export const FREE_ALLOCATION_PCT: Record<number, number> = {
  2026: 0.975,
  2027: 0.95,
  2028: 0.90,
  2029: 0.775,
  2030: 0.515,
  2031: 0.39,
  2032: 0.265,
  2033: 0.14,
  2034: 0.0,
};

// EU ETS price assumption (€/tCO2) — conservative estimate
export const DEFAULT_EU_ETS_PRICE = 75;

// CBAM-covered sectors with CN codes, benchmarks, and production routes
export interface CBAMSector {
  id: string;
  name: string;
  cnCodes: { code: string; description: string }[];
  productionRoutes: { id: string; name: string; defaultIntensity: number }[];
  euBenchmark: number; // tCO2/tonne product
  defaultIntensity: number; // tCO2/tonne (EU default value if no actual data)
}

export const CBAM_SECTORS: CBAMSector[] = [
  {
    id: 'steel',
    name: 'Iron & Steel',
    cnCodes: [
      { code: '7206', description: 'Iron & non-alloy steel ingots' },
      { code: '7207', description: 'Semi-finished iron/steel products' },
      { code: '7208', description: 'Hot-rolled flat products' },
      { code: '7209', description: 'Cold-rolled flat products' },
      { code: '7210', description: 'Coated flat products' },
      { code: '7213', description: 'Hot-rolled bars & rods' },
      { code: '7214', description: 'Other bars & rods' },
      { code: '7216', description: 'Angles, shapes, sections' },
      { code: '7219', description: 'Stainless steel flat products' },
      { code: '7304', description: 'Seamless tubes & pipes' },
    ],
    productionRoutes: [
      { id: 'bf-bof', name: 'Blast Furnace (BF-BOF)', defaultIntensity: 2.1 },
      { id: 'eaf-scrap', name: 'Electric Arc Furnace (Scrap)', defaultIntensity: 0.4 },
      { id: 'eaf-dri', name: 'EAF with DRI', defaultIntensity: 1.2 },
      { id: 'dri-gas', name: 'DRI (Natural Gas)', defaultIntensity: 1.1 },
    ],
    euBenchmark: 1.52,
    defaultIntensity: 2.1,
  },
  {
    id: 'aluminium',
    name: 'Aluminium',
    cnCodes: [
      { code: '7601', description: 'Unwrought aluminium' },
      { code: '7603', description: 'Aluminium powders & flakes' },
      { code: '7604', description: 'Aluminium bars, rods, profiles' },
      { code: '7605', description: 'Aluminium wire' },
      { code: '7606', description: 'Aluminium plates & sheets' },
      { code: '7607', description: 'Aluminium foil' },
    ],
    productionRoutes: [
      { id: 'primary-coal', name: 'Primary (Coal Power)', defaultIntensity: 16.5 },
      { id: 'primary-hydro', name: 'Primary (Hydro Power)', defaultIntensity: 4.0 },
      { id: 'primary-mixed', name: 'Primary (Mixed Grid)', defaultIntensity: 8.0 },
      { id: 'secondary', name: 'Secondary (Recycled)', defaultIntensity: 0.5 },
    ],
    euBenchmark: 1.514,
    defaultIntensity: 8.0,
  },
  {
    id: 'cement',
    name: 'Cement',
    cnCodes: [
      { code: '2523', description: 'Portland cement' },
      { code: '252310', description: 'Cement clinkers' },
      { code: '252329', description: 'Other Portland cement' },
      { code: '252390', description: 'Other hydraulic cements' },
    ],
    productionRoutes: [
      { id: 'grey-clinker', name: 'Grey Clinker (Dry Process)', defaultIntensity: 0.84 },
      { id: 'white-clinker', name: 'White Clinker', defaultIntensity: 0.92 },
      { id: 'blended', name: 'Blended Cement (PPC)', defaultIntensity: 0.58 },
    ],
    euBenchmark: 0.766,
    defaultIntensity: 0.84,
  },
  {
    id: 'fertilizers',
    name: 'Fertilizers',
    cnCodes: [
      { code: '2808', description: 'Nitric acid' },
      { code: '2814', description: 'Ammonia' },
      { code: '3102', description: 'Mineral nitrogen fertilizers' },
      { code: '310210', description: 'Urea' },
      { code: '310230', description: 'Ammonium nitrate' },
      { code: '310260', description: 'Calcium ammonium nitrate' },
    ],
    productionRoutes: [
      { id: 'haber-bosch-gas', name: 'Haber-Bosch (Natural Gas)', defaultIntensity: 1.8 },
      { id: 'haber-bosch-coal', name: 'Haber-Bosch (Coal)', defaultIntensity: 3.5 },
      { id: 'haber-bosch-naphtha', name: 'Haber-Bosch (Naphtha)', defaultIntensity: 2.5 },
    ],
    euBenchmark: 1.619,
    defaultIntensity: 2.5,
  },
  {
    id: 'electricity',
    name: 'Electricity',
    cnCodes: [
      { code: '2716', description: 'Electrical energy' },
    ],
    productionRoutes: [
      { id: 'coal', name: 'Coal-fired', defaultIntensity: 0.95 },
      { id: 'gas', name: 'Gas-fired (CCGT)', defaultIntensity: 0.37 },
      { id: 'mixed', name: 'Mixed Grid', defaultIntensity: 0.45 },
    ],
    euBenchmark: 0.225,
    defaultIntensity: 0.45,
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    cnCodes: [
      { code: '280410', description: 'Hydrogen' },
    ],
    productionRoutes: [
      { id: 'grey-smr', name: 'Grey (SMR, Natural Gas)', defaultIntensity: 9.0 },
      { id: 'blue-ccs', name: 'Blue (SMR + CCS)', defaultIntensity: 2.5 },
      { id: 'green-electrolysis', name: 'Green (Electrolysis)', defaultIntensity: 0.5 },
    ],
    euBenchmark: 8.85,
    defaultIntensity: 9.0,
  },
];

// Countries with carbon pricing (€/tCO2 equivalent)
export const CARBON_PRICES: Record<string, { name: string; price: number }> = {
  IN: { name: 'India', price: 0 },
  CN: { name: 'China', price: 8 },
  KR: { name: 'South Korea', price: 18 },
  JP: { name: 'Japan', price: 3 },
  ZA: { name: 'South Africa', price: 7 },
  TR: { name: 'Turkey', price: 0 },
  RU: { name: 'Russia', price: 0 },
  UA: { name: 'Ukraine', price: 1 },
  GB: { name: 'United Kingdom', price: 45 },
  CH: { name: 'Switzerland', price: 120 },
  NO: { name: 'Norway', price: 85 },
  BR: { name: 'Brazil', price: 0 },
  US: { name: 'United States', price: 0 },
  EG: { name: 'Egypt', price: 0 },
  VN: { name: 'Vietnam', price: 0 },
  TH: { name: 'Thailand', price: 0 },
  ID: { name: 'Indonesia', price: 2 },
  MX: { name: 'Mexico', price: 3 },
  CO: { name: 'Colombia', price: 5 },
  CL: { name: 'Chile', price: 5 },
};

export interface CBAMInput {
  sectorId: string;
  productionRouteId: string;
  countryCode: string;
  supplierName: string;
  tonnage: number;
  actualEmissionsIntensity: number | null; // null = use EU default
  carbonPricePaid: number | null; // null = auto from country
  euEtsPrice: number;
}

export interface CBAMYearResult {
  year: number;
  phaseInPct: number;
  freeAllocationPct: number;
  totalEmissions: number; // tCO2
  freeAllowances: number; // tCO2
  netLiableEmissions: number; // tCO2
  grossCbamCost: number; // €
  carbonPriceCredit: number; // €
  netCbamCost: number; // €
  costPerTonne: number; // €/t product
}

export interface CBAMResult {
  input: CBAMInput;
  sectorName: string;
  routeName: string;
  emissionsIntensityUsed: number;
  euBenchmark: number;
  isUsingDefault: boolean;
  yearlyResults: CBAMYearResult[];
  totalCost9Year: number;
  avgCostPerTonne: number;
}

export function calculateCBAM(input: CBAMInput): CBAMResult {
  const sector = CBAM_SECTORS.find(s => s.id === input.sectorId);
  if (!sector) throw new Error(`Unknown sector: ${input.sectorId}`);

  const route = sector.productionRoutes.find(r => r.id === input.productionRouteId);
  if (!route) throw new Error(`Unknown route: ${input.productionRouteId}`);

  const emissionsIntensity = input.actualEmissionsIntensity ?? route.defaultIntensity;
  const isUsingDefault = input.actualEmissionsIntensity === null;

  const carbonPrice = input.carbonPricePaid ?? (CARBON_PRICES[input.countryCode]?.price ?? 0);

  const yearlyResults: CBAMYearResult[] = [];

  for (let year = 2026; year <= 2034; year++) {
    const phaseInPct = PHASE_IN_SCHEDULE[year];
    const freeAllocationPct = FREE_ALLOCATION_PCT[year];

    const totalEmissions = input.tonnage * emissionsIntensity;
    const freeAllowances = sector.euBenchmark * input.tonnage * freeAllocationPct;
    const netLiableEmissions = Math.max(0, totalEmissions - freeAllowances);

    const grossCbamCost = netLiableEmissions * input.euEtsPrice * phaseInPct;
    const carbonPriceCredit = carbonPrice * totalEmissions * phaseInPct;
    const netCbamCost = Math.max(0, grossCbamCost - carbonPriceCredit);
    const costPerTonne = input.tonnage > 0 ? netCbamCost / input.tonnage : 0;

    yearlyResults.push({
      year,
      phaseInPct,
      freeAllocationPct,
      totalEmissions: Math.round(totalEmissions * 100) / 100,
      freeAllowances: Math.round(freeAllowances * 100) / 100,
      netLiableEmissions: Math.round(netLiableEmissions * 100) / 100,
      grossCbamCost: Math.round(grossCbamCost),
      carbonPriceCredit: Math.round(carbonPriceCredit),
      netCbamCost: Math.round(netCbamCost),
      costPerTonne: Math.round(costPerTonne * 100) / 100,
    });
  }

  const totalCost9Year = yearlyResults.reduce((sum, r) => sum + r.netCbamCost, 0);
  const avgCostPerTonne = input.tonnage > 0 ? totalCost9Year / (9 * input.tonnage) : 0;

  return {
    input,
    sectorName: sector.name,
    routeName: route.name,
    emissionsIntensityUsed: emissionsIntensity,
    euBenchmark: sector.euBenchmark,
    isUsingDefault,
    yearlyResults,
    totalCost9Year: Math.round(totalCost9Year),
    avgCostPerTonne: Math.round(avgCostPerTonne * 100) / 100,
  };
}

export function getSectorByCnCode(cnCode: string): CBAMSector | undefined {
  return CBAM_SECTORS.find(s => s.cnCodes.some(c => cnCode.startsWith(c.code)));
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
