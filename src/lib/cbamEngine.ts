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

import {
  defaultFor, benchmarkFor, markupFor, BENCHMARKS, CBAM_FACTOR, CSCF_PRELIMINARY, CERTIFICATE_PRICES, INDIRECT_COUNTED,
  type CbamSector,
} from './cbam/official';

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

// Free allocation decline (% of benchmark still given free): CBAM factor x
// cross-sectoral correction factor, both from Guidance No. 4, Table 2-1
// (src/lib/cbam/official.ts).
export const FREE_ALLOCATION_PCT: Record<number, number> = Object.fromEntries(
  Object.entries(CBAM_FACTOR).map(([y, f]) => [Number(y), f * (CSCF_PRELIMINARY[Number(y)] ?? 1)]),
);

// Default price: the official Q3 2026 CBAM certificate price (€82.32,
// published 5 Oct 2026, taxation-customs.ec.europa.eu "Price of CBAM
// certificates"). Users can change it in the calculator.
export const DEFAULT_EU_ETS_PRICE = CERTIFICATE_PRICES[CERTIFICATE_PRICES.length - 1].eur;

// Mark-up applied to default values when actual verified data is not used
// (Implementing Regulation (EU) 2025/2621 as corrected by 2026/1740):
// 10% in 2026, 20% in 2027, 30% from 2028 for cement, iron and steel,
// aluminium and hydrogen; 1% for fertilisers.
const SECTOR_KEY: Record<string, CbamSector> = {
  steel: 'iron_steel', aluminium: 'aluminium', cement: 'cement', fertilizers: 'fertilisers', electricity: 'electricity', hydrogen: 'hydrogen',
};
export function defaultValueMarkup(sectorId: string, year: number): number {
  const key = SECTOR_KEY[sectorId];
  return key ? markupFor(key, year) : 0;
}

/**
 * Official India default value for a representative CN code, as the CBAM
 * figure counts it: total (direct + indirect) for cement and fertilisers,
 * direct only for the other sectors (Guidance No. 3, section 4.1.3).
 * Throws if the code has no published value, so a missing number can never
 * fall back to a guess.
 */
function officialDefault(cn: string): number {
  const d = defaultFor(cn);
  if (!d) throw new Error(`No Commission India default value for CN ${cn}`);
  const v = INDIRECT_COUNTED.includes(d.sector) ? d.total : d.direct;
  if (v === null) throw new Error(`Commission India default value for CN ${cn} is not given`);
  return v;
}

/** The route indicator the default values file names for this CN (which Column B value applies with defaults). */
function officialDefaultRoute(cn: string): string | null {
  return defaultFor(cn)?.route ?? null;
}

/**
 * Column B benchmark (whole production chain, Guidance No. 4 section
 * 2.2.1.3) for a CN code. With route given, the value for that route
 * indicator; production-year variants (1)/(2) pick by year; a single value
 * applies to every route.
 */
export function officialBenchmark(cn: string, route: string | null, year = 2026): number {
  // An exact or broader code first; for a heading shorter than the
  // benchmark codes (e.g. 7601), its sub-codes must all agree or it throws.
  let b = benchmarkFor(cn);
  if (!b) {
    const subs = BENCHMARKS.filter((x) => x.cn.startsWith(cn.replace(/\D/g, '')));
    const same = subs.length > 0 && subs.every((x) => JSON.stringify(x.colB) === JSON.stringify(subs[0].colB));
    if (same) b = subs[0];
  }
  if (!b || b.colB.length === 0) throw new Error(`No single CBAM benchmark for CN ${cn}`);
  if (b.colB.length === 1) return b.colB[0].value;
  const yearCode = year <= 2027 ? '(1)' : '(2)';
  const match = b.colB.filter((e) => e.route !== null && (route === null || e.route.includes(route)));
  const byYear = match.find((e) => e.route!.includes(yearCode));
  const chosen = byYear ?? (match.length === 1 ? match[0] : null);
  if (!chosen) throw new Error(`CBAM benchmark for CN ${cn} needs a route indicator (got ${route ?? 'none'})`);
  return chosen.value;
}

// CBAM-covered sectors with CN codes, benchmarks, and production routes
export interface CBAMSector {
  id: string;
  name: string;
  cnCodes: { code: string; description: string }[];
  /** 'product' when defaults differ by product form rather than production route. */
  routeKind?: 'route' | 'product';
  productionRoutes: {
    id: string; name: string; defaultIntensity: number;
    /** CN code whose official India default value and benchmark this option uses. */
    cn?: string;
    /** Route indicator (Guidance No. 4, Table 2-2) for the benchmark when actual data are used. */
    benchmarkRoute?: string | null;
  }[];
  euBenchmark: number; // tCO2/tonne product
  defaultIntensity: number; // tCO2/tonne (EU default value if no actual data)
}

const route = (id: string, name: string, cn: string, benchmarkRoute: string | null = null) =>
  ({ id, name, cn, benchmarkRoute, defaultIntensity: officialDefault(cn) });

// Representative CN codes. Commission default values are set per product
// (CN code), not per production route, so every route of one product shares
// the product's default; the route only changes the benchmark used with
// actual data. Values: src/lib/cbam/official.ts (Commission files).
const STEEL_CN = '72081000';        // hot-rolled flat products, the headline steel good
const CLINKER_GREY = '2523100090';
const CLINKER_WHITE = '2523100010';
const CEMENT_PORTLAND = '25232900'; // grey Portland cement
const AMMONIA = '28141000';
const HYDROGEN = '28041000';

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
      route('bf-bof', 'Blast Furnace (BF-BOF)', STEEL_CN, '(C)'),
      route('eaf-scrap', 'Electric Arc Furnace (Scrap)', STEEL_CN, '(E)'),
      route('eaf-dri', 'EAF with DRI', STEEL_CN, '(D)'),
      route('dri-gas', 'DRI (Natural Gas)', STEEL_CN, '(D)'),
    ],
    euBenchmark: officialBenchmark(STEEL_CN, officialDefaultRoute(STEEL_CN)),
    defaultIntensity: officialDefault(STEEL_CN),
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
      route('unwrought', 'Unwrought aluminium (CN 7601)', '7601', '(K)'),
      route('wire', 'Wire (CN 7605)', '7605', '(K)'),
      route('bars-profiles', 'Bars, rods and profiles (CN 7604)', '76041010', '(K)'),
      route('plates-sheets', 'Plates, sheets and strip (CN 7606)', '7606', '(K)'),
    ],
    euBenchmark: officialBenchmark('7601', '(K)'),
    defaultIntensity: officialDefault('7601'),
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
      route('grey-clinker', 'Grey Clinker (Dry Process)', CLINKER_GREY, '(A)'),
      route('white-clinker', 'White Clinker', CLINKER_WHITE, '(B)'),
      route('blended', 'Blended Cement (PPC)', CEMENT_PORTLAND, null),
    ],
    euBenchmark: officialBenchmark(CLINKER_GREY, '(A)'),
    defaultIntensity: officialDefault(CLINKER_GREY),
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
      route('haber-bosch-gas', 'Haber-Bosch (Natural Gas)', AMMONIA),
      route('haber-bosch-coal', 'Haber-Bosch (Coal)', AMMONIA),
      route('haber-bosch-naphtha', 'Haber-Bosch (Naphtha)', AMMONIA),
    ],
    euBenchmark: officialBenchmark(AMMONIA, null),
    defaultIntensity: officialDefault(AMMONIA),
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
    // No free allocation adjustment for electrical energy (CN 2716 00 00):
    // Guidance No. 4, section 2.2.1 (EU electricity producers get no free
    // allocation). The intensities above are unchanged: the Commission's
    // default values file has no India value for electricity (Annex III).
    euBenchmark: 0,
    defaultIntensity: 0.45,
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    cnCodes: [
      { code: '280410', description: 'Hydrogen' },
    ],
    productionRoutes: [
      route('grey-smr', 'Grey (SMR, Natural Gas)', HYDROGEN),
      route('blue-ccs', 'Blue (SMR + CCS)', HYDROGEN),
      route('green-electrolysis', 'Green (Electrolysis)', HYDROGEN),
    ],
    euBenchmark: officialBenchmark(HYDROGEN, null),
    defaultIntensity: officialDefault(HYDROGEN),
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

  // Benchmark: with default values, the Column B value for the route the
  // default values file names for the CN; with actual data, the Column B
  // value for the chosen route (whole chain, precursors included, as a
  // single actual intensity is). Options without a CN keep the sector value.
  const benchmarkFor_ = (year: number) => route.cn
    ? officialBenchmark(route.cn, isUsingDefault ? officialDefaultRoute(route.cn) : (route.benchmarkRoute ?? officialDefaultRoute(route.cn)), year)
    : sector.euBenchmark;

  const yearlyResults: CBAMYearResult[] = [];

  for (let year = 2026; year <= 2034; year++) {
    const phaseInPct = PHASE_IN_SCHEDULE[year];
    const freeAllocationPct = FREE_ALLOCATION_PCT[year];

    const intensityThisYear = isUsingDefault
      ? emissionsIntensity * (1 + defaultValueMarkup(sector.id, year))
      : emissionsIntensity;
    const totalEmissions = input.tonnage * intensityThisYear;
    const freeAllowances = benchmarkFor_(year) * input.tonnage * freeAllocationPct;
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
    euBenchmark: benchmarkFor_(2026),
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
