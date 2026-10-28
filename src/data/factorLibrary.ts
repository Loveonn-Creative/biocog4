// Emission factor library: one public page per factor the platform applies to
// invoices. Every number is read from the live factor table (src/lib/factors),
// so a page can never drift from the calculation. Basis lines repeat the
// derivations documented in supabase/functions/_shared/emissionFactors.ts.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';
import { clampDescription, fitTitle, type PageMeta } from '@/lib/seo/seoMeta';

export interface FactorPage {
  slug: string;
  name: string;
  /** Lower-case name for running text. */
  noun: string;
  /** Shorter name for the page title, when the full name is too long. */
  titleName?: string;
  value: number;
  /** Unit the factor is per, as written on invoices. */
  unit: string;
  unitPlural: string;
  scope: 1 | 2;
  hsn: string;
  hsnLabel: string;
  invoiceTerms: string;
  exampleQty: number;
  basis: string;
  caveat?: string;
}

const IPCC = 'IPCC 2006 Guidelines, Vol. 2, Tables 1.2 and 1.4';

export const FACTOR_PAGES: FactorPage[] = [
  {
    slug: 'diesel', name: 'Diesel', noun: 'diesel', value: FUEL_FACTORS.DIESEL.value, unit: 'litre', unitPlural: 'litres', scope: 1,
    hsn: '2710', hsnLabel: 'Petroleum oils', invoiceTerms: 'HSD, High Speed Diesel, diesel', exampleQty: 500,
    basis: `${IPCC}: gas/diesel oil 74,100 kg CO2 per TJ × 43.0 TJ per Gg = 3.19 kg CO2 per kg, × 0.83 kg per litre (CEA CO2 Baseline Database, Appendix B) = 2.645 kg CO2 per litre.`,
  },
  {
    slug: 'petrol', name: 'Petrol', noun: 'petrol', value: FUEL_FACTORS.PETROL.value, unit: 'litre', unitPlural: 'litres', scope: 1,
    hsn: '2710', hsnLabel: 'Petroleum oils', invoiceTerms: 'MS, Motor Spirit, petrol', exampleQty: 200,
    basis: `${IPCC}: motor gasoline 69,300 kg CO2 per TJ × 44.3 TJ per Gg = 3.07 kg CO2 per kg, at 1.411 kilolitres per tonne (PPAC Ready Reckoner, Table 9.2) = 2.176 kg CO2 per litre.`,
  },
  {
    slug: 'lpg', name: 'LPG', noun: 'LPG', value: FUEL_FACTORS.LPG.value, unit: 'kg', unitPlural: 'kg', scope: 1,
    hsn: '2711', hsnLabel: 'Petroleum gases', invoiceTerms: 'LPG, commercial cylinder (19 kg), domestic cylinder (14.2 kg)', exampleQty: 190,
    basis: `${IPCC}: 63,100 kg CO2 per TJ × 47.3 TJ per Gg = 2.98 kg CO2 per kg. CO2 from combustion; CH4 and N2O add well under 1% at IPCC defaults.`,
  },
  {
    slug: 'cng', name: 'CNG', noun: 'CNG', value: FUEL_FACTORS.CNG.value, unit: 'kg', unitPlural: 'kg', scope: 1,
    hsn: '2711', hsnLabel: 'Petroleum gases', invoiceTerms: 'CNG, compressed natural gas (sold by kg)', exampleQty: 300,
    basis: `${IPCC}: natural gas 56,100 kg CO2 per TJ × 48.0 TJ per Gg = 2.69 kg CO2 per kg. CNG is natural gas sold by mass, so it uses the same IPCC basis as PNG.`,
  },
  {
    slug: 'png', name: 'Piped natural gas (PNG)', titleName: 'PNG', noun: 'piped natural gas', value: FUEL_FACTORS.PNG.value, unit: 'scm', unitPlural: 'scm', scope: 1,
    hsn: '2711', hsnLabel: 'Petroleum gases', invoiceTerms: 'PNG, natural gas, standard cubic metres (scm)', exampleQty: 1000,
    basis: `${IPCC}: natural gas 56,100 kg CO2 per TJ × 48.0 TJ per Gg = 2.69 kg CO2 per kg, × 0.76 kg per scm = 2.05 kg CO2 per scm.`,
    caveat: 'The 0.76 kg per scm density is an assumption for typical pipeline gas; a supplier calorific value per scm should replace it when available.',
  },
  {
    slug: 'coal', name: 'Coal', noun: 'coal', value: FUEL_FACTORS.COAL.value, unit: 'kg', unitPlural: 'kg', scope: 1,
    hsn: '2701', hsnLabel: 'Coal', invoiceTerms: 'coal, steam coal, non-coking coal', exampleQty: 10000,
    basis: 'CEA CO2 Baseline Database, Appendix B: Indian coal 90.6 g CO2 per MJ × 3,755 kcal per kg × 4.1868 kJ per kcal = 1.42 kg CO2 per kg. A bill that states a calorific value is calculated from it; imported, bituminous or steam coal uses the IPCC bituminous coal factor, 2.44 kg CO2 per kg.',
    caveat: 'Coal varies widely by grade and moisture. Use the supplier’s gross calorific value when the invoice or test certificate gives it.',
  },
  {
    slug: 'furnace-oil', name: 'Furnace oil', noun: 'furnace oil', value: FUEL_FACTORS.FURNACE_OIL.value, unit: 'litre', unitPlural: 'litres', scope: 1,
    hsn: '2710', hsnLabel: 'Petroleum oils', invoiceTerms: 'FO, furnace oil, LSHS', exampleQty: 2000,
    basis: `${IPCC}: residual fuel oil 77,400 kg CO2 per TJ × 40.4 TJ per Gg = 3.13 kg CO2 per kg, × 0.95 kg per litre = 2.97 kg CO2 per litre.`,
    caveat: 'The 0.95 kg per litre density is an assumption; supplier density should replace it when available.',
  },
  {
    slug: 'naphtha', name: 'Naphtha', noun: 'naphtha', value: FUEL_FACTORS.NAPHTHA.value, unit: 'kg', unitPlural: 'kg', scope: 1,
    hsn: '2710', hsnLabel: 'Petroleum oils', invoiceTerms: 'naphtha (sold by weight)', exampleQty: 1000,
    basis: `${IPCC}: 73,300 kg CO2 per TJ × 44.5 TJ per Gg = 3.26 kg CO2 per kg.`,
    caveat: 'IPCC gives naphtha per kg only, so no density is assumed: naphtha billed in litres gets no factor and is flagged for review.',
  },
  {
    slug: 'kerosene', name: 'Kerosene', noun: 'kerosene', value: FUEL_FACTORS.KEROSENE.value, unit: 'litre', unitPlural: 'litres', scope: 1,
    hsn: '2710', hsnLabel: 'Petroleum oils', invoiceTerms: 'SKO, superior kerosene oil, kerosene', exampleQty: 200,
    basis: `${IPCC}: other kerosene 71,900 kg CO2 per TJ × 43.8 TJ per Gg = 3.15 kg CO2 per kg, × 0.80 kg per litre = 2.52 kg CO2 per litre.`,
    caveat: 'The 0.80 kg per litre density is an assumption; supplier density should replace it when available.',
  },
  {
    slug: 'grid-electricity', name: 'Grid electricity', titleName: 'Grid', noun: 'grid electricity', value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', unitPlural: 'kWh', scope: 2,
    hsn: '2716', hsnLabel: 'Electrical energy', invoiceTerms: 'units consumed, billed units, kWh (1 unit = 1 kWh on Indian bills)', exampleQty: 5000,
    basis: 'India weighted-average grid factor from the CEA CO2 Baseline Database, applied location-based to the billed units on the electricity bill.',
    caveat: 'Check the current CEA user guide for the latest edition before using the figure in an audit. Rooftop solar or a green tariff is reported separately and never netted off.',
  },
];

export const FACTOR_HUB_PATH = '/emission-factors';
export const factorPath = (slug: string) => `${FACTOR_HUB_PATH}/${slug}`;
export const findFactor = (slug: string | undefined) => FACTOR_PAGES.find(f => f.slug === slug);

const fmt = (n: number, dp = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });

/** kg CO2 for a quantity, rounded the way invoices are reported. */
export const factorKg = (f: FactorPage, qty: number) => Math.round(f.value * qty * 100) / 100;

/** The one-paragraph answer that leads each page. */
export function factorAnswer(f: FactorPage): string {
  const kg = factorKg(f, f.exampleQty);
  return `Senseible uses ${f.value} kg CO2 per ${f.unit} of ${f.noun} (Scope ${f.scope}). An invoice for ${fmt(f.exampleQty, 0)} ${f.unitPlural} is ${fmt(f.exampleQty, 0)} × ${f.value} = ${fmt(kg)} kg CO2, or ${fmt(kg / 1000, 3)} tonnes.`;
}

export function factorFaqs(f: FactorPage): { question: string; answer: string }[] {
  return [
    { question: `What is the emission factor for ${f.noun} in India?`, answer: `${f.value} kg CO2 per ${f.unit}. ${f.basis}` },
    { question: `How do I calculate emissions from a ${f.noun} invoice?`, answer: `Multiply the ${f.unitPlural} on the invoice by ${f.value}. For ${fmt(f.exampleQty, 0)} ${f.unitPlural}: ${fmt(factorKg(f, f.exampleQty))} kg CO2.` },
    { question: `Is ${f.noun} Scope 1 or Scope 2?`, answer: f.scope === 1 ? `Scope 1, when the fuel is burned in equipment or vehicles the business owns or controls. Fuel burned by a hired transporter is that transporter’s Scope 1 and your Scope 3.` : 'Scope 2: indirect emissions from purchased electricity, reported location-based from the billed units.' },
  ];
}

export const FACTOR_HUB_ANSWER = `The emission factors Senseible applies to Indian invoices, one per fuel and for grid electricity. Each page shows the factor, how it is derived, the HSN heading it appears under and a worked invoice.`;

export function factorMeta(f: FactorPage): PageMeta {
  return {
    title: fitTitle(`${f.titleName ?? f.name} Emission Factor India: ${f.value} kg CO2 per ${f.unit}`),
    description: clampDescription(`${factorAnswer(f)} HSN ${f.hsn}, Scope ${f.scope}, with the derivation and a worked invoice.`),
  };
}

export const FACTOR_HUB_META: PageMeta = {
  title: fitTitle('Emission Factors for Indian Invoices: Fuels and Grid'),
  description: clampDescription(`${FACTOR_HUB_ANSWER}`),
};
