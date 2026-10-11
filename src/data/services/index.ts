// The 11 service lead pages. Copy rules: outcome + audience in the headline,
// SEO terms in the sub and answer, one claim per sentence, no adjective that
// is not a number, and every dated stake carries its source. Regulatory
// facts match the reviewed guides in src/data/cmsContent.ts.
import type { ServiceConfig } from './types';

const PRICE_SELF_SERVE = 'Start free on Snapshot. Essential is ₹499 a month billed yearly. Advisory work is quoted after a scoping call.';
const WHO_BOTH = 'Senseible software does the counting. Our team does the review, the gaps and the sign-off pack.';

export const servicePages: ServiceConfig[] = [
  {
    slug: 'carbon-accounting',
    nav: 'Carbon accounting',
    seo: {
      title: 'Carbon Accounting and GHG Inventory, Scope 1, 2, 3',
      description: 'Scope 1, 2 and 3 GHG inventory from your bills and invoices, with product carbon footprints and LCA. See your emission hotspots free in a minute.',
      keywords: ['carbon accounting', 'GHG inventory', 'Scope 1 2 3 emissions', 'product carbon footprint', 'life cycle assessment', 'LCA India'],
    },
    hero: {
      headline: 'Know your carbon footprint from the bills you already pay.',
      sub: 'Scope 1, 2 and 3 GHG inventory, product carbon footprints and life cycle assessment, calculated line by line from invoices.',
      stake: { text: 'Top 1,000 listed companies need BRSR Core assurance or assessment from FY 2026-27, and they ask suppliers for the data.', source: 'SEBI circular, 28 March 2025' },
    },
    answer: {
      q: 'What is a GHG inventory?',
      a: 'A GHG inventory is the yearly total of a company\'s greenhouse gas emissions, split into Scope 1 (fuel you burn), Scope 2 (electricity you buy) and Scope 3 (your value chain). Senseible builds it from your bills: each line is quantity times a published emission factor, with the source kept.',
    },
    tool: { title: 'Estimate your Scope 1 and 2, and find your Scope 3 hotspots', cta: 'See my footprint' },
    deliverable: {
      title: 'GHG inventory, FY 2025-26',
      rows: [['Scope 1: diesel, LPG', '42.6 tCO₂e'], ['Scope 2: grid electricity', '118.3 tCO₂e'], ['Scope 3: purchased goods', '611.0 tCO₂e'], ['Scope 3: upstream transport', '38.9 tCO₂e'], ['Product footprint, per tonne', '1.84 tCO₂e'], ['Factor sources and versions', 'Listed per line']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'Bills give numbers in minutes. A full inventory is planned with you on the scoping call.', data: 'Electricity bills, fuel invoices and purchase invoices for the year.', who: WHO_BOTH },
    plan: 'essential',
    product: [
      { label: 'Upload a bill and get Scope 1 and 2', to: '/' },
      { label: 'Product carbon footprint calculator', to: '/calculators/product-carbon-footprint' },
      { label: 'Logistics emissions calculator', to: '/calculators/logistics-emissions' },
    ],
    faqs: [
      { q: 'Is this aligned with the GHG Protocol?', a: 'Yes. Emissions are split into Scope 1, 2 and 3 as the GHG Protocol Corporate Standard defines them, and Scope 3 uses its 15 categories.' },
      { q: 'Can you do a product carbon footprint or LCA?', a: 'Yes. Product footprints follow ISO 14067 and the GHG Protocol Product Standard, from raw material to factory gate or across the full life cycle.' },
      { q: 'Which emission factors do you use for India?', a: 'The CEA grid factor for electricity and IPCC 2006 defaults for fuels, with the factor and version shown against every line.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'esg-reporting',
    nav: 'ESG reporting',
    seo: {
      title: 'ESG Reporting: BRSR, CSRD, ISSB, GRI and CBAM',
      description: 'Find which ESG rules apply to you in three questions: BRSR and BRSR Core, CSRD and ESRS, ISSB IFRS S1 and S2, GRI, SASB, TCFD and CBAM for EU exporters.',
      keywords: ['ESG reporting', 'BRSR Core', 'CSRD ESRS', 'ISSB IFRS S2', 'CBAM reporting', 'double materiality assessment'],
    },
    hero: {
      headline: 'Find out which ESG rules apply to you, in three questions.',
      sub: 'BRSR and BRSR Core, CSRD and ESRS, ISSB (IFRS S1 and S2), GRI, SASB, TCFD, CBAM for EU exporters, and double materiality.',
      stake: { text: 'CBAM certificates go on sale on 1 February 2027. The first annual declaration is due by 30 September 2027.', source: 'Regulation (EU) 2023/956, as amended' },
    },
    answer: {
      q: 'Does BRSR apply to my company?',
      a: 'BRSR is mandatory for the top 1,000 companies listed in India by market capitalisation. Unlisted companies and MSMEs do not file it, but listed customers ask them for value-chain data. If you export steel, aluminium, cement, fertiliser or hydrogen to the EU, your importer needs your CBAM emissions.',
    },
    tool: { title: 'Which frameworks apply to me?', cta: 'Show my frameworks' },
    deliverable: {
      title: 'BRSR Principle 6 data pack',
      rows: [['Total Scope 1 emissions', '42.6 tCO₂e'], ['Total Scope 2 emissions', '118.3 tCO₂e'], ['Emission intensity per ₹ crore revenue', '3.2 tCO₂e'], ['Energy consumed, renewable share', '1,412 GJ, 18%'], ['Water withdrawal', '9,840 kL'], ['Assurance-ready evidence index', 'Linked per figure']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The check takes a minute. Report timelines are set against your filing date on the scoping call.', data: 'Last year\'s bills, headcount, revenue and any report your customer sent you.', who: WHO_BOTH },
    plan: 'pro',
    product: [
      { label: 'CBAM cost calculator', to: '/cbam-calculator' },
      { label: 'BRSR rules explained', to: '/climate-intelligence/brsr-reporting-requirements-india' },
      { label: 'CSRD double materiality for suppliers', to: '/climate-intelligence/csrd-double-materiality-assessment-msme-supplier' },
    ],
    faqs: [
      { q: 'Do MSMEs need to file BRSR?', a: 'No. BRSR applies to the top 1,000 listed entities. MSMEs are affected when a listed customer asks for supplier data.' },
      { q: 'Does CSRD apply to Indian companies?', a: 'Directly, only to large groups with major EU turnover. After the EU Omnibus, EU buyers in scope have over 1,000 employees and €450 million turnover, and they ask suppliers for data.' },
      { q: 'What is double materiality?', a: 'Assessing both how sustainability issues affect your finances and how your business affects people and the environment. CSRD requires it.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'supplier-due-diligence',
    nav: 'Supplier due diligence',
    seo: {
      title: 'Supplier Due Diligence and Supplier ESG Assessment',
      description: 'Screen suppliers for forced labour, conflict minerals and deforestation risk. Check LkSG, EU CSDDD, UFLPA and EUDR exposure and get supplier scorecards.',
      keywords: ['supplier due diligence', 'supplier ESG assessment', 'CSDDD', 'LkSG German Supply Chain Act', 'UFLPA', 'conflict minerals', 'EUDR traceability'],
    },
    hero: {
      headline: 'See which of your suppliers put your buyers at risk.',
      sub: 'Supplier risk screening, scorecards, audits and traceability for forced labour, conflict minerals and deforestation under LkSG, EU CSDDD and US UFLPA.',
      stake: { text: 'US imports linked to Xinjiang have been presumed made with forced labour since 21 June 2022.', source: 'Uyghur Forced Labor Prevention Act' },
    },
    answer: {
      q: 'What is supplier due diligence?',
      a: 'Supplier due diligence means finding, preventing and fixing human rights and environmental harm in your supply chain. Germany\'s LkSG, the EU CSDDD and the US UFLPA make large buyers do it, so they ask suppliers for evidence on labour, sourcing and origin.',
    },
    tool: { title: 'Which rules do your supply chain trigger?', cta: 'Show my supplier risks' },
    deliverable: {
      title: 'Supplier scorecard',
      rows: [['Suppliers screened', '48'], ['High-risk commodities found', 'Cotton, cobalt'], ['Evidence on file', '31 of 48'], ['Corrective actions open', '6'], ['Traceability to origin', 'Tier 2 for 70% of spend'], ['Audit schedule', 'Per supplier']],
    },
    objections: { price: 'Screening starts free. Supplier programmes are quoted on supplier count after a scoping call.', time: 'The check takes a minute. Programme timelines depend on supplier count.', data: 'A supplier list with country and what each supplies. Our template has the columns.', who: 'Our team runs screening, questionnaires and follow-up. Senseible keeps every answer with its evidence.' },
    plan: 'scale',
    product: [
      { label: 'Supplier emissions risk calculator', to: '/calculators/supplier-emissions-risk' },
      { label: 'Supplier emissions for enterprises', to: '/enterprise' },
      { label: 'CBAM and CSDDD for garment exporters', to: '/climate-intelligence/bangladesh-rmg-exporters-eu-cbam-csddd-2026' },
    ],
    faqs: [
      { q: 'Who must comply with Germany\'s Supply Chain Act (LkSG)?', a: 'Companies with at least 1,000 employees in Germany. Their suppliers, including Indian ones, are asked for evidence.' },
      { q: 'What counts as conflict minerals?', a: 'Tin, tantalum, tungsten and gold (3TG). Many buyers also screen cobalt and mica.' },
      { q: 'Which commodities does EUDR cover?', a: 'Cattle, cocoa, coffee, oil palm, rubber, soya and wood, and products made from them.' },
    ],
    contactTopic: 'enterprise',
  },
  {
    slug: 'decarbonization',
    nav: 'Decarbonisation',
    seo: {
      title: 'Decarbonisation Strategy and Net-Zero Roadmaps',
      description: 'Plan science-based targets, net-zero roadmaps, renewable energy procurement, energy audits and electrification. See your 1.5°C pathway free.',
      keywords: ['decarbonisation strategy', 'SBTi targets', 'net-zero roadmap', 'renewable energy procurement', 'energy efficiency audit', 'process electrification'],
    },
    hero: {
      headline: 'See the cut your business needs each year, and where it comes from.',
      sub: 'Science-based targets (SBTi), net-zero roadmaps, renewable energy procurement, energy efficiency audits and process electrification.',
    },
    answer: {
      q: 'What is a science-based target?',
      a: 'A science-based target is an emissions cut in line with limiting warming to 1.5°C. For near-term targets, the SBTi\'s absolute contraction approach means cutting Scope 1 and 2 by at least 4.2% a year from a base year. Senseible sets the base year from your verified bills.',
    },
    tool: { title: 'Your 1.5°C pathway', cta: 'Show my pathway' },
    deliverable: {
      title: 'Net-zero roadmap',
      rows: [['Base year emissions', '160.9 tCO₂e'], ['2030 target (1.5°C)', '-42%'], ['Rooftop solar, 150 kW', '-131 tCO₂e a year'], ['Compressor and motor upgrades', '-18 tCO₂e a year'], ['Boiler electrification', 'Phase 2'], ['Payback by measure', 'Per measure']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The pathway takes a minute. Audits and roadmaps are planned on the scoping call.', data: 'A year of electricity and fuel bills, and your main equipment list.', who: WHO_BOTH },
    plan: 'pro',
    product: [
      { label: 'Net-zero engine', to: '/net-zero' },
      { label: 'Energy transition savings calculator', to: '/calculators/energy-transition-savings' },
      { label: 'SBTi near-term targets for MSMEs', to: '/climate-intelligence/msme-sbti-fln-near-term-target-validation' },
    ],
    faqs: [
      { q: 'Can an MSME set an SBTi target?', a: 'Yes. SMEs have a streamlined route with a fixed near-term target, validated without the full corporate process.' },
      { q: 'How much does rooftop solar cut?', a: 'Each MWh of solar replacing grid power avoids about 0.71 tCO₂, the CEA grid factor.' },
      { q: 'Do you help procure renewable power?', a: 'Yes: rooftop and open-access solar, green tariffs and renewable energy certificates, compared on cost and emissions.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'circular-economy',
    nav: 'Circular economy and EPR',
    seo: {
      title: 'Circular Economy, EPR Compliance and Waste Management',
      description: 'Check your EPR obligations for plastic packaging, e-waste, batteries, tyres and used oil in India. Plus eco-design, take-back, recycling and water stewardship.',
      keywords: ['EPR compliance India', 'plastic packaging EPR', 'circular economy', 'waste management', 'take-back programme', 'water stewardship'],
    },
    hero: {
      headline: 'Know your EPR obligations before the CPCB asks.',
      sub: 'EPR compliance, sustainable sourcing, eco-design, recycling and take-back programmes, water stewardship and waste reduction.',
    },
    answer: {
      q: 'Who needs EPR registration in India?',
      a: 'Producers, importers and brand owners who put plastic packaging, electrical and electronic equipment, batteries, tyres or lubricating oil on the Indian market need Extended Producer Responsibility registration on the CPCB portal. They must arrange collection and recycling of a set share of what they sell.',
    },
    tool: { title: 'Does EPR apply to me?', cta: 'Check my EPR' },
    deliverable: {
      title: 'EPR and material flow pack',
      rows: [['Plastic packaging placed on market', '86.4 t'], ['Recycling target this year', 'Category-wise'], ['Certificates to buy', 'Shown per category'], ['Water withdrawal per unit', '1.9 kL'], ['Waste diverted from landfill', '64%'], ['Take-back points', 'Mapped']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The check takes a minute. Registration and filing timelines are set on the scoping call.', data: 'Sales and purchase records by material, and your waste disposal receipts.', who: WHO_BOTH },
    plan: 'essential',
    product: [
      { label: 'Aluminium recycling and Scope 3', to: '/climate-intelligence/msme-aluminium-recycling-scope-3-savings' },
      { label: 'Upload waste and water bills', to: '/' },
      { label: 'Plans and prices', to: '/pricing' },
    ],
    faqs: [
      { q: 'What is a PIBO?', a: 'A producer, importer or brand owner of plastic packaging. All three have EPR targets under India\'s Plastic Waste Management Rules.' },
      { q: 'Do importers need EPR?', a: 'Yes. Importing covered products into India carries the same EPR duty as making them.' },
      { q: 'Can you track water use too?', a: 'Yes. Water bills become withdrawal and intensity figures in the same record as emissions.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'climate-risk',
    nav: 'Climate risk',
    seo: {
      title: 'Climate Risk and Resilience Assessment, TCFD and IFRS S2',
      description: 'Scenario analysis for physical risk (floods, heat, water stress) and transition risk (carbon price, regulation, demand). Stress-test your carbon cost free.',
      keywords: ['climate risk assessment', 'climate scenario analysis', 'physical risk', 'transition risk', 'TCFD', 'IFRS S2'],
    },
    hero: {
      headline: 'See what a carbon price would cost you, before it does.',
      sub: 'Climate scenario analysis for physical risks (floods, heat, water stress) and transition risks (carbon pricing, regulation, demand shifts).',
      stake: { text: 'IFRS S2 requires climate scenario analysis for periods from 1 January 2024, where adopted.', source: 'IFRS S2, effective date' },
    },
    answer: {
      q: 'What is climate scenario analysis?',
      a: 'Climate scenario analysis tests your business against possible futures: physical risks such as floods, heat and water stress at your sites, and transition risks such as a carbon price on your emissions or buyers moving to low-carbon suppliers. IFRS S2 and TCFD ask for it.',
    },
    tool: { title: 'Carbon price stress test', cta: 'See my carbon cost' },
    deliverable: {
      title: 'Climate risk register',
      rows: [['Carbon cost at €82/t, Scope 1 and 2', '₹12.4 lakh a year'], ['Sites in flood-prone districts', '1 of 3'], ['Heat-stress working days', 'Per site'], ['Water stress, main plant', 'High'], ['Buyer low-carbon requirements', '2 buyers'], ['Actions and owners', 'Listed']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The stress test takes a minute. A full assessment is planned on the scoping call.', data: 'Your emissions (or bills), site addresses and main buyers.', who: WHO_BOTH },
    plan: 'pro',
    product: [
      { label: 'Carbon pricing impact calculator', to: '/calculators/carbon-pricing-impact' },
      { label: 'CBAM cost calculator', to: '/cbam-calculator' },
      { label: 'Climate finance', to: '/climate-finance' },
    ],
    faqs: [
      { q: 'What is the difference between physical and transition risk?', a: 'Physical risk is damage from the climate itself. Transition risk is cost from the move to a low-carbon economy, such as carbon prices.' },
      { q: 'Which carbon price should I test?', a: 'Test the price your buyers face. For EU exports, that is the EU ETS price that CBAM follows.' },
      { q: 'Is this enough for IFRS S2 or TCFD?', a: 'The stress test is a start. A full disclosure needs governance, strategy, metrics and scenarios, which we prepare with you.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'esg-data-management',
    nav: 'ESG data and assurance',
    seo: {
      title: 'ESG Data Management, Assurance and Audit-Ready Data',
      description: 'One ESG data platform across facilities and suppliers, with internal controls and evidence for third-party assurance. Score your audit readiness free.',
      keywords: ['ESG data management', 'ESG assurance', 'audit-ready ESG data', 'ESG data platform', 'internal controls', 'BRSR Core assurance'],
    },
    hero: {
      headline: 'Make every ESG number pass an auditor\'s first question.',
      sub: 'ESG data management across facilities and suppliers, internal controls and third-party assurance for audit-ready reporting.',
      stake: { text: 'BRSR Core assurance or assessment covers all top 1,000 listed companies from FY 2026-27.', source: 'SEBI circular, 28 March 2025' },
    },
    answer: {
      q: 'What makes ESG data audit-ready?',
      a: 'Audit-ready ESG data traces every figure to a source document, a method and a person who approved it. Senseible hashes each source document, records the emission factor and methodology version, and keeps the history, so an assurer can re-perform any number.',
    },
    tool: { title: 'Score your audit readiness', cta: 'Check my score' },
    deliverable: {
      title: 'Assurance evidence index',
      rows: [['Figures in scope', '214'], ['Linked to a source document', '214 of 214'], ['Evidence hash (SHA-256)', 'Per document'], ['Methodology version', 'v1.1.0'], ['Reviewer and approval date', 'Per figure'], ['Changes since last period', 'Logged']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The score takes a minute. Data set-up is planned on the scoping call.', data: 'Where your ESG data sits today: spreadsheets, bills, ERP exports.', who: WHO_BOTH },
    plan: 'pro',
    product: [
      { label: 'Trust and technical validation', to: '/trust' },
      { label: 'Supplier data for enterprises', to: '/enterprise' },
      { label: 'Scope 3 data quality guide', to: '/climate-intelligence/scope-3-data-quality-tiers-software-buyer-guide-2026' },
    ],
    faqs: [
      { q: 'What is the difference between limited and reasonable assurance?', a: 'Limited assurance says nothing suggests the data is wrong. Reasonable assurance says it is right, and needs stronger evidence and controls.' },
      { q: 'Can my auditor see the evidence?', a: 'Yes. Each figure links to its source document, factor, version and approval.' },
      { q: 'Do you replace our ERP?', a: 'No. Senseible reads exports and documents from the systems you already use.' },
    ],
    contactTopic: 'enterprise',
  },
  {
    slug: 'ehs-social',
    nav: 'EHS and social',
    seo: {
      title: 'EHS and Social Performance: Safety, Labour, Wellbeing',
      description: 'Occupational health and safety, labour practices, workforce wellbeing and community impact. Work out your LTIFR and TRIR for BRSR free.',
      keywords: ['EHS performance', 'occupational health and safety', 'LTIFR calculation', 'labour practices', 'workforce wellbeing', 'BRSR Principle 3'],
    },
    hero: {
      headline: 'Turn your safety register into the numbers buyers ask for.',
      sub: 'Occupational health and safety, labour practices, workforce wellbeing and community impact in your own operations.',
    },
    answer: {
      q: 'How do you calculate LTIFR?',
      a: 'LTIFR, the lost time injury frequency rate, is the number of lost time injuries times one million, divided by total hours worked. BRSR asks for it per million person-hours. TRIR uses 200,000 hours instead and counts all recordable injuries.',
    },
    tool: { title: 'Work out your safety rates', cta: 'Calculate my LTIFR' },
    deliverable: {
      title: 'BRSR Principle 3 safety pack',
      rows: [['LTIFR, employees', '0.82'], ['LTIFR, workers', '1.14'], ['Recordable injuries', '7'], ['Fatalities', '0'], ['Training hours per worker', '14'], ['Grievances raised and closed', '12 / 11']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The calculation takes a minute. Programmes are planned on the scoping call.', data: 'Your injury register, attendance or payroll hours, and headcount.', who: 'Our team sets up the registers and indicators. You keep ownership of people data.' },
    plan: 'essential',
    product: [
      { label: 'BRSR rules explained', to: '/climate-intelligence/brsr-reporting-requirements-india' },
      { label: 'Plans and prices', to: '/pricing' },
      { label: 'Talk to the team', to: '/contact' },
    ],
    faqs: [
      { q: 'What counts as a lost time injury?', a: 'A work injury that keeps the person off work for at least one full shift after the day it happened.' },
      { q: 'Do contract workers count?', a: 'Yes. BRSR reports employees and workers separately, including contract workers.' },
      { q: 'Is personal data shared?', a: 'No. Rates and totals are reported, not names.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'product-compliance',
    nav: 'Product compliance',
    seo: {
      title: 'Product Compliance: ESPR, Digital Product Passport, REACH',
      description: 'Get ready for EU ESPR, Digital Product Passports, the EU Battery Regulation, REACH and PFAS limits. Check what your product needs free.',
      keywords: ['product compliance', 'Digital Product Passport', 'EU ESPR', 'EU Battery Regulation', 'REACH SVHC', 'PFAS restriction'],
    },
    hero: {
      headline: 'Know what your product needs to keep selling in the EU.',
      sub: 'Readiness for EU ESPR, Digital Product Passports, the EU Battery Regulation and chemical rules such as REACH and PFAS.',
      stake: { text: 'Battery passports are mandatory for EV, industrial (over 2 kWh) and LMT batteries from 18 February 2027.', source: 'EU Battery Regulation 2023/1542' },
    },
    answer: {
      q: 'What is a Digital Product Passport?',
      a: 'A Digital Product Passport is a record, reached by a QR code on the product, that holds its materials, carbon footprint, recycled content and repair information. The EU Battery Regulation makes it mandatory for some batteries from February 2027, and ESPR extends it to other products.',
    },
    tool: { title: 'What does my product need?', cta: 'Show my product checklist' },
    deliverable: {
      title: 'Product passport data sheet',
      rows: [['Carbon footprint per unit', '61.2 kgCO₂e'], ['Recycled content', 'Cobalt 16%, lithium 6%'], ['SVHC above 0.1%', 'None found'], ['PFAS use', 'Declared per part'], ['Due diligence on raw materials', 'Linked'], ['QR passport fields', 'Mapped']],
    },
    objections: { price: 'Checks are free. Passport and compliance work is quoted per product family after a scoping call.', time: 'The check takes a minute. Passport timelines follow your product launch dates.', data: 'Bill of materials, supplier declarations and test reports.', who: WHO_BOTH },
    plan: 'scale',
    product: [
      { label: 'Product carbon footprint calculator', to: '/calculators/product-carbon-footprint' },
      { label: 'ISO 14067 vs GHG Protocol', to: '/climate-intelligence/iso-14067-vs-ghg-protocol-product-standard-explained' },
      { label: 'CBAM cost calculator', to: '/cbam-calculator' },
    ],
    faqs: [
      { q: 'Does REACH apply to exporters outside the EU?', a: 'Your EU importer is responsible, but they need your declaration of substances of very high concern above 0.1% by weight.' },
      { q: 'Which products come after batteries under ESPR?', a: 'The EU working plan names textiles, steel and aluminium among the first product groups.' },
      { q: 'Do you calculate the battery carbon footprint?', a: 'Yes, from your bill of materials and factory energy, with the method and data shown.' },
    ],
    contactTopic: 'enterprise',
  },
  {
    slug: 'esg-ratings',
    nav: 'ESG ratings',
    seo: {
      title: 'EcoVadis, CDP and ESG Ratings: Questionnaire Support',
      description: 'Improve EcoVadis and CDP scores and answer customer sustainability questionnaires faster. Check your EcoVadis readiness across all four themes free.',
      keywords: ['EcoVadis rating', 'CDP disclosure', 'ESG ratings', 'sustainability questionnaire', 'EcoVadis readiness', 'customer ESG assessment'],
    },
    hero: {
      headline: 'Your buyer asked for an EcoVadis score. See where you stand.',
      sub: 'Managing CDP, EcoVadis and similar ESG ratings, and answering customer sustainability questionnaires with evidence.',
    },
    answer: {
      q: 'How is an EcoVadis rating scored?',
      a: 'EcoVadis scores four themes: environment, labour and human rights, ethics, and sustainable procurement. It scores policies, actions and results, and only counts what you can prove with documents. This readiness check is our own self-assessment, not an EcoVadis score.',
    },
    tool: { title: 'EcoVadis readiness check', cta: 'Check my score' },
    deliverable: {
      title: 'Ratings evidence pack',
      rows: [['Environment policy and targets', 'Ready'], ['Scope 1 and 2 with evidence', 'Ready'], ['Labour and human rights policy', 'Draft'], ['Anti-bribery policy', 'Missing'], ['Supplier code of conduct', 'Missing'], ['Questionnaire answers reused', '83 of 120']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The check takes a minute. Rating timelines follow your questionnaire deadline.', data: 'Your policies, certificates and last year\'s energy bills.', who: WHO_BOTH },
    plan: 'pro',
    product: [
      { label: 'Upload bills for Scope 1 and 2 evidence', to: '/' },
      { label: 'Trust and technical validation', to: '/trust' },
      { label: 'Plans and prices', to: '/pricing' },
    ],
    faqs: [
      { q: 'Is this an official EcoVadis score?', a: 'No. It is our readiness check against the four EcoVadis themes. Only EcoVadis issues ratings.' },
      { q: 'What does CDP ask for?', a: 'Climate governance, risks, targets and Scope 1, 2 and 3 emissions, plus water and forests where relevant.' },
      { q: 'Can you answer our customer questionnaires?', a: 'Yes. We draft answers from your verified data and policies, so the same evidence serves every customer.' },
    ],
    contactTopic: 'climate',
  },
  {
    slug: 'green-finance',
    nav: 'Green finance',
    seo: {
      title: 'Green Loans, Sustainability-Linked Loans and Green Bonds',
      description: 'Access green bonds, sustainability-linked loans, transition finance and ESG-linked supply chain finance with verified emissions. See your interest saving free.',
      keywords: ['green loan India', 'sustainability-linked loan', 'green bonds', 'transition finance', 'ESG-linked credit', 'supply chain finance ESG'],
    },
    hero: {
      headline: 'Turn verified emissions into a lower interest rate.',
      sub: 'Green bonds, sustainability-linked loans, transition finance, ESG-linked credit, decarbonisation capex cases and supply chain finance tied to ESG performance.',
    },
    answer: {
      q: 'What is a sustainability-linked loan?',
      a: 'A sustainability-linked loan lowers its interest margin when the borrower meets agreed ESG targets, such as cutting emissions per unit. The lender needs a verified baseline and yearly proof. Senseible provides both from your bills, with every figure traceable.',
    },
    tool: { title: 'Sustainability-linked loan saving', cta: 'See my interest saving' },
    deliverable: {
      title: 'Lender pack',
      rows: [['Verified baseline, Scope 1 and 2', '160.9 tCO₂e'], ['KPI: emissions per tonne', '1.84 → 1.62'], ['Use of proceeds', 'Solar 150 kW, VFDs'], ['Expected avoided emissions', '131 tCO₂e a year'], ['Evidence index', 'Per figure'], ['Carbon value at ₹750/t', '₹98,250 a year']],
    },
    objections: { price: PRICE_SELF_SERVE, time: 'The estimate takes a minute. Lender packs are planned on the scoping call.', data: 'A year of bills, your loan or project details, and the lender\'s term sheet if you have one.', who: 'Senseible verifies the data and builds the pack. Your lender decides the terms.' },
    plan: 'pro',
    product: [
      { label: 'Climate finance', to: '/climate-finance' },
      { label: 'How to get a green loan in India', to: '/climate-intelligence/how-to-get-green-loans-india-carbon-data' },
      { label: 'Monetize verified records', to: '/monetize' },
    ],
    faqs: [
      { q: 'What is the difference between a green loan and a sustainability-linked loan?', a: 'A green loan funds a green project. A sustainability-linked loan can fund anything, but its rate depends on ESG targets.' },
      { q: 'Do you lend money?', a: 'No. We prepare the verified data and pack. Banks and NBFCs decide and lend.' },
      { q: 'Why do lenders reject green loan applications?', a: 'Usually missing baselines or unverifiable claims. A traceable baseline fixes the most common gap.' },
    ],
    contactTopic: 'monetization',
  },
];

export const serviceBySlug = new Map(servicePages.map(s => [s.slug, s]));
