// Free templates at /templates. One source of truth for the page, the files
// built in the browser and the prerendered SEO copy, so what a reader previews
// is exactly what they download.
//
// Facts behind the fields:
// - BRSR supplier fields: SEBI BRSR Core circular (12 July 2023) and the
//   ease-of-doing-business circular (28 March 2025): value chain partners at 2%
//   or more of purchases or sales, coverage may stop at 75%, prior-year figures
//   voluntary in the first year, coverage share must be stated.
// - CBAM supplier pack: European Commission CBAM Guidance No. 1 and No. 2 for
//   non-EU operators (definitive period): installation identity, specific
//   embedded emissions, specific embedded free allocation, carbon price paid,
//   qualifying parameters (Annex IV of the Methodology Act), precursors.
// - Register factors: the platform's own table (@/lib/factors), so the
//   spreadsheet and the invoice reader always agree.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';
import { clampDescription, fitTitle } from '@/lib/seo/seoMeta';

export const TEMPLATES_PATH = '/templates';

export type Audience = 'supplier' | 'buyer';

export interface TemplateField {
  label: string;
  /** Example value shown in the preview (never real company data). */
  example: string;
  hint?: string;
  /** Which reader fills this in. */
  by: Audience;
}

export interface TemplateSection { name: string; fields: TemplateField[] }

export interface TemplateDoc {
  slug: string;
  name: string;
  /** Short tab label in the sheet preview. */
  tab: string;
  h1: string;
  answer: string;
  whoFor: string;
  saves: string;
  format: 'xlsx' | 'txt';
  fileName: string;
  sections: TemplateSection[];
  steps: { title: string; text: string }[];
  sources: { label: string; url: string }[];
  title: string;
  description: string;
}

const SEBI_2023 = 'https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html';
const SEBI_2025 = 'https://www.sebi.gov.in/legal/circulars/mar-2025/measures-to-facilitate-ease-of-doing-business-with-respect-to-framework-for-assurance-or-assessment-esg-disclosures-for-value-chain-and-introduction-of-voluntary-disclosure-on-green-credits_93102.html';
const CBAM_G2 = 'https://taxation-customs.ec.europa.eu/document/download/91e1056c-4524-4705-aaa7-e25c1439a87a_en?filename=Guidance%20No.%202%20-%20Quick%20guide%20for%20non-EU%20operators%20on%20CBAM%20implementation.pdf';
const CBAM_G1 = 'https://taxation-customs.ec.europa.eu/document/download/031abf60-21a9-4822-b258-ac8b111d8358_en?filename=Guidance%20No.%201%20-%20Introduction%20to%20CBAM%20concepts.pdf';
const IPCC = 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html';
const CEA = 'https://cea.nic.in/cdm-co2-baseline-view?mappingId=234&lang=en';

/** Fuels in the register, in the order an MSME meets them on bills. */
export const REGISTER_FUELS = (['DIESEL', 'LPG', 'PNG', 'CNG', 'PETROL', 'FURNACE_OIL', 'COAL'] as const).map(k => ({
  key: k,
  label: { DIESEL: 'Diesel', LPG: 'LPG', PNG: 'Piped gas (PNG)', CNG: 'CNG', PETROL: 'Petrol', FURNACE_OIL: 'Furnace oil', COAL: 'Coal' }[k],
  unit: FUEL_FACTORS[k].unit,
  factor: FUEL_FACTORS[k].value,
  source: FUEL_FACTORS[k].source,
}));
export const REGISTER_GRID = { label: 'Grid electricity', unit: 'kWh', factor: INDIA_GRID_FACTOR_KG_PER_KWH, source: 'CEA CO2 Baseline Database, India weighted average, FY 2025-26 (0.675)' };
export const REGISTER_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const S = (by: Audience) => (label: string, example: string, hint?: string): TemplateField => ({ label, example, hint, by });
const sup = S('supplier');
const buy = S('buyer');

const docs: Omit<TemplateDoc, 'title' | 'description'>[] = [
  {
    slug: 'brsr-supplier-questionnaire',
    name: 'BRSR supplier questionnaire',
    tab: 'BRSR',
    h1: 'BRSR supplier questionnaire template',
    answer: 'A ready spreadsheet for the value chain questions a listed customer sends under SEBI BRSR Core: company details, boundary, Scope 1 by fuel, Scope 2 from electricity, energy, water and waste, with a unit and source beside every number.',
    whoFor: 'MSMEs that supply a listed company, and the sustainability teams who send the questions.',
    saves: 'Suppliers answer once in the order buyers ask. Buyers get answers they can compare instead of a different format from every supplier.',
    format: 'xlsx',
    fileName: 'senseible-brsr-supplier-questionnaire.xlsx',
    sections: [
      { name: 'Company and period', fields: [
        sup('Legal name', 'Shree Ganesh Castings Pvt Ltd', 'The entity you invoice the customer from'),
        sup('GSTIN', '27ABCDE1234F1Z5', 'Example format only'),
        sup('Reporting period', 'Apr 2025 to Mar 2026', 'Match the customer’s financial year'),
        sup('Boundary', 'Plant 1, MIDC Ahilyanagar; office excluded', 'Say what is left out and why'),
        sup('Contact for questions', 'Plant manager, name and email'),
      ] },
      { name: 'Emissions', fields: [
        sup('Scope 1: diesel', '4,200 litres × 2.645 = 11.11 t CO2', 'One line per fuel, with quantity, unit, factor and source'),
        sup('Scope 1: LPG', '1,900 kg × 2.98 = 5.66 t CO2'),
        sup('Scope 2: grid electricity', '312,000 kWh × 0.675 = 210.60 t CO2', 'CEA grid factor, with the database version'),
        sup('Scope 3', 'Not asked', 'Leave blank unless the form asks; say so rather than guess'),
      ] },
      { name: 'Energy, water, waste', fields: [
        sup('Energy, non-renewable', '1,357 GJ', 'Same quantities converted to GJ'),
        sup('Energy, renewable', '0 GJ'),
        sup('Water withdrawal by source', 'Municipal 2,100 kL; borewell 900 kL'),
        sup('Waste by category', 'Foundry sand 38 t to recycler', 'From weighbridge slips and recycler receipts'),
      ] },
      { name: 'For the buyer', fields: [
        buy('Partner share of purchases', '3.4%', 'Partners at 2% or more of purchases or sales are in scope'),
        buy('Coverage reached', '68% of purchases', 'Coverage may stop at 75%; the share covered must be stated'),
        buy('Prior-year figures', 'Not requested', 'Voluntary in the first year of value chain reporting'),
      ] },
    ],
    steps: [
      { title: 'Fill the header', text: 'Legal name, GSTIN, the April to March period and the plants your figures cover.' },
      { title: 'Add one line per fuel', text: 'Quantity from your bills, the unit, the factor and its source. The sheet multiplies for you.' },
      { title: 'Add electricity', text: 'Units from your electricity bills; the sheet applies the CEA grid factor.' },
      { title: 'Check units and send', text: 'kg against tonnes is the most common slip. Offer the evidence list, not the bills, unless the contract asks.' },
    ],
    sources: [{ label: 'SEBI BRSR Core circular, July 2023', url: SEBI_2023 }, { label: 'SEBI circular, March 2025', url: SEBI_2025 }, { label: 'CEA CO2 Baseline Database', url: CEA }],
  },
  {
    slug: 'cbam-supplier-data-template',
    name: 'CBAM supplier data template',
    tab: 'CBAM',
    h1: 'CBAM supplier data template for Indian exporters',
    answer: 'The data pack an EU importer needs from an Indian installation for the CBAM definitive period, in one sheet: installation identity, CN code, specific embedded emissions, free allocation data, carbon price paid, qualifying parameters and precursors.',
    whoFor: 'Indian steel, aluminium, cement and fertiliser exporters, and the EU buyers who request their data.',
    saves: 'One complete pack per installation and year instead of a new email thread with every buyer, and no default values charged for missing fields.',
    format: 'xlsx',
    fileName: 'senseible-cbam-supplier-data-template.xlsx',
    sections: [
      { name: 'Installation', fields: [
        sup('Installation name and address', 'Rolling mill, Raipur, Chhattisgarh'),
        sup('Production route', 'Electric induction furnace', 'As defined for the product group'),
        sup('Reporting period', 'Calendar year 2026', 'CBAM works in calendar years'),
        sup('Registered in the CBAM Registry', 'Yes, operator account', 'If not, the full report goes to each buyer'),
      ] },
      { name: 'Per good', fields: [
        sup('CN code (8 digits)', '7213 91 10', 'Wire rod in this example'),
        sup('Specific direct emissions', '0.00 t CO2e per tonne (fill from your report)', 'Indirect emissions are not counted for iron and steel'),
        sup('Specific embedded free allocation', 'From the operator’s report', 'New in the definitive period'),
        sup('Qualifying parameters (Annex IV)', 'Scrap share, alloy content', 'Product-specific, for example clinker content for cement'),
      ] },
      { name: 'Precursors and price', fields: [
        sup('Precursors used', 'Billets from own melt shop', 'With their embedded emissions and verification reports'),
        sup('Carbon price paid in India', 'None', 'Only with independent certification'),
        sup('Verifier and report date', 'Accredited verifier, after year end'),
      ] },
      { name: 'For the EU buyer', fields: [
        buy('Declarant EORI number', 'DE1234567890123', 'Needed to share data through the Registry'),
        buy('Tonnes imported from this installation', '1,200 t'),
        buy('Data received by', '31 May 2027', 'Annual declaration is due by 30 September 2027'),
      ] },
    ],
    steps: [
      { title: 'Identify the installation', text: 'Name, address, production route and the calendar year the figures cover.' },
      { title: 'List each good by CN code', text: 'Eight-digit CN code with specific direct emissions per tonne and, where in scope, indirect.' },
      { title: 'Add free allocation, price and parameters', text: 'Specific embedded free allocation, any certified carbon price paid, and the Annex IV qualifying parameters.' },
      { title: 'Attach precursors and verification', text: 'Precursor emissions and the verifier’s report, then share through the Registry or send to each buyer.' },
    ],
    sources: [{ label: 'European Commission CBAM Guidance No. 2', url: CBAM_G2 }, { label: 'European Commission CBAM Guidance No. 1', url: CBAM_G1 }],
  },
  {
    slug: 'monthly-emissions-register',
    name: 'Monthly emissions register',
    tab: 'Register',
    h1: 'Monthly emissions register (Excel, with formulas)',
    answer: 'A twelve-month Excel register for Scope 1 fuels and Scope 2 electricity. Type the quantity from each bill and the formulas multiply it by the same emission factors Senseible uses, giving kg CO2 per month and a yearly total.',
    whoFor: 'Factory owners and accountants who want a carbon number before buying any software.',
    saves: 'No factor hunting and no formula errors: the factors and their sources are already in the sheet.',
    format: 'xlsx',
    fileName: 'senseible-monthly-emissions-register.xlsx',
    sections: [
      { name: 'Scope 1 fuels', fields: REGISTER_FUELS.map(f => sup(`${f.label} (${f.unit})`, `× ${f.factor} kg CO2 per ${f.unit}`, f.source)) },
      { name: 'Scope 2 electricity', fields: [sup(`${REGISTER_GRID.label} (kWh)`, `× ${REGISTER_GRID.factor} kg CO2 per kWh`, REGISTER_GRID.source)] },
    ],
    steps: [
      { title: 'Pick the month', text: 'One row per month, April to March.' },
      { title: 'Type quantities from bills', text: 'Litres of diesel, kg of LPG, units of electricity. Leave a cell empty if you did not buy that fuel.' },
      { title: 'Read the totals', text: 'Each row shows kg CO2 for Scope 1 and Scope 2; the last row adds up the year.' },
    ],
    sources: [{ label: 'IPCC 2006 Guidelines, Volume 2', url: IPCC }, { label: 'CEA CO2 Baseline Database', url: CEA }],
  },
  {
    slug: 'scope-3-supplier-request-letter',
    name: 'Scope 3 supplier data request letter',
    tab: 'Letter',
    h1: 'Scope 3 supplier data request letter (template)',
    answer: 'A short, editable letter that asks a supplier for the documents they already keep, electricity bills, fuel invoices and production totals, instead of a long questionnaire. Fill in the names and dates, then copy or download it.',
    whoFor: 'Buyers collecting Scope 3 data from small suppliers who have never filled an ESG form.',
    saves: 'Suppliers reply with bills they already have, so answers come back faster and with evidence attached.',
    format: 'txt',
    fileName: 'senseible-scope-3-supplier-request-letter.txt',
    sections: [
      { name: 'You fill in', fields: [
        buy('Your company', 'Your company name'),
        buy('Supplier', 'Supplier name'),
        buy('Period', 'April 2025 to March 2026'),
        buy('Reply by', 'Two weeks from today'),
      ] },
    ],
    steps: [
      { title: 'Fill in the names and dates', text: 'Your company, the supplier, the period and a reply date.' },
      { title: 'Send it as it is', text: 'Copy the letter into email or WhatsApp, or download it as a text file.' },
      { title: 'Turn the bills into numbers', text: 'Upload what comes back to get each supplier’s emissions with the source of every figure.' },
    ],
    sources: [{ label: 'GHG Protocol Scope 3 Standard', url: 'https://ghgprotocol.org/corporate-value-chain-scope-3-standard' }],
  },
];

const SEO_TITLES: Record<string, string> = {
  'brsr-supplier-questionnaire': 'BRSR Supplier Questionnaire Template (Excel)',
  'cbam-supplier-data-template': 'CBAM Supplier Data Template (Excel)',
  'monthly-emissions-register': 'Monthly Emissions Register Template (Excel)',
  'scope-3-supplier-request-letter': 'Scope 3 Supplier Data Request Letter',
};

export const TEMPLATES: TemplateDoc[] = docs.map(d => ({
  ...d,
  title: fitTitle(SEO_TITLES[d.slug]),
  description: clampDescription(`Free ${d.name.toLowerCase()} for India. ${d.whoFor} ${d.saves}`),
}));

export const TEMPLATES_META = {
  title: fitTitle('Free ESG and Carbon Templates for Indian MSMEs'),
  description: clampDescription('Free BRSR supplier questionnaire, CBAM supplier data template, monthly emissions register with formulas and a Scope 3 supplier letter. Preview, then download.'),
};

export const templatePath = (slug: string) => `${TEMPLATES_PATH}/${slug}`;
export const findTemplate = (slug?: string) => TEMPLATES.find(t => t.slug === slug);

export interface LetterInputs { buyer: string; supplier: string; period: string; replyBy: string }

/** The Scope 3 letter, filled with the reader's inputs. Plain text so it pastes anywhere. */
export function supplierLetter(i: LetterInputs): string {
  const v = (s: string, fallback: string) => s.trim() || fallback;
  return `Subject: Energy bills for our Scope 3 reporting

Dear ${v(i.supplier, '[Supplier]')} team,

${v(i.buyer, '[Your company]')} is measuring the emissions linked to what we buy from you. Instead of a questionnaire, could you share copies of documents you already keep, for ${v(i.period, '[period]')}:

1. Electricity bills for the site that makes our products
2. Fuel invoices (diesel, LPG, PNG, coal or other fuels)
3. Your total production for the same months, in the unit you use

PDFs or phone photos are fine. We will use them only to calculate the emissions linked to our purchases, and we will share the result with you.

Could you send them by ${v(i.replyBy, '[date]')}? Reply to this message with any questions.

Thank you,
${v(i.buyer, '[Your company]')}`;
}

/** Monthly register row totals in kg CO2, from quantities keyed by fuel key or 'GRID'. */
export function registerRow(q: Record<string, number>): { scope1: number; scope2: number } {
  const scope1 = REGISTER_FUELS.reduce((s, f) => s + (Number.isFinite(q[f.key]) ? q[f.key] * f.factor : 0), 0);
  const scope2 = Number.isFinite(q.GRID) ? q.GRID * REGISTER_GRID.factor : 0;
  return { scope1, scope2 };
}

/** The high-intent next step offered after each download. The file itself is never gated. */
export interface TemplateNext {
  title: string;
  line: string;
  /** Submit button label. */
  cta: string;
  /** WhatsApp is required where the next step is a conversation. */
  phoneRequired: boolean;
  /** A self-serve route for people who would rather not talk yet. */
  link: { to: string; label: string };
}

export const TEMPLATE_NEXT: Record<string, TemplateNext> = {
  'brsr-supplier-questionnaire': {
    title: 'Want it filled from your bills?',
    line: 'Send a year of electricity and fuel bills. We fill the emissions rows and keep each bill behind its figure, so your customer can check it.',
    cta: 'Fill it for me',
    phoneRequired: false,
    link: { to: '/', label: 'Or upload a bill now' },
  },
  'cbam-supplier-data-template': {
    title: "Get your plant's CBAM data pack",
    line: 'Tell us your plant and what you ship to the EU. We work through the data your buyer needs with you, from your own bills.',
    cta: 'Get my data pack',
    phoneRequired: true,
    link: { to: '/cbam-suite/supplier-pack', label: 'Build your supplier data pack' },
  },
  'monthly-emissions-register': {
    title: 'Get this register filled from your bills',
    line: 'Upload a year of bills and the twelve months fill themselves in, with the bill behind every number.',
    cta: 'Have us fill it',
    phoneRequired: false,
    link: { to: '/', label: 'Upload a bill' },
  },
  'scope-3-supplier-request-letter': {
    title: 'Send this to 20 suppliers in one go',
    line: 'Tell us how many suppliers you need data from. We set up the requests with you and track who has replied.',
    cta: 'Talk to us',
    phoneRequired: true,
    link: { to: '/', label: 'See how a bill is read' },
  },
};

/** The message the team receives for a template lead. No free text from the visitor. */
export function templateLeadMessage(t: { name: string; slug: string }, next: TemplateNext): string {
  return [`Template lead: ${t.name}`, `Asked for: ${next.title}`, `Page: ${templatePath(t.slug)}`].join('\n');
}
