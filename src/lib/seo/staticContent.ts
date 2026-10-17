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
  '/enterprise': {
    h1: 'Every supplier\'s emissions, in one record you can defend',
    blocks: [
      { p: 'Scope 3 programmes stall on supplier chasing and spreadsheets that never reconcile. Senseible collects what suppliers already have, ties each figure to its source document, and keeps estimates labelled until real data replaces them, so reporting holds up as your supplier base grows. Live today: documents to verified records. Custom: integrations and supplier-network features built to your requirements. Every capability below is marked Live, Pilot or Custom.' },
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
      ] },
      { p: 'Senseible provides data infrastructure to support sustainable-finance applications; it does not itself approve, provide or disburse loans, grants or financing.' },
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
    ] as Block[],
  },
  [MSME_CARBON_META.path]: {
    h1: MSME_CARBON_META.h1,
    blocks: [
      { p: 'If a buyer, a large customer or a bank has asked for your carbon footprint, type the monthly units from your electricity bill and any diesel you use. You see an estimated annual figure in tonnes of CO₂ straight away, what the person asking usually needs, and a short reply you can send. No sign-up.' },
      { h2: 'How the estimate is worked out' },
      { p: 'Annual emissions = monthly kWh × 12 × 0.710 kg CO₂ per kWh (India grid average used by Senseible) + monthly diesel litres × 12 × 2.68 kg CO₂ per litre. It is an estimate from typed numbers; a Senseible record built from the bills shows the factor and source for every line.' },
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
      { ul: esg.ESG_SAMPLE_ASKERS.map(a => `${a.label}: usually ${a.frameworks}. ${a.why} See ${a.sections.map(s => `${s.name} (page ${s.page})`).join(', ')}.`) },
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
};
