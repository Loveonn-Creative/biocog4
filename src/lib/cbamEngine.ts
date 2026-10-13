/**
 * CBAM Cost Estimator Engine
 * Deterministic estimate based on Regulation (EU) 2023/956 as amended by
 * Regulation (EU) 2025/2083, and default values per Implementing Regulation
 * (EU) 2025/2621 (mark-ups as corrected by 2026/1740).
 *
 * Certificates owed for a year = embedded emissions minus the free-allocation
 * adjustment (EU benchmark × share of free allocation still granted, CBAM
 * Art. 31 / ETS Directive Art. 10a(1a)). The phase-out is already inside that
 * adjustment, so it must not be applied a second time to the cost.
 * Benchmarks below are indicative; results are estimates, not a declaration.
 */

// Share of EU free allocation removed each year (display only: it is the
// complement of FREE_ALLOCATION_PCT and is NOT a multiplier on cost).
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

// Default price: the official Q3 2026 CBAM certificate price (€82.32,
// published 5 Oct 2026, taxation-customs.ec.europa.eu "Price of CBAM
// certificates"). Users can change it in the calculator.
export const DEFAULT_EU_ETS_PRICE = 82.32;

// Mark-up applied to default values when actual verified data is not used
// (Implementing Regulation (EU) 2025/2621 as corrected by 2026/1740):
// 10% in 2026, 20% in 2027, 30% from 2028 for cement, iron and steel,
// aluminium and hydrogen; 1% for fertilisers.
export function defaultValueMarkup(sectorId: string, year: number): number {
  if (sectorId === 'fertilizers') return 0.01;
  if (['steel', 'aluminium', 'cement', 'hydrogen'].includes(sectorId)) {
    return year <= 2026 ? 0.10 : year === 2027 ? 0.20 : 0.30;
  }
  return 0;
}

// CBAM-covered sectors with CN codes, benchmarks, and production routes
export interface CBAMSector {
  id: string;
  name: string;
  cnCodes: { code: string; description: string }[];
  /** 'product' when defaults differ by product form rather than production route. */
  routeKind?: 'route' | 'product';
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
    // CBAM charges aluminium on direct emissions only (Regulation (EU) 2023/956,
    // Annex II lists cement and fertilisers for indirect emissions, not
    // aluminium), so smelter electricity is not counted. EU default values are
    // set per product and origin, not per production route: these are the
    // India defaults from Implementing Regulation (EU) 2025/2621 (unwrought
    // 1.87; wire 2.59; bars and rods 3.41, with some profile subheadings
    // reported at 3.44; plates, sheets and strip 4.13). Recycled metal only
    // lowers the charge through verified actual emissions.
    routeKind: 'product',
    productionRoutes: [
      { id: 'unwrought', name: 'Unwrought aluminium (CN 7601)', defaultIntensity: 1.87 },
      { id: 'wire', name: 'Wire (CN 7605)', defaultIntensity: 2.59 },
      { id: 'bars-profiles', name: 'Bars, rods and profiles (CN 7604)', defaultIntensity: 3.41 },
      { id: 'plates-sheets', name: 'Plates, sheets and strip (CN 7606)', defaultIntensity: 4.13 },
    ],
    euBenchmark: 1.514,
    defaultIntensity: 1.87,
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

    const intensityThisYear = isUsingDefault
      ? emissionsIntensity * (1 + defaultValueMarkup(sector.id, year))
      : emissionsIntensity;
    const totalEmissions = input.tonnage * intensityThisYear;
    const freeAllowances = sector.euBenchmark * input.tonnage * freeAllocationPct;
    const netLiableEmissions = Math.max(0, totalEmissions - freeAllowances);

    // Certificates are owed on every net liable tonne; the phase-out is
    // already reflected in freeAllowances.
    const grossCbamCost = netLiableEmissions * input.euEtsPrice;
    // Art. 9: carbon price effectively paid abroad reduces the certificates
    // due, applied here to the liable tonnes only.
    const carbonPriceCredit = Math.min(grossCbamCost, carbonPrice * netLiableEmissions);
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
