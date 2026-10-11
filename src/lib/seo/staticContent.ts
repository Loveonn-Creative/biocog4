// Build-only: indexable body copy for core static pages, served in the
// prerendered HTML and in the /md mirrors. Every factual claim here must be
// sourced or describe the product as it works today. Regulatory statements
// cite primary sources (EUR-Lex); have the CBAM reviewer re-check them on
// every regulatory change.
import type { Block } from './render';
import { ingestionChannels, pipelineStages, scaleControls, controlAndSecurity, outputs, type Capability } from '@/data/enterpriseCapabilities';

const STATUS = { live: 'Live', pilot: 'Pilot', roadmap: 'Roadmap' } as const;
const capList = (items: Capability[]): Block => ({ ul: items.map(c => `${c.label} (${STATUS[c.status]})${c.note ? `: ${c.note}` : ''}`) });

export const EUR_LEX_CBAM = 'https://eur-lex.europa.eu/eli/reg/2023/956/oj';
export const EUR_LEX_CBAM_OMNIBUS = 'https://eur-lex.europa.eu/eli/reg/2025/2083/oj';

export const CBAM_SUMMARY_BLOCKS: Block[] = [
  { p: `The EU Carbon Border Adjustment Mechanism (CBAM) moved from its transitional reporting phase to its definitive period on 1 January 2026. Under the definitive regime, EU importers, acting as authorised CBAM declarants, declare the embedded emissions of covered goods (iron and steel, aluminium, cement, fertilisers, hydrogen and electricity) and surrender CBAM certificates for them. Non-EU producers do not pay CBAM directly, but their EU buyers need their emissions data.` },
  { p: `Regulation (EU) 2025/2083 added a single mass-based threshold: an importer bringing in 50 tonnes or less of covered goods in a calendar year is exempt. The threshold does not apply to electricity or hydrogen. Where actual emissions data from the producer is not available, default values are used instead, which can raise the cost for the importer.` },
  { p: `Certificates are owed on embedded emissions minus a free-allocation adjustment equal to the EU benchmark for the product multiplied by the share of free allocation EU producers still receive: 97.5% in 2026, 95% in 2027, 90% in 2028, 77.5% in 2029, 51.5% in 2030, 39% in 2031, 26.5% in 2032, 14% in 2033 and 0% from 2034. Emissions above the benchmark are charged in full from 2026. Certificates for 2026 imports go on sale on 1 February 2027, and the first annual declaration is due by 30 September 2027. Default values carry a mark-up of 10% in 2026, 20% in 2027 and 30% from 2028 for steel, aluminium, cement and hydrogen, and 1% for fertilisers (Implementing Regulation (EU) 2025/2621).` },
  { p: `Sources: [Regulation (EU) 2023/956](${EUR_LEX_CBAM}) and [Regulation (EU) 2025/2083](${EUR_LEX_CBAM_OMNIBUS}) on EUR-Lex.` },
];

export const STATIC_CONTENT: Record<string, { h1: string; blocks: Block[] }> = {
  '/': {
    h1: 'Senseible: from your bills to climate finance',
    blocks: [
      { p: 'Upload an invoice, get an audit-ready carbon report. Senseible turns the invoices, electricity bills and fuel slips an MSME already keeps into Scope 1, 2 and 3 emission records, with the emission factor and source shown against every line, ready to take to a lender, a buyer or a carbon credit check.' },
      { h2: 'How it works' },
      { ol: [
        'Upload a document, take a photo or speak the data point.',
        'Line items are extracted and classified to Scope 1, 2 or 3 using a deterministic HSN-to-scope lookup.',
        'Each line is multiplied by a published emission factor for your country, and the document is hashed (SHA-256) so the same evidence cannot be counted twice.',
        'Take the verified record to a green loan application, a buyer or export request, or a carbon credit check.',
      ] },
      { h2: 'What verified data unlocks' },
      { ul: [
        '[Green loans](/climate-finance): lenders can underwrite against figures tied to your own bills.',
        '[Buyer and export requests](/climate-intelligence/eu-cbam-explained-emerging-market-exporters): answer buyer questionnaires and EU CBAM data requests from one verified record.',
        '[Carbon credits](/carbon-credits): verified reductions that clear additionality can become credit-ready signals.',
      ] },
      { h2: 'Exporting to the EU? CBAM in 2026' },
      ...CBAM_SUMMARY_BLOCKS,
      { p: 'Estimate your buyer\'s cost with the [CBAM cost calculator](/cbam-calculator).' },
      { h2: 'Free tools' },
      { ul: [
        '[CBAM cost calculator](/cbam-calculator)',
        '[Product carbon footprint calculator (ISO 14067)](/calculators/product-carbon-footprint)',
        '[Freight emissions calculator (GLEC, ISO 14083)](/calculators/logistics-emissions)',
        '[Solar ROI calculator](/calculators/energy-transition-savings)',
      ] },
      { h2: 'Plans' },
      { p: 'Biocog Snapshot is free. Paid plans start at ₹499 a month on yearly billing. [Compare plans](/pricing).' },
      { p: 'Sourcing from MSMEs? Supplier (Scope 3) emissions automation for enterprise supply chains is described on [Trust and technical validation](/trust).' },
      { h2: 'Senseible is not Sensibull' },
      { p: 'Senseible (senseible.earth) is a carbon accounting platform. Sensibull is an unrelated options-trading platform. [Read the difference](/vs/sensibull).' },
    ],
  },
  '/enterprise': {
    h1: 'Supplier emissions, without the chasing',
    blocks: [
      { p: 'Agents collect what your suppliers already have and turn it into Scope 3 records you can audit. Live today: documents to verified records. Being built: the supplier network. Every capability below is marked Live, Pilot or Roadmap.' },
      { h2: 'How the agents work' },
      { p: 'Invite, collect, clean, verify, report. Most suppliers start from documents and estimates; sensors upgrade the data later.' },
      capList(pipelineStages),
      { h3: 'Inputs' },
      capList(ingestionChannels),
      { h2: 'Scale without breaking' },
      { p: 'Primary data where the spend is. Spend-based estimates for the long tail. People only see what the checks flag.' },
      capList(scaleControls),
      { h2: 'The supplier keeps its data' },
      capList(controlAndSecurity),
      { p: 'No third-party security certification is claimed. Security detail is on [Trust and technical validation](/trust).' },
      { h2: 'Every number has a trail' },
      capList(outputs),
      { h2: 'Talk to us' },
      { p: 'Send your work email, company and supplier count from this page, or download the [supplier list template](/templates/supplier-list-template.csv). You can also [score suppliers with the free calculator](/calculators/supplier-emissions-risk) or see [plans and pricing](/pricing).' },
    ],
  },
  '/platform': {
    h1: 'The Senseible platform',
    blocks: [
      { p: 'Senseible is a verification layer for climate data. It turns a business document, such as an invoice, an energy bill or a freight slip, into an emission record that shows its source document, emission factor and methodology version.' },
      { h2: "Who it's for" },
      { ul: [
        'MSMEs and exporters: turn invoices into a verified emission record without a consultant.',
        'Enterprises: collect Scope 3 supplier data for CBAM, ISSB and CSRD reporting.',
        'Banks and lenders: underwrite against figures tied to hashed source documents, not borrower self-declarations.',
        'Carbon credit buyers: check evidence linkage behind MSME-origin credits.',
        'Ecosystem partners: plug verified MSME climate data into your own product.',
      ] },
      { h2: 'How it works' },
      { ol: [
        'Capture: drop a document, take a photo or speak the data point.',
        'Verify: every document is hashed, parsed, classified deterministically and matched against country grid factors.',
        'Use: the verified record feeds your disclosure, your lender, your reduction roadmap and, where eligible, your credits.',
      ] },
      { h2: 'Outcomes' },
      { ul: [
        '[Report](/trust): one ledger for CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi disclosures.',
        '[Finance](/climate-finance): verified baselines become underwriting inputs.',
        '[Decarbonise](/net-zero): a baseline becomes a sector-aware reduction roadmap.',
        '[Monetise](/carbon-credits): records that clear additionality become credit-readiness signals.',
      ] },
    ],
  },
  '/cbam-calculator': {
    h1: 'CBAM cost calculator for EU imports, 2026 to 2034',
    blocks: [
      { p: 'Estimate the CBAM certificate cost attached to steel, aluminium, cement, fertiliser and hydrogen imports into the EU, year by year from 2026 to 2034. Pick a sector and production route, enter annual tonnage and the country of production, and set an EU ETS price assumption.' },
      { h2: 'How the estimate works' },
      { ol: [
        'Embedded emissions = tonnage × emission intensity for the sector and route (verified actual data where you have it, otherwise a default intensity with its mark-up).',
        'Certificates owed = embedded emissions minus the EU benchmark × the share of free allocation still granted that year; cost = certificates × certificate price.',
        'A carbon price already paid in the country of production is deducted where applicable.',
      ] },
      { h2: 'CBAM rules this calculator follows' },
      ...CBAM_SUMMARY_BLOCKS,
      { h2: 'Related' },
      { ul: [
        '[CBAM for steel manufacturers in India](/solutions/cbam-steel-india)',
        '[CBAM for chemical manufacturers in India](/solutions/cbam-chemicals-india)',
        '[CBAM for steel manufacturers in Vietnam](/solutions/cbam-steel-vietnam)',
        '[Carbon pricing impact calculator](/calculators/carbon-pricing-impact)',
        '[CBAM default values vs actual emissions](/climate-intelligence/cbam-default-values-vs-actual-emissions-msme-decision-guide)',
      ] },
    ],
  },
  '/calculators/product-carbon-footprint': {
    h1: 'Product carbon footprint calculator (ISO 14067)',
    blocks: [
      { p: 'Calculate cradle-to-gate emissions per unit of product. Inputs are raw materials, energy, transport and packaging; the output is kgCO2e per unit with a line-by-line breakdown, following ISO 14067 and the GHG Protocol Product Standard.' },
      { p: '[All calculators](/calculators) · [CBAM cost calculator](/cbam-calculator)' },
    ],
  },
  '/calculators/supplier-emissions-risk': {
    h1: 'Supplier emissions and Scope 3 risk calculator',
    blocks: [
      { p: 'Score suppliers on Scope 3 Category 1 (purchased goods and services) emissions using a hybrid of spend-based and activity-based methods, aligned with the GHG Protocol Scope 3 Standard.' },
      { ol: ['Add suppliers with spend, country and sector.', 'The calculator applies sector factors and country grid intensity.', 'Get tCO2e per supplier and a portfolio risk score with a confidence rating.'] },
      { p: '[All calculators](/calculators)' },
    ],
  },
  '/calculators/energy-transition-savings': {
    h1: 'Solar ROI and energy transition savings calculator',
    blocks: [
      { p: 'Model rooftop solar, PPA or hybrid investment with payback, NPV, IRR and CO2 avoided over 25 years, using country tariffs and grid emission factors.' },
      { ul: ['Annual generation (kWh)', 'Annual cost savings', 'Payback period (years)', '10 and 25-year NPV and IRR', 'Lifetime CO2 avoided (tCO2e)'] },
      { p: '[All calculators](/calculators)' },
    ],
  },
  '/calculators/logistics-emissions': {
    h1: 'Freight emissions calculator (GLEC Framework, ISO 14083)',
    blocks: [
      { p: 'Calculate freight CO2e across road, rail, sea and air using cargo weight × distance, aligned with the GLEC Framework and ISO 14083:2023, with load factor and empty-return adjustments.' },
      { p: '[All calculators](/calculators)' },
    ],
  },
  '/calculators/carbon-pricing-impact': {
    h1: 'Carbon pricing impact calculator: EU ETS and CBAM',
    blocks: [
      { p: 'Estimate carbon cost exposure under the EU ETS and CBAM from 2026 to 2034, including the CBAM phase-in, free allocation phase-out and best and worst case carbon price scenarios.' },
      { p: 'Free allocation still granted to EU producers, which sets the CBAM adjustment: 97.5% of the benchmark in 2026, falling to 51.5% in 2030 and 0% from 2034.' },
      { p: '[All calculators](/calculators) · [CBAM cost calculator](/cbam-calculator)' },
    ],
  },
  '/calculators/cloud-data-centre-emissions': {
    h1: 'Cloud and data centre emissions calculator',
    blocks: [
      { p: 'Calculate server, cloud and data-centre emissions by region, with location-based and market-based Scope 2 figures using published PUE and grid factors.' },
      { p: '[All calculators](/calculators)' },
    ],
  },
};
