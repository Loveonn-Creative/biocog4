// Reviewed, data-backed copy for the solution pages that are indexed. Every
// figure is either computed from the CBAM engine at build time or cites an
// official source. Pages not listed in INDEXED_SOLUTION_SLUGS stay reachable
// but are noindexed until they get the same treatment (see SolutionPage use
// in src/pages/Solutions.tsx and src/lib/seo/routeRegistry.ts).
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from '@/lib/cbamEngine';
import type { SolutionFAQ } from './solutionsData';

export const INDEXED_SOLUTION_SLUGS = new Set([
  'cbam-steel-india', 'cbam-chemicals-india', 'cbam-steel-bangladesh', 'cbam-steel-vietnam', 'cbam-chemicals-vietnam',
  'scope3-steel-india', 'scope3-textile-india', 'scope3-chemicals-india', 'scope3-textile-bangladesh', 'scope3-textile-vietnam',
  'carbon-audit-manufacturing-india', 'carbon-audit-manufacturing-bangladesh', 'carbon-audit-manufacturing-vietnam',
]);

const euro = (n: number) => `€${Math.round(n).toLocaleString('en-US')}`;

/** Computed CBAM cost rows for 1,000 tonnes, verified data vs default value. */
function cbamRows(sectorId: string, routeId: string, countryCode: string) {
  const common = { sectorId, productionRouteId: routeId, countryCode, supplierName: 'Example', tonnage: 1000, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
  // Use the route's typical intensity as the "verified" figure, so the two
  // rows differ only by the default-value mark-up.
  const route = calculateCBAM({ ...common, actualEmissionsIntensity: null }).emissionsIntensityUsed;
  const verified = calculateCBAM({ ...common, actualEmissionsIntensity: route });
  const fallback = calculateCBAM({ ...common, actualEmissionsIntensity: null });
  const at = (r: typeof verified, y: number) => r.yearlyResults.find(x => x.year === y)!.netCbamCost;
  return [
    { item: `Intensity assumed (${verified.routeName})`, value: `${route} tCO2 per tonne` },
    { item: 'Estimated CBAM cost, 2026, 1,000 t, verified data', value: euro(at(verified, 2026)) },
    { item: 'Same shipment, default value with 10% mark-up', value: euro(at(fallback, 2026)) },
    { item: 'Estimated cost, 2030 (verified data)', value: euro(at(verified, 2030)) },
    { item: 'Estimated cost, 2034 (no free allocation)', value: euro(at(verified, 2034)) },
    { item: 'Certificate price used', value: `€${DEFAULT_EU_ETS_PRICE} (Q3 2026, European Commission)` },
  ];
}

const CBAM_FAQ_WHO_PAYS: SolutionFAQ = {
  question: 'Who pays CBAM, the exporter or the EU buyer?',
  answer: 'The EU importer, as an authorised CBAM declarant, buys and surrenders certificates; the first annual declaration for 2026 imports is due by 30 September 2027. The exporter supplies verified emissions data per tonne so the importer does not have to use default values with a mark-up.',
};

const VSME_FAQ: SolutionFAQ = {
  question: 'How much data can an EU buyer demand from a small supplier?',
  answer: 'Under Directive (EU) 2026/470, a company reporting under CSRD may not require suppliers with 1,000 or fewer employees to provide more than the voluntary VSME-based standard. Suppliers can still share more if they choose.',
};

export interface SolutionOverride {
  painStatement?: string;
  costBreakdown?: { item: string; value: string }[];
  faqs?: SolutionFAQ[];
}

export const solutionOverrides: Record<string, SolutionOverride> = {
  'cbam-steel-india': {
    painStatement: 'Since 1 January 2026, EU buyers of Indian steel owe CBAM certificates on every tonne of embedded emissions above the free-allocation adjustment. Coal-based routes sit well above EU benchmarks, so verified intensity data now decides your landed price.',
    costBreakdown: cbamRows('steel', 'bf-bof', 'IN'),
    faqs: [
      CBAM_FAQ_WHO_PAYS,
      { question: 'Why does verified data matter so much?', answer: 'Without it the importer uses the EU default value plus a mark-up of 10% in 2026, 20% in 2027 and 30% from 2028 (Implementing Regulation (EU) 2025/2621). In this example that adds about €17 per tonne in 2026.' },
      { question: 'Which India grid factor applies?', answer: 'For steel, CBAM counts direct emissions only. For your own Scope 2, the Central Electricity Authority CO2 Baseline Database v21.0 gives 0.710 tCO2 per MWh for FY 2024-25.' },
    ],
  },
  'cbam-chemicals-india': {
    painStatement: 'Among chemicals, CBAM covers ammonia, nitric acid, nitrogen and mixed fertilisers, potassium nitrates and hydrogen. For fertilisers both direct and indirect emissions count, so plant power and gas use both drive the cost your EU buyer pays.',
    costBreakdown: cbamRows('fertilizers', 'haber-bosch-gas', 'IN'),
    faqs: [
      CBAM_FAQ_WHO_PAYS,
      { question: 'Which chemical products are covered?', answer: 'Ammonia (CN 2814), nitric acid (2808 00 00), potassium nitrates (2834 21 00), nitrogen fertilisers (3102), mixed fertilisers (3105, except 3105 60 00) and hydrogen (2804 10 00). Dyes, specialty and most organic chemicals are not covered.' },
      { question: 'What mark-up applies to fertiliser default values?', answer: '1% from 2026, under Implementing Regulation (EU) 2025/2621, compared with 10% to 30% for steel, aluminium, cement and hydrogen.' },
    ],
  },
  'cbam-steel-bangladesh': {
    painStatement: 'Bangladeshi steel shipped to the EU is a CBAM good from 1 January 2026. Re-rolling mills that buy billets must account for the billets\' embedded emissions as well as their own, so supplier data matters as much as plant data.',
    costBreakdown: cbamRows('steel', 'eaf-dri', 'BD'),
    faqs: [
      CBAM_FAQ_WHO_PAYS,
      { question: 'Does the 50-tonne exemption help?', answer: 'Only at the importer level: an EU importer bringing in 50 tonnes or less of covered goods in a year is exempt. Once it exceeds 50 tonnes, all of that year\'s imports are covered.' },
    ],
  },
  'cbam-steel-vietnam': {
    painStatement: 'Vietnamese steel sold to the EU now carries a CBAM cost for the importer on every tonne above the free-allocation adjustment. Scrap-based electric arc furnace mills can sit below the benchmark in early years; blast-furnace mills cannot.',
    costBreakdown: cbamRows('steel', 'bf-bof', 'VN'),
    faqs: [
      CBAM_FAQ_WHO_PAYS,
      { question: 'Does a scrap-based EAF mill owe anything in 2026?', answer: 'If its verified intensity is below the adjusted EU benchmark, the 2026 estimate is zero. As free allocation falls to 0% in 2034, a cost appears, but it stays far below blast-furnace steel.' },
    ],
  },
  'cbam-chemicals-vietnam': {
    painStatement: 'Vietnamese ammonia, nitrogen fertiliser and hydrogen exports to the EU are CBAM goods from 2026. Most other chemicals are not covered, so the first step is checking each product against the CN codes.',
    costBreakdown: cbamRows('fertilizers', 'haber-bosch-coal', 'VN'),
    faqs: [
      CBAM_FAQ_WHO_PAYS,
      { question: 'Is hydrogen subject to the 50-tonne exemption?', answer: 'No. Importers of hydrogen and electricity are always covered, whatever the volume.' },
    ],
  },
  'scope3-steel-india': {
    painStatement: 'Steel buyers and lenders increasingly ask for value-chain emissions: purchased iron ore, coal, ferro-alloys and freight. Measuring them starts with purchase invoices and supplier data, with Scope 1 and 2 calculated from fuel and power bills.',
    costBreakdown: [
      { item: 'Main Scope 3 categories for steel', value: 'Cat 1 (purchased goods), Cat 4 (inbound freight)' },
      { item: 'India grid factor for Scope 2', value: '0.710 tCO2/MWh (CEA v21.0, FY 2024-25)' },
      { item: 'Method guidance', value: 'GHG Protocol Corporate Value Chain (Scope 3) Standard' },
    ],
    faqs: [
      { question: 'Is Scope 3 needed for CBAM?', answer: 'No. CBAM uses installation-level direct emissions (and precursors) per product. Scope 3 is what corporate buyers and lenders ask for.' },
    ],
  },
  'scope3-textile-india': {
    painStatement: 'EU brands reporting under CSRD need emissions data from their suppliers. For an Indian textile exporter, that usually means facility Scope 1 and 2 from fuel and electricity bills, allocated to the garments or fabric each buyer purchases.',
    costBreakdown: [
      { item: 'What buyers ask first', value: 'Facility Scope 1 and 2, with factors and sources' },
      { item: 'India grid factor', value: '0.710 tCO2/MWh (CEA v21.0, FY 2024-25)' },
      { item: 'Worked example: 2,400 MWh a year', value: '1,704 tCO2 Scope 2 (location-based)' },
      { item: 'CBAM', value: 'Does not apply to textiles' },
    ],
    faqs: [VSME_FAQ, { question: 'Do Indian textile exporters fall under CBAM?', answer: 'No. CBAM covers iron and steel, aluminium, cement, fertilisers, hydrogen and electricity only.' }],
  },
  'scope3-chemicals-india': {
    painStatement: 'Chemical buyers and lenders ask for value-chain emissions, especially purchased feedstocks and freight. Start from purchase and logistics invoices, and calculate your own Scope 1 and 2 from fuel and power records.',
    costBreakdown: [
      { item: 'Main Scope 3 categories', value: 'Cat 1 (feedstocks), Cat 4 (inbound freight), Cat 12 (end of life, where relevant)' },
      { item: 'India grid factor', value: '0.710 tCO2/MWh (CEA v21.0, FY 2024-25)' },
      { item: 'Method guidance', value: 'GHG Protocol Scope 3 Standard' },
    ],
    faqs: [{ question: 'Are my chemicals covered by CBAM?', answer: 'Only ammonia, nitric acid, nitrogen and mixed fertilisers, potassium nitrates and hydrogen are CBAM goods. Other chemicals are not, but buyers may still ask for product footprints.' }],
  },
  'scope3-textile-bangladesh': {
    painStatement: 'Bangladesh shipped US$19.71 billion of garments to the EU in FY 2024-25, about half of all RMG exports (EPB data reported by BSS). EU brands reporting under CSRD now ask suppliers for facility emissions to build their Scope 3.',
    costBreakdown: [
      { item: 'RMG exports to the EU, FY 2024-25', value: 'US$19.71 billion (EPB, via BSS)' },
      { item: 'What buyers ask first', value: 'Facility Scope 1 and 2, allocated per piece or kg' },
      { item: 'Grid factor to use', value: 'Official Bangladesh factor (government BUR or DoE), with year stated' },
      { item: 'CBAM', value: 'Does not apply to garments' },
    ],
    faqs: [VSME_FAQ],
  },
  'scope3-textile-vietnam': {
    painStatement: 'Vietnam\'s textile and garment exports reached an estimated US$46 billion in 2025 (VITAS). EU buyers reporting under CSRD need each supplier\'s facility emissions, which a factory can calculate from 12 months of electricity and fuel bills.',
    costBreakdown: [
      { item: 'Textile and garment exports, 2025', value: 'About US$46 billion (VITAS estimate)' },
      { item: 'Vietnam grid factor, 2024', value: 'About 0.68 tCO2e/MWh (study with the Ministry of Agriculture and Environment)' },
      { item: 'CBAM', value: 'Does not apply to textiles' },
    ],
    faqs: [VSME_FAQ],
  },
  'carbon-audit-manufacturing-india': {
    painStatement: 'A carbon audit sets your baseline: Scope 1 from fuel, Scope 2 from electricity, and the main Scope 3 sources from purchases. It is the starting point for buyer questionnaires, BRSR customers and green loan applications.',
    costBreakdown: [
      { item: 'Documents needed', value: '12 months of electricity, fuel and freight bills; key purchase invoices' },
      { item: 'India grid factor', value: '0.710 tCO2/MWh (CEA v21.0, FY 2024-25)' },
      { item: 'Method', value: 'GHG Protocol Corporate Standard' },
    ],
    faqs: [{ question: 'What documents do I need for a carbon audit?', answer: 'Electricity bills, fuel purchase invoices, freight receipts and raw material purchase orders for the reporting period, usually 12 months.' }],
  },
  'carbon-audit-manufacturing-bangladesh': {
    painStatement: 'International buyers and lenders increasingly ask Bangladeshi manufacturers for an emissions baseline. A carbon audit from fuel, electricity and purchase records gives one consistent set of figures to share.',
    costBreakdown: [
      { item: 'Documents needed', value: '12 months of electricity, fuel and freight bills; key purchase invoices' },
      { item: 'Grid factor to use', value: 'Official Bangladesh factor (government BUR or DoE), with year stated' },
      { item: 'Method', value: 'GHG Protocol Corporate Standard' },
    ],
    faqs: [{ question: 'Is carbon auditing mandatory in Bangladesh?', answer: 'Not for SMEs at present. Buyers and lenders ask for it, which is why many exporters measure voluntarily.' }],
  },
  'carbon-audit-manufacturing-vietnam': {
    painStatement: 'FDI buyers and lenders increasingly ask Vietnamese manufacturers for an emissions baseline. A carbon audit from fuel, electricity and purchase records, using the official national grid factor, gives one consistent set of figures.',
    costBreakdown: [
      { item: 'Documents needed', value: '12 months of electricity, fuel and freight bills; key purchase invoices' },
      { item: 'Vietnam grid factor, 2024', value: 'About 0.68 tCO2e/MWh (use the official Department of Climate Change value when published)' },
      { item: 'Method', value: 'GHG Protocol Corporate Standard' },
    ],
    faqs: [{ question: 'Which grid factor should a Vietnamese factory use?', answer: 'The annual grid emission factor announced by the Department of Climate Change for the reporting year, with the year and source stated.' }],
  },
};
