// Build-only: indexable body copy for core static pages, served in the
// prerendered HTML and in the /md mirrors. Every factual claim here must be
// sourced or describe the product as it works today. Regulatory statements
// cite primary sources (EUR-Lex); have the CBAM reviewer re-check them on
// every regulatory change.
import type { Block } from './render';
import { servicePages } from '@/data/services';
import { MSME_CARBON_FAQS, MSME_CARBON_META, SUPPLIER_EVIDENCE_FAQS, SUPPLIER_EVIDENCE_META } from '@/data/leadMagnets';
import * as esg from '@/data/esgReportSample';
import { SUPPLIER_REQUEST } from '@/lib/leadMagnets/supplierEvidence';
import { whitePaperBlocks } from './whitePaperBlocks';
import * as cci from '@/data/carbonCreditsIndia';
import * as cbi from '@/data/cbamIndia';
import * as cbd from '@/data/cbamDeclarant';
import * as sc from '@/data/softwareChooser';
import * as gls from '@/data/greenLoanSchemes';
import * as brsr from '@/data/brsrHub';
import * as sg from '@/data/softwareGuides';
import * as icd from '@/data/indiaClimateData';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';
import { ingestionChannels, pipelineStages, scaleControls, controlAndSecurity, outputs, suiteModules, type Capability } from '@/data/enterpriseCapabilities';

const STATUS = { live: 'Live', pilot: 'Pilot', custom: 'Custom' } as const;
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
      { p: 'Upload an invoice, get an evidence-linked carbon report. Senseible turns the invoices, electricity bills and fuel slips an MSME already keeps into Scope 1, 2 and 3 emission records, with the emission factor and source shown against every line, ready to take to a lender, a buyer or a carbon credit check.' },
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
  '/enterprise/pricing': {
    h1: 'Pay as you add suppliers',
    blocks: [
      { p: 'Enterprise pricing follows three things: the suppliers you add, team seats and any integration you ask for. No plan tiers. Suppliers do not pay to share with you. Pilots start with 10 to 15 suppliers.' },
      { h2: 'One record, every team' },
      { p: 'Supplier requests with consent, bills read into Scope 1 and 2, coverage by share of purchases, a supplier sheet with fingerprints, BRSR, GHG Protocol, CDP and ESRS reports, CBAM product emissions, net-zero roadmaps, and Tally, ERP and API integrations built for you.' },
      { h2: 'Seats by team, access by role' },
      { p: 'Admins manage the team. Procurement and supply chain ask and remind suppliers. ESG, sustainability and exports download sheets and build reports. Finance sees totals and supplier detail. Auditors check the evidence.' },
    ],
  },
  '/enterprise': {
    h1: 'Every supplier\'s emissions, in one record you can defend',
    blocks: [
      { p: 'Scope 3 programmes stall on supplier chasing and spreadsheets that never reconcile. Senseible collects what suppliers already have, ties each figure to its source document, and keeps estimates labelled until real data replaces them, so reporting holds up as your supplier base grows. Every capability below is marked Live, Pilot or Custom. [Enterprise pricing](/enterprise/pricing).' },
      { h2: 'Unstructured data in. The simplest next decision out.' },
      { p: 'Supply chains and enterprise systems produce data in every shape: bills in several languages, photos, ERP exports, meter files and spend lines. Each becomes one record with its scope, kgCO2e, the factor used, a confidence score and the hash of its source, and the ledger ranks what to act on first.' },
      { h2: 'The full suite, on one verified ledger' },
      capList(suiteModules),
      { h2: 'Custom-built for Scope 3: one click from collection to evidence-linked records' },
      { p: 'Invite, collect, clean, verify, report. Most suppliers start from documents and estimates; sensors upgrade the data later.' },
      capList(pipelineStages),
      { h2: 'Agents, sensors, satellite and a live feed' },
      capList(ingestionChannels),
      { h2: 'Scale without breaking' },
      { p: 'Primary data where the spend is. Spend-based estimates for the long tail. People only see what the checks flag.' },
      capList(scaleControls),
      { h2: 'Emissions, from liability to decision to profit' },
      { p: 'The same tonnes, priced at EU default values and at the intensity verified data shows, using the CBAM engine behind the [CBAM calculator](/cbam-calculator). The difference is what verified data is worth to your EU buyer each year.' },
      { h2: 'Biocog superintelligence' },
      { p: 'Biocog reads the scope ledger as the single source of truth and answers from it: which suppliers carry most of Scope 3, what CBAM will cost, which disclosures are still gaps and where the cheapest tonne to cut is, in English or Indian languages.' },
      { h2: "Comply with the world's top standards, from one record" },
      { p: 'GHG Protocol, ISO 14064-1, ISSB S2, GRI 305, CDP, SBTi, CSRD and ESRS, CBAM, BRSR and BRSR Core. Each framework gets its own disclosure structure from the same verified data. Reports are labelled self-reported; filing and assurance stay with you.' },
      { h2: 'A breakthrough in supplier emissions' },
      { p: 'Senseible has been piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy.' },
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
  '/india-climate-data': {
    h1: "A unit of India's grid power now carries 13% less CO2 than in FY 2013-14. Here is the data.",
    blocks: [
      { p: `Official figures on India's power sector, carbon market and EU CBAM exposure, each with a free CSV. Updated ${icd.DATA_UPDATED}. Senseible's calculator uses ${icd.SENSEIBLE_GRID_FACTOR.value.toFixed(3)} t CO2 per MWh, the FY ${icd.SENSEIBLE_GRID_FACTOR.fy} figure.` },
      { h2: 'Grid emission factor, power-sector CO2 and generation' },
      { table: { head: ['Financial year', 'Grid factor (t CO2/MWh)', 'Total CO2 (Mt)', 'Renewable generation (BU)', 'Total net generation (BU)'], rows: icd.GRID_SERIES.map(y => [y.fy, y.factor.toFixed(3), String(y.co2Mt), String(y.reBU), String(y.totalBU)]) } },
      { p: `FY 2025-26 margins: weighted average ${icd.GRID_MARGINS_2025_26.average}, simple operating margin ${icd.GRID_MARGINS_2025_26.om}, build margin ${icd.GRID_MARGINS_2025_26.bm}, combined margin ${icd.GRID_MARGINS_2025_26.cm}. From FY 2022-23 figures are adjusted for cross-border transfers and include captive injection. Source: [${icd.GRID_SOURCE.label}](${icd.GRID_SOURCE.url}), ${icd.GRID_SOURCE.where}.` },
      { h2: 'Installed capacity, 31 March 2026' },
      { table: { head: ['Source', 'MW', 'Share'], rows: icd.CAPACITY_2026.map(c => [c.label, c.mw.toFixed(2), `${((c.mw / icd.CAPACITY_TOTAL_MW) * 100).toFixed(1)}%`]).concat([['Total', icd.CAPACITY_TOTAL_MW.toFixed(2), '100%']]) } },
      { h2: 'Carbon Credit Trading Scheme: plants with intensity targets' },
      { table: { head: ['Sector', 'Plants', 'Notification'], rows: icd.CCTS_SECTORS.map(c => [c.sector, String(c.plants), c.notification]) } },
      { p: 'Counts are unique registration numbers in each Gazette schedule, counted by Senseible. Targets use a 2023-24 baseline.' },
      { h2: 'EU CBAM default values for goods from India' },
      { table: { head: ['CN code', 'Good', 'Listed (t CO2e/t)', '2026', '2027', '2028 on'], rows: icd.CBAM_GOODS.map(g => [g.cn, g.name, (icd.CBAM_COUNTS_INDIRECT.includes(g.sector) ? g.total : g.direct).toFixed(3), ...([2026, 2027, 2028] as const).map(y => icd.cbamWithMarkup(g, y).toFixed(3))]) } },
      { p: 'Steel, aluminium and hydrogen count direct emissions only; cement and fertilisers include indirect emissions. Mark-up 10%, 20% and 30% for 2026, 2027 and 2028 on; 1% for fertilisers.' },
      { h2: 'Fuel weight to volume (PPAC)' },
      { table: { head: ['Fuel', 'kL per tonne at 29.5 C', 'Multiply for 15 C'], rows: icd.FUEL_CONVERSIONS.map(f => [f.fuel, f.klPerTonne.toFixed(4), String(f.to15C)]) } },
    ],
  },
  '/white-paper': {
    h1: 'Senseible White Paper',
    blocks: whitePaperBlocks(),
  },
  '/green-loan-check': {
    h1: 'Green loan check for MSMEs',
    blocks: [
      { p: 'A two-minute, one-tap-per-question check of what a credit team will look for in a green loan or sustainability-linked application, and where your business stands today. The result is a preparation checklist, not an eligibility decision.' },
      { h2: 'What the check asks' },
      { ol: [
        'What your business does, how much funding you need and your turnover range.',
        'What the money will go into: rooftop solar, efficient machinery, cleaner fuel, electric vehicles, or a waste or water upgrade.',
        'Whether you know your carbon footprint, measured from your own invoices and bills.',
        'Two basics: GST registration and income tax returns for recent years.',
      ] },
      { h2: 'Why the carbon footprint matters' },
      { p: 'A green loan application asks you to show the environmental benefit of the project. A footprint measured from your own invoices and bills is that evidence. Senseible reads one electricity bill or fuel invoice and shows the emissions behind it, keeping the source document as proof.' },
      { h2: 'What happens next' },
      { ul: [
        'You get your readiness checklist on screen straight away.',
        '[Measure your footprint from one invoice](/) if it is the missing piece.',
        'Signed-in users on Essential and higher can prepare a full application with documents kept private.',
        '[How verified data is used in climate finance](/climate-finance)',
        '[Compare green loan schemes for MSMEs](/msme-green-loan-schemes) by what the money is for.',
      ] },
      { p: 'Senseible provides data infrastructure to support sustainable-finance applications; it does not itself approve, provide or disburse loans, grants or financing.' },
    ],
  },
  '/cbam-suite': {
    h1: 'CBAM Suite: the embedded emissions report for your installation',
    blocks: [
      { p: 'Model the plant once: fuels and materials, production processes, tonnes produced per CN code, purchased and own precursors, and electricity. The suite attributes emissions to each good and returns specific embedded emissions (SEE), the free-allocation adjustment and an estimate of certificates.' },
      { h2: 'What you get' },
      { ul: [
        'Operator emissions report in .xlsx, structured to the European Commission communication template for installations.',
        'Verifier pack: evidence index, sampling by largest contributor, checklist, misstatements against 5% materiality per good.',
        'One-page summary for EU importers, and the workbook as a file with its SHA-256.',
        'Verification by Senseible or by an external accredited verifier you appoint.',
      ] },
      { h2: 'How it calculates' },
      { ol: [
        'Source streams: platform emission factors by default, or plant-measured NCV, emission factor and oxidation with evidence.',
        'Attributed emissions per process; precursors added at supplier values or EU default values with the year\'s mark-up.',
        'SEE = attributed emissions plus embedded precursor emissions, divided by the activity level. Indirect emissions count for cement and fertilisers.',
      ] },
      { p: 'Your workbook stays on your device. [Quick CBAM estimate](/cbam-calculator) · [Supplier data pack](/cbam-suite/supplier-pack) · [Who files for your buyer](/cbam-authorised-declarant)' },
    ],
  },
  '/cbam-suite/supplier-pack': {
    h1: 'CBAM supplier data pack for EU buyers',
    blocks: [
      { p: 'EU importers need embedded emissions per CN code from each installation they buy from. The pack gives them the numbers, the basis for each (actual or default), the reporting period and the verification status, in one file.' },
      { ul: [
        'Per CN code: SEE direct and indirect, tonnes, and the default value it replaces.',
        'Draft until checked by Senseible and signed off by an accredited verifier.',
        'Built from your CBAM Suite workbook or entered per good.',
      ] },
      { p: '[CBAM Suite](/cbam-suite) · [Quick CBAM estimate](/cbam-calculator)' },
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
  '/calculators/electricity-bill-carbon': {
    h1: 'Your electricity bill, in kilograms of CO2.',
    blocks: [
      { p: `Type the units (kWh) printed on your electricity bill, for one bill or twelve months, and get kg CO2 at the CEA grid factor Senseible uses in its calculations: ${INDIA_GRID_FACTOR_KG_PER_KWH.toFixed(3)} kg CO2 per kWh.` },
      { p: 'Use the kWh line, not kVAh: kVAh includes reactive power and is always higher. Grid electricity is Scope 2; this is the location-based figure.' },
      { p: '[All calculators](/calculators) · [Fuel to CO2](/calculators/fuel-carbon) · [Upload a bill](/)' },
    ],
  },
  '/calculators/fuel-carbon': {
    h1: 'Litres of diesel in. Kilograms of CO2 out.',
    blocks: [
      { p: 'Convert diesel, petrol, LPG, CNG, PNG, furnace oil, kerosene, coal and naphtha into kg CO2 with the same factors Senseible applies to fuel invoices, and see quantity x factor = kg for each line.' },
      { p: 'Fuel burnt in your own generators, boilers, furnaces or vehicles is Scope 1. Figures are CO2 only; at IPCC defaults methane and nitrous oxide add well under one percent.' },
      { p: '[All calculators](/calculators) · [Electricity bill to CO2](/calculators/electricity-bill-carbon) · [Upload a fuel invoice](/)' },
    ],
  },
  '/calculators/cloud-data-centre-emissions': {
    h1: 'Cloud and data centre emissions calculator',
    blocks: [
      { p: 'Calculate server, cloud and data-centre emissions by region, with location-based and market-based Scope 2 figures using published PUE and grid factors.' },
      { p: '[All calculators](/calculators)' },
    ],
  },
  // Service lead pages: the prerendered answer, objections, links and FAQs.
  [SUPPLIER_EVIDENCE_META.path]: {
    h1: SUPPLIER_EVIDENCE_META.h1,
    blocks: [
      { p: 'When assurance or a customer asks where a Scope 3 Category 1 figure came from, the spend-based estimate is the line that gets challenged. Enter how many suppliers make up about 80% of your purchased-goods spend, how many already send activity data, and how many months you have; the check shows your coverage by supplier count and the monthly pace needed to close the gap.' },
      { h2: 'Why supplier bills make a figure defensible' },
      { p: 'The GHG Protocol Scope 3 Technical Guidance ranks Category 1 methods from supplier-specific and hybrid to average-data and spend-based. A supplier’s electricity bills and fuel invoices provide the activity data for the hybrid method, and each line can show its method, emission factor, source and original document.' },
      { h2: 'Supplier request you can send today' },
      { p: SUPPLIER_REQUEST.replace(/\n+/g, ' ') },
      { h2: 'Questions' },
      ...SUPPLIER_EVIDENCE_FAQS.flatMap(f => [{ h3: f.q } as Block, { p: f.a } as Block]),
      { p: 'Comparing tools: [supplier emissions software, side by side](/best-supplier-emissions-software).' },
    ] as Block[],
  },
  [MSME_CARBON_META.path]: {
    h1: MSME_CARBON_META.h1,
    blocks: [
      { p: 'If a buyer, a large customer or a bank has asked for your carbon footprint, type the monthly units from your electricity bill and any diesel you use. You see an estimated annual figure in tonnes of CO₂ straight away, what the person asking usually needs, and a short reply you can send. No sign-up.' },
      { h2: 'How the estimate is worked out' },
      { p: `Annual emissions = monthly kWh × 12 × ${INDIA_GRID_FACTOR_KG_PER_KWH.toFixed(3)} kg CO₂ per kWh (India grid average used by Senseible) + monthly diesel litres × 12 × ${FUEL_FACTORS.DIESEL.value} kg CO₂ per litre. It is an estimate from typed numbers; a Senseible record built from the bills shows the factor and source for every line.` },
      { h2: 'Questions' },
      ...MSME_CARBON_FAQS.flatMap(f => [{ h3: f.q } as Block, { p: f.a } as Block]),
    ] as Block[],
  },
  [esg.ESG_SAMPLE_META.path]: {
    h1: esg.ESG_SAMPLE_META.h1,
    blocks: [
      { p: esg.ESG_SAMPLE_INTRO },
      { p: esg.ESG_SAMPLE_ANSWER },
      { ul: esg.ESG_SAMPLE_FACTS.map(f => `${f.value} ${f.label}`) },
      { h2: esg.ESG_SAMPLE_USES_TITLE },
      ...esg.ESG_SAMPLE_PROBLEMS.flatMap(p => [{ h3: p.ask } as Block, { p: `${p.answer} ${p.detail}` } as Block]),
      { h2: esg.ESG_SAMPLE_TAKEAWAYS_TITLE },
      { ul: esg.ESG_SAMPLE_TAKEAWAYS.map(t => `${t.text} (${t.pages})`) },
      { h2: 'Who is asking you for ESG data?' },
      { ul: esg.ESG_SAMPLE_ASKERS.map(a => `${a.label}: usually ${a.frameworks}. ${a.why} See ${a.sections.map(s => `${s.name} (page ${s.page})`).join(', ')}.${a.guide ? ` [${a.guide.label}](${a.guide.to}).` : ''}`) },
      { h2: 'How it compares with the usual ways to get a report' },
      { ul: esg.ESG_SAMPLE_COMPARE.rows.map(r => `${r.label}: ${esg.ESG_SAMPLE_COMPARE.columns.map((c, i) => `${c}, ${r.cells[i].toLowerCase()}`).join('; ')}.`) },
      { h2: 'How to get the report' },
      { p: 'Answer six quick questions and a private download link is emailed to your work address, valid for 7 days. Signed-in Senseible users download it directly. Temporary and made-up email addresses cannot receive the link.' },
      { h2: 'Questions' },
      ...esg.ESG_SAMPLE_OBJECTIONS.flatMap(f => [{ h3: f.q } as Block, { p: `${f.verdict} ${f.a}` } as Block]),
      { p: '[ESG reporting with Senseible](/esg-reporting) · [Your carbon number from one bill](/msme-carbon-number)' },
    ] as Block[],
  },
  ...Object.fromEntries(servicePages.map(s => [`/${s.slug}`, {
    h1: s.hero.headline,
    blocks: [
      { p: s.hero.sub },
      ...(s.hero.stake ? [{ p: `${s.hero.stake.text} (${s.hero.stake.source})` } as Block] : []),
      { h2: s.answer.q },
      { p: s.answer.a },
      { h2: `Free tool: ${s.tool.title}` },
      { p: `Answer in about a minute, with no sign-up. Then send the result on WhatsApp or [book a scoping call](/contact).` },
      { h2: `What you receive: ${s.deliverable.title}` },
      { ul: s.deliverable.rows.map(([k]) => k) },
      { h2: 'Price, time, data and who does the work' },
      { ul: [`Price: ${s.objections.price}`, `Time: ${s.objections.time}`, `What you need: ${s.objections.data}`, `Who does the work: ${s.objections.who}`] },
      { h2: 'Already in Senseible' },
      { ul: [...s.product.map(l => `[${l.label}](${l.to})`), '[Plans and pricing](/pricing)'] },
      { h2: 'Questions buyers ask' },
      ...s.faqs.flatMap(f => [{ h3: f.q } as Block, { p: f.a } as Block]),
    ] as Block[],
  }])),
  '/carbon-credits-india': {
    h1: 'Carbon credits in India: the route that fits you',
    blocks: [
      { p: 'Four markets get called carbon credits in India: the CCTS compliance mechanism for plants with notified targets, the CCTS offset mechanism for projects of non-obligated Indian firms, PAT energy saving certificates, and renewable energy certificates. Which one applies depends on who you are and what changed at your site. India\'s carbon market had not set a price on 23 October 2026, so no route here promises an income.' },
      ...cci.SITUATIONS.flatMap(s => [
        { h2: s.who } as Block,
        ...s.choices.map(c => {
          const r = cci.ROUTES[`${s.id}:${c.id}`];
          return { p: `${c.label}: ${r.market}. ${r.verdict} Watch for: ${r.watch}` } as Block;
        }),
      ]),
      { h2: 'Four things called carbon credits' },
      { ul: cci.INSTRUMENTS.map(i => `${i.name}: one certificate is ${i.unit}. Earned by ${i.who.toLowerCase()}; trades on ${i.where.toLowerCase()}.`) },
      { h2: 'BEE fees for an offset project' },
      { ul: [
        'Account registration INR 5,000 and maintenance INR 2,000 a year.',
        'Project registration INR 50,000 up to 15,000 t CO2e a year, INR 1,00,000 up to 50,000 t, INR 1,50,000 above.',
        'Issuance INR 5 per credit; INR 25,000 per post-registration change.',
        'Validation and verification by two different accredited agencies, at their own rates.',
      ] },
      { h2: 'Straight answers' },
      ...cci.CCI_FAQS.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
      { p: 'Comparing where to buy, sell or register? [Carbon credit platforms, compared](/carbon-credit-platforms).' },
    ],
  },
  '/cbam': {
    h1: 'CBAM for Indian exporters: make your EU buyer pay on your real number',
    blocks: [
      { p: 'Since 1 January 2026 EU importers pay CBAM on the embedded emissions of the steel, aluminium, cement and fertilisers they buy from India. Without verified plant data they pay on the EU default value for India, raised by 10% in 2026, 20% in 2027 and 30% from 2028. Senseible measures your actual figure at the source, builds the file a verifier checks, and gets it to your buyer.' },
      { h2: 'Key dates' },
      { ul: cbi.CBAM_MILESTONES.map(m => `${m.when}: ${m.what}`) },
      { h2: 'Measured at the source' },
      { ul: cbi.DATA_SOURCES.map(d => `${d.name}: ${d.reads}`) },
      { h2: 'What a verifier checks' },
      { ul: cbi.VERIFIER_CHECKS },
      { h2: 'Straight answers' },
      ...cbi.CBAM_INDIA_FAQS.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
      { p: 'Start your CBAM data in the CBAM suite, estimate your cost with the CBAM calculator, or see CBAM cost by sector. Not sure who files for your buyer? [Who must be the authorised CBAM declarant](/cbam-authorised-declarant). Weighing other CBAM tools too? [See CBAM software side by side](/best-cbam-software), ours included.' },
    ],
  },
  '/cbam-authorised-declarant': {
    h1: 'Who files CBAM for your shipment, and what they need from you',
    blocks: [
      { p: 'Since 1 January 2026, if your EU buyer imports more than 50 tonnes a year of steel, aluminium, cement and fertilisers combined, the goods enter only through an authorised CBAM declarant. That is always a company in the EU, never the Indian exporter. It declares the emissions in your goods: your plant\'s verified figure, or an EU default if you send nothing.' },
      { h2: 'Who holds the status' },
      { ul: [
        `Your buyer clears import (DAP, DPU), over 50 tonnes a year: ${cbd.findDeclarant('buyer', 'over', false).who} ${cbd.findDeclarant('buyer', 'over', false).body}`,
        `You clear import (DDP), over 50 tonnes a year: ${cbd.findDeclarant('seller', 'over', false).who} ${cbd.findDeclarant('seller', 'over', false).body}`,
        `50 tonnes or less a year, no hydrogen or electricity: ${cbd.findDeclarant('buyer', 'under', false).body}`,
      ] },
      { h2: '50 tonnes is your buyer\'s total, not yours' },
      { p: 'Counted per importer, per calendar year, by weight of goods across steel, aluminium, cement and fertilisers together. Hydrogen and electricity have no threshold.' },
      { h2: 'Key dates' },
      { ul: cbd.DECLARANT_MILESTONES.map(m => `${m.when}: ${m.what}`) },
      { h2: 'The main lines the declarant needs from you' },
      { ul: cbd.PACK_ROWS },
      { p: `Send nothing and the declarant files the EU default value for India, with a mark-up of ${cbd.MARKUP_SCHEDULE} (${cbd.FERT_PCT} for fertilisers). Actual values must be verified by an accredited CBAM verifier and carry no mark-up.` },
      { h2: 'Straight answers' },
      ...cbd.CBAM_DECLARANT_FAQS.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
      { p: '[Build your CBAM data in the CBAM suite](/cbam-suite), [see the supplier pack](/cbam-suite/supplier-pack), [estimate your cost](/cbam-calculator) or [see CBAM cost per tonne by sector](/cbam-cost).' },
    ],
  },
  [brsr.BRSR_HUB_PATH]: {
    h1: 'BRSR in plain words, and the bills behind your energy and emissions figures.',
    blocks: [
      { p: 'Who has to file, what BRSR Core checks, what changed for the value chain in 2025, and where each environment figure comes from.' },
      { h2: 'Where does your company sit?' },
      { p: 'SEBI goes by market capitalisation rank.' },
      { ul: brsr.RUNGS.map(r => `${r.label}: BRSR: ${r.brsr} BRSR Core check: ${r.core} Value chain disclosure: ${r.valueChain}`) },
      { h2: 'BRSR Core: nine attributes an independent provider checks' },
      { p: 'Since March 2025 the check can be an assessment or an assurance, by a provider with no conflict of interest.' },
      ...brsr.ATTRIBUTES.flatMap(a => [
        { h3: `${a.n}. ${a.name}` } as Block,
        { p: `Asks for: ${a.asks.join('; ')}. Proved by: ${a.records}${a.fromBills ? ` ${a.fromBills}` : ''}` } as Block,
      ]),
      { h2: 'Value chain rules, then and now' },
      { ul: brsr.RULE_ROWS.map(r => `${r.what}: July 2023, ${r.y2023}. March 2025, now: ${r.y2025}`) },
      { h3: 'If you supply a listed company' },
      { ul: brsr.SUPPLIER_LINES },
      { p: '[BRSR supplier questionnaire template](/templates/brsr-supplier-questionnaire). [See how enterprises collect figures from many suppliers](/enterprise).' },
      { h2: "From last year's bills to four BRSR figures" },
      { ul: brsr.BILL_DOCS.map(d => `${d.name}: ${d.qty.toLocaleString('en-IN')} ${d.unit}, feeding Scope ${d.scope} and total energy.`) },
      { p: 'Units from your own diesel generator are not electricity. Count the diesel once, under Scope 1, and leave its units out of Scope 2.' },
      { p: 'Senseible reads the units, litres and kilograms off each bill, keeps the factor and its source on every line, and drafts the BRSR energy and emissions fields from them. [See a sample report with its BRSR Core map](/esg-report-sample). [Compare BRSR software](/best-brsr-software).' },
      { h2: 'Find the answer for your exact line' },
      ...brsr.NEEDS.flatMap(g => [{ h3: g.label } as Block, { ul: g.items.map(i => `[${i.q}](/answers/${i.slug})`) } as Block]),
      { h2: 'Short answers' },
      ...brsr.BRSR_FAQS.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
    ],
  },
  '/msme-green-loan-schemes': {
    h1: 'Green loan schemes for MSMEs in India',
    blocks: [
      { p: 'SIDBI and your bank lend for different projects, BEE cuts the interest on some, and RBI and CGTMSE rules change what a bank will do. Pick what the money is for (energy efficiency, rooftop solar, a machinery upgrade or working capital) and compare who each route suits, what it pays for and the papers the lender will want. Senseible does not lend, arrange or approve loans. Lenders and scheme bodies decide.' },
      { h2: 'Ten routes, compared' },
      { table: { head: ['Route', 'Who it suits', 'What it pays for', 'What the lender asks for', 'Terms'], rows: gls.SCHEMES.map(s => [
        `${s.name} (${s.kind})`, s.suits, s.funds,
        s.asks.length ? s.asks.map(a => gls.EVIDENCE.find(e => e.id === a)!.label).join('; ') : (s.asksNote ?? ''),
        [...s.terms, s.check].join('; '),
      ]) } },
      { h2: 'Which routes fit which need' },
      { ul: gls.NEEDS.map(n => `${n.label}: ${gls.arrange(n.id).fit.map(s => s.name).join(', ')}`) },
      { h2: 'The same papers come up again and again' },
      { ul: gls.evidenceTally(gls.SCHEMES).map(t => `${t.item.label}: asked by ${t.count} of ${gls.SCHEMES.length} routes${t.item.senseible ? `. ${t.item.senseible}.` : ''}`) },
      { h2: 'From a pile of bills to a file a lender reads' },
      { ol: [
        'Upload your electricity bills and fuel invoices, as photos or PDFs.',
        'Each bill is checked and kept as a record: each line shows the units used and how the emissions were worked out. The same bill is never counted twice.',
        'Finance evidence on your dashboard counts verified records only, ready to show your bank.',
      ] },
      { p: 'Start with the free [green loan readiness check](/green-loan-check): a few one-tap questions and a checklist of what a credit team will ask for. It is not a loan decision. Signed in, you can prepare a [green loan application](/green-loan). See also [how credit teams use verified records](/climate-finance). Comparing lenders on limits, your share and repayment? [Green loans for MSMEs, compared](/green-loans-msme-india).' },
      { h2: 'Questions owners ask' },
      ...gls.GLS_FAQS.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
    ],
  },
  '/carbon-accounting-software-india': {
    h1: 'How to choose carbon accounting software in India',
    blocks: [
      { p: 'A buyer\'s scorecard: weigh what matters to your business, get a checklist of questions to ask in every vendor demo, and score your shortlist against the same weights. A must-have answered No is flagged whatever the total.' },
      { h2: 'What to weigh, and what to ask' },
      ...sc.CRITERIA.flatMap(c => [{ h3: c.label } as Block, { p: `${c.why} Ask: ${c.ask} Red flag: ${c.redFlag}` } as Block]),
      { h2: 'How Senseible answers the same questions' },
      { ul: sc.CRITERIA.map(c => `${c.label}: ${c.senseible ?? 'No claim made yet; ask us, as you would ask anyone.'}`) },
      { h2: 'Named tools, compared' },
      { ul: sg.GUIDES.filter(g => sg.SOFTWARE_GUIDE_IDS.includes(g.id)).map(g => `[${g.h1}](${g.path})`) },
    ],
  },
  ...Object.fromEntries(sg.GUIDES.map(g => [g.path, { h1: g.h1, blocks: guideBlocks(g) }])),
};

/** Prerendered copy of a software guide: the same list, marks and questions the page shows, in default order. */
function guideBlocks(g: sg.Guide): Block[] {
  const list = sg.defaultOrder(g);
  const mark = (p: sg.Product, id: string) => sg.MARK_LABEL[p.caps[id]?.v ?? 'unknown'];
  return [
    { p: g.lede },
    { p: `${g.disclosure} Checked ${sg.formatDay(sg.lastChecked(g.id))}.` },
    { h2: 'The list' },
    ...list.flatMap((p, i) => [
      { h3: `${i + 1}. ${p.name}` } as Block,
      { ul: [
        p.who ? `Who it is for: ${p.who}` : '',
        p.bestFor ? `Best for: ${p.bestFor}` : '',
        p.pricing ? `${g.priceLabel ?? 'Pricing'}: ${p.pricing}` : '',
        p.strengths.length ? `Strengths: ${p.strengths.join(' ')}` : '',
        p.limits.length ? `Limits: ${p.limits.join(' ')}` : '',
      ].filter(Boolean) } as Block,
    ]),
    ...(g.context ? [{ h2: g.context.title } as Block, { ul: g.context.points } as Block] : []),
    { h2: 'Side by side' },
    { table: { head: ['Tool', ...g.criteria.map(c => c.short)], rows: list.map(p => [p.name, ...g.criteria.map(c => mark(p, c.id))]) } },
    { h2: 'Which tools fit which situation' },
    { ul: g.situations.map(s => `${s.label}: ${sg.rankFor(g, s.id).slice(0, 3).map(f => f.product.name).join(', ')}`) },
    { h2: 'How to choose' },
    { ol: g.criteria.map(c => `${c.label}. Ask: "${c.ask}"`) },
    ...(g.next ? [{ p: `${g.next.lead} [${g.next.label}](${g.next.to}).` } as Block] : []),
    { p: `Related guides: ${g.related.map(id => `[${sg.GUIDE_BY_ID[id].h1}](${sg.GUIDE_BY_ID[id].path})`).join(', ')}.` },
  ];
}
