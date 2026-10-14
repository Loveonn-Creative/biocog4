// Deterministic emission-factor lookup, unit conversion and line-item
// classification for invoice extraction. Pure functions only (no Deno or
// browser APIs) so the edge function and the bun tests import the same code.
//
// Methodology: Quantity (in the factor's unit) x Factor = kgCO2e.
// Avoided emissions from green purchases are reported separately and are
// never subtracted from gross emissions.

export const METHODOLOGY_NAME = 'BIOCOG_MVR_INDIA';
export const METHODOLOGY_VERSION_TAG = 'v1.1';
export const FACTOR_SET_VERSION = 'IND_EF_2026_10';
const SRC = `${METHODOLOGY_NAME}_${METHODOLOGY_VERSION_TAG}`;

// ---------------------------------------------------------------------------
// Fuel factors (Scope 1)
//
// IPCC = 2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 2
// (Energy), Ch. 1, Table 1.2 (default net calorific values) and Table 1.4
// (default CO2 emission factors). Values are CO2 only; at IPCC stationary
// combustion defaults CH4 and N2O add well under 1%.
// Per-litre and per-scm values need a density, which IPCC does not give; the
// density used is stated next to each factor and is an assumption to replace
// with supplier data when available.
// ---------------------------------------------------------------------------
export type FuelType =
  | 'DIESEL' | 'PETROL' | 'CNG' | 'PNG' | 'LPG' | 'COAL'
  | 'FURNACE_OIL' | 'NAPHTHA' | 'KEROSENE' | 'BIOMASS';

export interface Factor {
  value: number;
  /** Canonical unit the value is expressed per (see normalizeUnit). */
  unit: string;
  source: string;
}

export const FUEL_FACTORS: Record<FuelType, Factor> = {
  // Unchanged from v1.0 (not part of the 2026-10 review).
  DIESEL: { value: 2.68, unit: 'litre', source: 'BIOCOG_MVR_INDIA v1.0 (unchanged)' },
  PETROL: { value: 2.31, unit: 'litre', source: 'BIOCOG_MVR_INDIA v1.0 (unchanged)' },
  CNG: { value: 2.75, unit: 'kg', source: 'BIOCOG_MVR_INDIA v1.0 (unchanged)' },
  COAL: { value: 2.42, unit: 'kg', source: 'BIOCOG_MVR_INDIA v1.0 (unchanged)' },
  // Was 1.51. IPCC LPG: 63,100 kgCO2/TJ x 47.3 TJ/Gg = 2.985 kgCO2/kg.
  LPG: { value: 2.98, unit: 'kg', source: 'IPCC 2006 V2 Tables 1.2/1.4: LPG' },
  // Was 2.30. IPCC natural gas: 56,100 kgCO2/TJ x 48.0 TJ/Gg = 2.693 kgCO2/kg,
  // x assumed 0.76 kg/scm (typical pipeline gas at 15 C, 1 atm) = 2.05.
  // The density is an assumption; a supplier GCV per scm should replace it.
  PNG: { value: 2.05, unit: 'scm', source: 'IPCC 2006 V2 Tables 1.2/1.4: natural gas, 0.76 kg/scm assumed' },
  // Was 3.15 per litre (close to the per-kg value). IPCC residual fuel oil:
  // 77,400 kgCO2/TJ x 40.4 TJ/Gg = 3.127 kgCO2/kg, x assumed 0.95 kg/L = 2.97.
  FURNACE_OIL: { value: 2.97, unit: 'litre', source: 'IPCC 2006 V2 Tables 1.2/1.4: residual fuel oil, 0.95 kg/L assumed' },
  // Was 3.00 per litre. IPCC gives naphtha per mass only:
  // 73,300 kgCO2/TJ x 44.5 TJ/Gg = 3.262 kgCO2/kg. Kept per kg so no density
  // is assumed; naphtha lines in litres get no factor and are flagged.
  NAPHTHA: { value: 3.26, unit: 'kg', source: 'IPCC 2006 V2 Tables 1.2/1.4: naphtha' },
  // New (was mapped to diesel 2.68). IPCC other kerosene:
  // 71,900 kgCO2/TJ x 43.8 TJ/Gg = 3.149 kgCO2/kg, x assumed 0.80 kg/L = 2.52.
  KEROSENE: { value: 2.52, unit: 'litre', source: 'IPCC 2006 V2 Tables 1.2/1.4: other kerosene, 0.80 kg/L assumed' },
  // Biogenic CO2 is reported as zero here and never credited.
  BIOMASS: { value: 0, unit: 'kg', source: 'Biogenic CO2 reported as zero' },
};

// ---------------------------------------------------------------------------
// Grid electricity (Scope 2)
// Was 0.708 with the comment "CEA India" and no edition. 0.710 kgCO2/kWh is
// the owner-specified India weighted-average grid factor. The CEA CO2
// Baseline Database edition and fiscal year behind it have NOT been confirmed
// in code review; confirm against the current CEA user guide before relying
// on it for an audit.
// ---------------------------------------------------------------------------
export const INDIA_GRID_FACTOR_KG_PER_KWH = 0.710;
export const INDIA_GRID_FACTOR_SOURCE = 'CEA CO2 Baseline Database, India weighted average (edition to be confirmed)';

// Scope 3 has no factors here. The former road-freight (0.18 kg/t-km) and
// landfill-organic (1.90 kg/kg) values had no publication, mode, material or
// geography, so they applied one number to air freight, sea freight and scrap
// metal alike. Scope 3 lines are calculated only in the supplier evidence
// trail (scope3.ts), from approved, sourced, material- and geography-specific
// factors; a freight or waste line here is flagged as having no verified factor.

// Avoided-emission factors for green purchases (positive numbers = kgCO2e
// avoided per unit). Reported separately; never netted against emissions.
export const AVOIDED_FACTORS: Record<string, Factor> = {
  SOLAR_ENERGY: { value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', source: `${SRC}:SOLAR_AVOIDED_GRID` },
  WIND_ENERGY: { value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', source: `${SRC}:WIND_AVOIDED_GRID` },
  EV_TRANSPORT: { value: 1.80, unit: 'litre', source: `${SRC}:EV_DIESEL_AVOIDED` },
  FORESTATION: { value: 22.0, unit: 'tree', source: `${SRC}:FORESTATION_IPCC` },
  BIOGAS: { value: FUEL_FACTORS.PNG.value, unit: 'scm', source: `${SRC}:BIOGAS_NG_AVOIDED` },
  ORGANIC_INPUT: { value: 0.50, unit: 'kg', source: `${SRC}:ORGANIC_CHEM_AVOIDED` },
  ENERGY_EFFICIENCY: { value: 0.30, unit: 'kWh', source: `${SRC}:EFFICIENCY_REDUCTION` },
  WATER_CONSERVATION: { value: 0.20, unit: 'kl', source: `${SRC}:WATER_ENERGY_SAVED` },
  RECYCLED_MATERIAL: { value: 1.50, unit: 'kg', source: `${SRC}:RECYCLED_VIRGIN_AVOIDED` },
};

export const GREEN_PRODUCT_CATEGORIES = Object.keys(AVOIDED_FACTORS);

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
export interface NormalizedUnit {
  /** Canonical unit: kWh, litre, kg, scm, ton-km, tree. */
  unit: string;
  /** Multiply a quantity in the raw unit by this to get the canonical unit. */
  multiplier: number;
}

const UNIT_ALIASES: Record<string, NormalizedUnit> = {
  // Energy
  kwh: { unit: 'kWh', multiplier: 1 },
  'kw.h': { unit: 'kWh', multiplier: 1 },
  'kw-h': { unit: 'kWh', multiplier: 1 },
  kwhr: { unit: 'kWh', multiplier: 1 },
  mwh: { unit: 'kWh', multiplier: 1000 },
  // Volume (liquid)
  l: { unit: 'litre', multiplier: 1 },
  lt: { unit: 'litre', multiplier: 1 },
  ltr: { unit: 'litre', multiplier: 1 },
  ltrs: { unit: 'litre', multiplier: 1 },
  litre: { unit: 'litre', multiplier: 1 },
  litres: { unit: 'litre', multiplier: 1 },
  liter: { unit: 'litre', multiplier: 1 },
  liters: { unit: 'litre', multiplier: 1 },
  kl: { unit: 'litre', multiplier: 1000 },
  kilolitre: { unit: 'litre', multiplier: 1000 },
  kiloliter: { unit: 'litre', multiplier: 1000 },
  // Mass. "ton"/"tons" on Indian invoices denote the metric tonne.
  kg: { unit: 'kg', multiplier: 1 },
  kgs: { unit: 'kg', multiplier: 1 },
  kilogram: { unit: 'kg', multiplier: 1 },
  kilograms: { unit: 'kg', multiplier: 1 },
  t: { unit: 'kg', multiplier: 1000 },
  mt: { unit: 'kg', multiplier: 1000 },
  tonne: { unit: 'kg', multiplier: 1000 },
  tonnes: { unit: 'kg', multiplier: 1000 },
  ton: { unit: 'kg', multiplier: 1000 },
  tons: { unit: 'kg', multiplier: 1000 },
  'metric ton': { unit: 'kg', multiplier: 1000 },
  'metric tonne': { unit: 'kg', multiplier: 1000 },
  // Gas volume (standard cubic metres)
  scm: { unit: 'scm', multiplier: 1 },
  sm3: { unit: 'scm', multiplier: 1 },
  m3: { unit: 'scm', multiplier: 1 },
  'cu.m': { unit: 'scm', multiplier: 1 },
  'cubic metre': { unit: 'scm', multiplier: 1 },
  'cubic meter': { unit: 'scm', multiplier: 1 },
  // Freight
  'ton-km': { unit: 'ton-km', multiplier: 1 },
  'tonne-km': { unit: 'ton-km', multiplier: 1 },
  tkm: { unit: 'ton-km', multiplier: 1 },
  // Counts
  tree: { unit: 'tree', multiplier: 1 },
  trees: { unit: 'tree', multiplier: 1 },
  sapling: { unit: 'tree', multiplier: 1 },
  saplings: { unit: 'tree', multiplier: 1 },
};

/** Map a raw unit string to its canonical unit and multiplier, or null. */
export function normalizeUnit(raw: string | null | undefined): NormalizedUnit | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase().replace(/³/g, '3').replace(/\s+/g, ' ').replace(/\.$/, '');
  return UNIT_ALIASES[key] ?? null;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
export interface HsnClass {
  productCategory: string;
  industryCode: string;
  industryName: string;
  scope: number;
}

const HSN_MASTER: Record<string, { productCategory: string; industryCode: string; industryName: string; defaultScope: number }> = {
  // 4-digit codes are checked before 2-digit chapters.
  '2716': { productCategory: 'ELECTRICITY', industryCode: 'POWER', industryName: 'Electrical Energy', defaultScope: 2 },
  '8541': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', industryName: 'Solar Cells & PV Modules', defaultScope: 2 },
  '8711': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motorcycles', defaultScope: 1 },
  '0602': { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', industryName: 'Live Plants & Saplings', defaultScope: 3 },
  '8501': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motors', defaultScope: 1 },
  // Chapters. Chapter 10 (cereals) is food, not fuel biomass, and is not mapped.
  '27': { productCategory: 'FUEL', industryCode: 'ENERGY', industryName: 'Mineral Fuels & Oils', defaultScope: 1 },
  '12': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Oil Seeds & Biomass', defaultScope: 1 },
  '72': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', industryName: 'Iron & Steel', defaultScope: 3 },
  '73': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL_PRODUCTS', industryName: 'Steel Articles', defaultScope: 3 },
  '74': { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', industryName: 'Copper', defaultScope: 3 },
  '76': { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', industryName: 'Aluminium', defaultScope: 3 },
  '25': { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', industryName: 'Cement & Minerals', defaultScope: 3 },
  '39': { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', industryName: 'Plastics & Polymers', defaultScope: 3 },
  '28': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Inorganic Chemicals', defaultScope: 3 },
  '29': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Organic Chemicals', defaultScope: 3 },
  '40': { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', industryName: 'Rubber & Elastomers', defaultScope: 3 },
  '48': { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', industryName: 'Paper & Pulp', defaultScope: 3 },
  '44': { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', industryName: 'Wood & Timber', defaultScope: 3 },
  '52': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Cotton Textiles', defaultScope: 3 },
  '54': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Synthetic Textiles', defaultScope: 3 },
  '84': { productCategory: 'CAPITAL_GOODS', industryCode: 'MACHINERY', industryName: 'Industrial Machinery', defaultScope: 3 },
  '85': { productCategory: 'ELECTRICAL_EQUIPMENT', industryCode: 'ELECTRICAL', industryName: 'Electrical Equipment', defaultScope: 3 },
  '90': { productCategory: 'INSTRUMENTS', industryCode: 'INSTRUMENTATION', industryName: 'Measuring Instruments', defaultScope: 3 },
  '86': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'RAILWAYS', industryName: 'Railway Equipment', defaultScope: 3 },
  '87': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AUTOMOTIVE', industryName: 'Vehicles & Transport', defaultScope: 3 },
  '88': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AVIATION', industryName: 'Aircraft & Parts', defaultScope: 3 },
  '89': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'MARINE', industryName: 'Ships & Boats', defaultScope: 3 },
  '99': { productCategory: 'SERVICES', industryCode: 'PROFESSIONAL', industryName: 'Professional & Business Services', defaultScope: 3 },
};

export function classifyByHSN(hsnCode: string | null | undefined): HsnClass | null {
  if (!hsnCode) return null;
  const code = String(hsnCode).replace(/\s+/g, '');
  for (const prefix of [code.substring(0, 4), code.substring(0, 2)]) {
    const hit = HSN_MASTER[prefix];
    if (hit) {
      return {
        productCategory: hit.productCategory,
        industryCode: hit.industryCode,
        industryName: hit.industryName,
        scope: hit.defaultScope,
      };
    }
  }
  return null;
}

export interface KeywordClass {
  productCategory: string;
  industryCode: string;
  scope: number;
  fuelType?: FuelType;
}

const fuel = (fuelType: FuelType): KeywordClass => ({ productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType });
const elec: KeywordClass = { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 };
const c = (productCategory: string, industryCode: string, scope: number): KeywordClass => ({ productCategory, industryCode, scope });

// Only specific terms, matched as whole words. Short or generic words that
// produced false matches were removed: ms, fo, tel, kw, unit, units, power,
// fuel, server, switch, plus furnace (equipment, not oil), carrier (AC brand),
// organic (matched "organic chemicals" as green), led (verb), cloud, compute
// and subscription.
export const KEYWORD_MAP: Record<string, KeywordClass> = {
  // Fuels - Scope 1 (including common OCR misreads)
  diesel: fuel('DIESEL'), deisel: fuel('DIESEL'), disel: fuel('DIESEL'), d1esel: fuel('DIESEL'),
  hsd: fuel('DIESEL'), 'high speed diesel': fuel('DIESEL'),
  petrol: fuel('PETROL'), petro: fuel('PETROL'), petr0l: fuel('PETROL'), gasoline: fuel('PETROL'), 'motor spirit': fuel('PETROL'),
  cng: fuel('CNG'),
  lpg: fuel('LPG'), 'l.p.g': fuel('LPG'),
  coal: fuel('COAL'),
  'furnace oil': fuel('FURNACE_OIL'),
  naphtha: fuel('NAPHTHA'),
  png: fuel('PNG'), 'piped gas': fuel('PNG'), 'piped natural gas': fuel('PNG'), 'natural gas': fuel('PNG'),
  kerosene: fuel('KEROSENE'), sko: fuel('KEROSENE'),
  // Electricity - always Scope 2
  electricity: elec, electy: elec, elec: elec, 'elec bill': elec, 'electric bill': elec, 'power bill': elec,
  'energy charges': elec, 'units consumed': elec, kwh: elec,
  bijli: elec, vidyut: elec, discom: elec, msedcl: elec, tpddl: elec, bses: elec, cesc: elec,
  bescom: elec, tneb: elec, pspcl: elec, 'punjab state power': elec,
  // Transport - Scope 3
  freight: c('TRANSPORT', 'LOGISTICS', 3), transport: c('TRANSPORT', 'LOGISTICS', 3),
  logistics: c('TRANSPORT', 'LOGISTICS', 3), courier: c('TRANSPORT', 'LOGISTICS', 3),
  shipping: c('TRANSPORT', 'LOGISTICS', 3), trucking: c('TRANSPORT', 'LOGISTICS', 3),
  lorry: c('TRANSPORT', 'LOGISTICS', 3), dhl: c('TRANSPORT', 'LOGISTICS', 3),
  fedex: c('TRANSPORT', 'LOGISTICS', 3), bluedart: c('TRANSPORT', 'LOGISTICS', 3),
  delhivery: c('TRANSPORT', 'LOGISTICS', 3), delivery: c('TRANSPORT', 'LOGISTICS', 3),
  // Raw materials - Scope 3
  steel: c('RAW_MATERIAL', 'STEEL', 3), iron: c('RAW_MATERIAL', 'STEEL', 3), tmt: c('RAW_MATERIAL', 'STEEL', 3), rebar: c('RAW_MATERIAL', 'STEEL', 3),
  plastic: c('RAW_MATERIAL', 'PLASTIC', 3), polymer: c('RAW_MATERIAL', 'PLASTIC', 3),
  hdpe: c('RAW_MATERIAL', 'PLASTIC', 3), ldpe: c('RAW_MATERIAL', 'PLASTIC', 3), pvc: c('RAW_MATERIAL', 'PLASTIC', 3),
  paper: c('RAW_MATERIAL', 'PAPER', 3), cardboard: c('RAW_MATERIAL', 'PAPER', 3), carton: c('RAW_MATERIAL', 'PAPER', 3),
  cement: c('RAW_MATERIAL', 'CEMENT', 3), concrete: c('RAW_MATERIAL', 'CEMENT', 3),
  aluminium: c('RAW_MATERIAL', 'ALUMINIUM', 3), aluminum: c('RAW_MATERIAL', 'ALUMINIUM', 3),
  copper: c('RAW_MATERIAL', 'COPPER', 3),
  textile: c('RAW_MATERIAL', 'TEXTILE', 3), fabric: c('RAW_MATERIAL', 'TEXTILE', 3),
  cotton: c('RAW_MATERIAL', 'TEXTILE', 3), yarn: c('RAW_MATERIAL', 'TEXTILE', 3),
  wood: c('RAW_MATERIAL', 'WOOD', 3), timber: c('RAW_MATERIAL', 'WOOD', 3), plywood: c('RAW_MATERIAL', 'WOOD', 3),
  rubber: c('RAW_MATERIAL', 'RUBBER', 3), glass: c('RAW_MATERIAL', 'GLASS', 3),
  // Waste - Scope 3
  waste: c('WASTE', 'WASTE_MANAGEMENT', 3), disposal: c('WASTE', 'WASTE_MANAGEMENT', 3),
  recycling: c('WASTE', 'WASTE_MANAGEMENT', 3), scrap: c('WASTE', 'WASTE_MANAGEMENT', 3),
  garbage: c('WASTE', 'WASTE_MANAGEMENT', 3), kachra: c('WASTE', 'WASTE_MANAGEMENT', 3),
  // Green categories (avoided emissions, reported separately)
  solar: c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar panel': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar power': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  'solar energy': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'pv module': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  photovoltaic: c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar inverter': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  'electric vehicle': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1), 'ev charging': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  'ev battery': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1), 'e-rickshaw': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  'e-scooter': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  forestation: c('FORESTATION', 'GREEN_LAND', 3), sapling: c('FORESTATION', 'GREEN_LAND', 3),
  saplings: c('FORESTATION', 'GREEN_LAND', 3), 'tree planting': c('FORESTATION', 'GREEN_LAND', 3),
  afforestation: c('FORESTATION', 'GREEN_LAND', 3),
  'wind turbine': c('WIND_ENERGY', 'GREEN_ENERGY', 2), windmill: c('WIND_ENERGY', 'GREEN_ENERGY', 2),
  'wind energy': c('WIND_ENERGY', 'GREEN_ENERGY', 2),
  biogas: c('BIOGAS', 'GREEN_ENERGY', 1), biomethane: c('BIOGAS', 'GREEN_ENERGY', 1), 'bio-gas': c('BIOGAS', 'GREEN_ENERGY', 1),
  compost: c('ORGANIC_INPUT', 'GREEN_AGRI', 3), 'bio-fertilizer': c('ORGANIC_INPUT', 'GREEN_AGRI', 3),
  vermicompost: c('ORGANIC_INPUT', 'GREEN_AGRI', 3),
  'led light': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'led bulb': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  'led lamp': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'energy efficient': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  bldc: c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'star rated': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  rainwater: c('WATER_CONSERVATION', 'GREEN_WATER', 3), 'water recycling': c('WATER_CONSERVATION', 'GREEN_WATER', 3),
  'rain harvesting': c('WATER_CONSERVATION', 'GREEN_WATER', 3),
  'recycled material': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3), 'r-pet': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3),
  'recycled plastic': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3), 'recycled paper': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3),
  // Cloud, software, IT hardware - Scope 3 (spend-based; no activity factor applied here)
  aws: c('CLOUD_SERVICES', 'CLOUD', 3), 'amazon web services': c('CLOUD_SERVICES', 'CLOUD', 3),
  azure: c('CLOUD_SERVICES', 'CLOUD', 3), gcp: c('CLOUD_SERVICES', 'CLOUD', 3),
  'google cloud': c('CLOUD_SERVICES', 'CLOUD', 3), 'cloud hosting': c('CLOUD_SERVICES', 'CLOUD', 3),
  'data center': c('CLOUD_SERVICES', 'CLOUD', 3), 'data centre': c('CLOUD_SERVICES', 'CLOUD', 3),
  'software license': c('SOFTWARE', 'SOFTWARE', 3), saas: c('SOFTWARE', 'SOFTWARE', 3), 'platform fee': c('SOFTWARE', 'SOFTWARE', 3),
  laptop: c('IT_HARDWARE', 'IT_EQUIPMENT', 3), 'rack server': c('IT_HARDWARE', 'IT_EQUIPMENT', 3),
  'network switch': c('IT_HARDWARE', 'IT_EQUIPMENT', 3), router: c('IT_HARDWARE', 'IT_EQUIPMENT', 3), networking: c('IT_HARDWARE', 'IT_EQUIPMENT', 3),
  // Professional services and travel - Scope 3
  consulting: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3), advisory: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3),
  legal: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3), audit: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3),
  airfare: c('BUSINESS_TRAVEL', 'TRAVEL', 3), flight: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
  hotel: c('BUSINESS_TRAVEL', 'TRAVEL', 3), taxi: c('BUSINESS_TRAVEL', 'TRAVEL', 3), cab: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
  commute: c('BUSINESS_TRAVEL', 'TRAVEL', 3), ola: c('BUSINESS_TRAVEL', 'TRAVEL', 3), uber: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
};

const SORTED_KEYWORDS = Object.entries(KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORD_PATTERNS: Array<[RegExp, KeywordClass]> = SORTED_KEYWORDS.map(([kw, cls]) => [
  // Whole-word match: the keyword may not touch other letters or digits.
  new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}([^a-z0-9]|$)`, 'i'),
  cls,
]);

/** Longest whole-word keyword match wins. */
export function classifyByKeyword(text: string | null | undefined): KeywordClass | null {
  const lower = (text || '').toLowerCase();
  if (!lower) return null;
  for (const [re, cls] of KEYWORD_PATTERNS) {
    if (re.test(lower)) return cls;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------
export interface EmissionCalc {
  kind: 'emission';
  /** Quantity converted to the factor's canonical unit. */
  quantity: number;
  unit: string;
  /** kgCO2e per canonical unit, so quantity x emissionFactor = co2Kg. */
  emissionFactor: number;
  co2Kg: number;
  factorSource: string;
}

export interface AvoidedCalc {
  kind: 'avoided';
  quantity: number;
  unit: string;
  avoidedFactor: number;
  /** Always >= 0. Never subtracted from gross emissions. */
  avoidedCo2Kg: number;
  factorSource: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function applyFactor(quantity: number, rawUnit: string, factor: Factor): { quantity: number; unit: string; perUnit: number; kg: number } | null {
  const input = normalizeUnit(rawUnit);
  const factorUnit = normalizeUnit(factor.unit);
  if (!input || !factorUnit || input.unit !== factorUnit.unit) return null;
  const canonicalQty = quantity * input.multiplier;
  const perCanonical = factor.value / factorUnit.multiplier;
  return {
    quantity: round6(canonicalQty),
    unit: factorUnit.unit,
    perUnit: round6(perCanonical),
    kg: round2(canonicalQty * perCanonical),
  };
}

/**
 * Deterministic emission calculation for one classified line item.
 * Returns null when no factor applies to this category and unit.
 */
export function calculateEmissions(
  quantity: number,
  unit: string,
  scope: number,
  productCategory: string,
  fuelType?: string,
): EmissionCalc | AvoidedCalc | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || !unit) return null;

  if (scope === 1 && productCategory === 'FUEL' && fuelType && fuelType in FUEL_FACTORS) {
    const f = FUEL_FACTORS[fuelType as FuelType];
    const r = applyFactor(quantity, unit, f);
    if (r) return { kind: 'emission', quantity: r.quantity, unit: r.unit, emissionFactor: r.perUnit, co2Kg: r.kg, factorSource: `${SRC}:${fuelType}` };
    return null;
  }

  if (scope === 2 && productCategory === 'ELECTRICITY') {
    const r = applyFactor(quantity, unit, { value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', source: INDIA_GRID_FACTOR_SOURCE });
    if (r) return { kind: 'emission', quantity: r.quantity, unit: r.unit, emissionFactor: r.perUnit, co2Kg: r.kg, factorSource: `${SRC}:INDIA_GRID_AVG` };
    return null;
  }

  const avoided = AVOIDED_FACTORS[productCategory];
  if (avoided) {
    const r = applyFactor(quantity, unit, avoided);
    if (r) return { kind: 'avoided', quantity: r.quantity, unit: r.unit, avoidedFactor: r.perUnit, avoidedCo2Kg: Math.max(0, r.kg), factorSource: avoided.source };
  }
  return null;
}

/** Sum line-item emissions and avoided emissions separately, both >= 0. */
export function totalsFor(items: Array<{ co2Kg?: number | null; avoidedCo2Kg?: number | null }>): { grossCo2Kg: number; avoidedCo2Kg: number } {
  let gross = 0;
  let avoided = 0;
  for (const i of items) {
    if (typeof i.co2Kg === 'number' && Number.isFinite(i.co2Kg) && i.co2Kg > 0) gross += i.co2Kg;
    if (typeof i.avoidedCo2Kg === 'number' && Number.isFinite(i.avoidedCo2Kg) && i.avoidedCo2Kg > 0) avoided += i.avoidedCo2Kg;
  }
  return { grossCo2Kg: round2(gross), avoidedCo2Kg: round2(avoided) };
}
