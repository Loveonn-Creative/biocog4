// Software comparison guides: nine buyer guides, one per category, each at an
// evergreen URL. Every product fact below was confirmed on the vendor's own
// site, docs, pricing page or press release; the URL and the date it was seen
// sit in each product's `sources`. Ratings are shown only when a rating page
// was opened (none could be, so every rating is null and nothing shows).
// Prices are exactly as published, or "On request". Products whose vendor site
// could not be opened are left out rather than described from memory.
// Senseible's own entries follow docs/context/senseible.md and are scored on
// the same criteria with the same marks. Senseible is never in the tender list.

import { TIER_PRICES } from '@/lib/pricing/pricingMath';
import { GUIDE_META, HELD_GUIDES, type GuideId } from './softwareGuideMeta';

export type { GuideId };

export type Mark = 'yes' | 'partly' | 'no' | 'unknown';

export interface Rating { site: string; score: number; count: number; seen: string; url: string }

interface RawProduct {
  id: string;
  name: string;
  vendor: string | null;
  site: string | null;
  who: string | null;
  pricing: string | null;
  free: string | null;
  status: string | null;
  bestFor: string | null;
  strengths: string[];
  limits: string[];
  caps: Record<string, { v: Mark; note?: string }>;
  rating: Rating | null;
  researchRank: number | null;
  sources: { url: string; seen: string }[];
}

export interface Product extends RawProduct { tags: string[]; isSenseible: boolean }

export interface Criterion {
  id: string;
  /** Column header: two or three words. */
  short: string;
  label: string;
  /** The question to put to a vendor. */
  ask: string;
}

export interface Situation {
  id: string;
  label: string;
  /** The search question this situation answers, shown under Quick answers. */
  q?: string;
  /** Criterion id, or `tag:<tag>`, to how much it matters (1 to 4). */
  weights: Record<string, number>;
}

export interface Guide {
  id: GuideId;
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  /** One line, placed under the lede. */
  disclosure: string;
  criteria: Criterion[];
  situations: Situation[];
  /** Product id to tags, each tag a fact from that product's research. */
  tags: Record<string, string[]>;
  tagLabels: Record<string, string>;
  related: GuideId[];
  /** Entries that are not the thing the guide compares (a readiness step):
   *  last by default, and last in any situation they do not match by tag. */
  pinLast?: string[];
  /** Label for the pricing line when "Pricing" does not fit (loans, notices). */
  priceLabel?: string;
  next?: { lead: string; label: string; to: string };
  /** Short context block, facts only (CBAM: what the EU gives you free). */
  context?: { title: string; points: string[] };
  keywords: string[];
}

const DISCLOSURE = 'Senseible makes one of the tools on this list.';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
// Senseible's prices come from the pricing module, so the guide never quotes
// a figure checkout does not charge. GST is added at checkout.
const SENSEIBLE_PRICE = `Free Snapshot plan. Paid plans from ${inr(TIER_PRICES.essential.yearly)} a month billed yearly, plus GST. Scale on request.`;
const SENSEIBLE_CBAM_PRICE = `CBAM calculator and CBAM suite free on every plan. Paid plans from ${inr(TIER_PRICES.essential.yearly)} a month billed yearly, plus GST.`;
const SENSEIBLE_LOAN_PRICE = `The check is free. Application prep on Essential and higher, from ${inr(TIER_PRICES.essential.yearly)} a month billed yearly, plus GST.`;

const ALL_GUIDES: Guide[] = [
  {
    id: 'carbon-accounting',
    ...GUIDE_META['carbon-accounting'],
    lede: 'Most tools here cover Scope 1, 2 and 3. The difference shows when an auditor asks where a number came from, or when your data sits in bills instead of an ERP.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 's12_location_market', short: 'Scope 2 both ways', label: 'Scope 1 and 2, with location-based and market-based Scope 2', ask: 'Show me one electricity bill calculated both ways.' },
      { id: 's3_all_15', short: 'All 15 Scope 3', label: 'All 15 Scope 3 categories, with a choice of method', ask: 'Which Scope 3 categories can we calculate today, and by which method?' },
      { id: 'source_data_ingestion', short: 'Reads source data', label: 'Takes data from source: bill and invoice reading, or ERP and utility connectors', ask: 'Can it read our bills as they are, or do we type them in?' },
      { id: 'audit_trail', short: 'Audit trail', label: 'A line-level trail an assurer can follow: source, edits, approvals', ask: 'Click one total and walk me back to the document.' },
      { id: 'factor_transparency', short: 'Factor on each line', label: 'Emission factor and its source shown on each line; custom factors allowed', ask: 'Which factor did this line use, from which source and year?' },
      { id: 'framework_outputs', short: 'Disclosure outputs', label: 'Outputs for CSRD, ISSB, CDP, California SB 253 or BRSR', ask: 'Is the framework we file included, or a paid add-on?' },
      { id: 'security_cert', short: 'SOC 2 or ISO 27001', label: 'Published security certification (SOC 2 or ISO 27001)', ask: 'Send us the current SOC 2 report or ISO 27001 certificate.' },
      { id: 'targets_scenarios', short: 'Targets and scenarios', label: 'Target setting and reduction scenarios', ask: 'What does a solar install or a fuel switch do to next year’s total?' },
    ],
    situations: [
      { id: 'msme-bills', label: 'Indian MSME or exporter working from bills', q: 'What is the best carbon accounting software for an Indian MSME working from bills in 2027?', weights: { source_data_ingestion: 3, factor_transparency: 2, audit_trail: 2, s12_location_market: 1, 'tag:india': 3, 'tag:free-plan': 2 } },
      { id: 'multinational', label: 'Multinational filing CSRD or ISSB', q: 'What is the best carbon accounting software for a multinational filing CSRD or ISSB in 2027?', weights: { framework_outputs: 3, s3_all_15: 3, audit_trail: 2, security_cert: 2, s12_location_market: 2 } },
      { id: 'assurance', label: 'Getting ready for assurance', q: 'Which carbon accounting software is best for getting ready for assurance in 2027?', weights: { audit_trail: 3, factor_transparency: 3, security_cert: 2, s12_location_market: 1 } },
      { id: 'suite', label: 'Already on SAP, Microsoft, Salesforce or IBM', q: 'Which carbon accounting software works best if you already use SAP, Microsoft, Salesforce or IBM?', weights: { 'tag:suite': 4, source_data_ingestion: 2, framework_outputs: 1 } },
      { id: 'targets', label: 'Setting targets and a reduction plan', q: 'Which carbon accounting software is best for setting targets and a reduction plan in 2027?', weights: { targets_scenarios: 3, s3_all_15: 1, factor_transparency: 1 } },
    ],
    tags: {
      'the-sustainability-cloud': ['india', 'free-plan'],
      'climes-carbon-os': ['india'],
      senseible: ['india', 'free-plan'],
      persefoni: ['free-plan'],
      'ibm-envizi-esg-suite': ['suite'],
      'microsoft-sustainability-manager': ['suite'],
      'salesforce-net-zero-cloud': ['suite'],
      'sap-sustainability-footprint-management': ['suite'],
    },
    tagLabels: { india: 'Built for Indian companies', 'free-plan': 'Has a free plan', suite: 'Runs inside a business suite you may already use' },
    related: ['supplier-emissions', 'carbon-compliance', 'brsr'],
    next: { lead: 'Talking to two or three of these?', label: 'Score them with your own weights', to: '/carbon-accounting-software-india' },
    keywords: ['best carbon accounting software 2027', 'best carbon accounting software', 'carbon accounting software India 2027', 'carbon accounting software comparison', 'GHG accounting software', 'Scope 3 software', 'carbon accounting tools India'],
  },
  {
    id: 'dmrv',
    ...GUIDE_META['dmrv'],
    lede: 'Digital MRV is meant to shorten the months between monitoring and issuance. Some tools here measure land from space, one turns a registry methodology into a workflow, and two are pilots run by the registries themselves.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'satellite_remote_sensing', short: 'Satellite', label: 'Satellite or remote-sensing measurement (biomass, soil carbon, land use)', ask: 'Which satellites, at what resolution, and how was the model calibrated?' },
      { id: 'field_sensor_data', short: 'Ground truth', label: 'Field samples, plots, meters or IoT feeds tied into the model', ask: 'How do field samples or meter readings correct the model?' },
      { id: 'registry_alignment', short: 'Registry method', label: 'Built to a registry methodology (Verra, Gold Standard, Indian Carbon Market or others)', ask: 'Which methodology and version, and has the registry accepted it?' },
      { id: 'credit_quality_rating', short: 'Quality rating', label: 'Independent quality or risk rating of credits or projects', ask: 'Who rates the risk, and are they independent of the seller?' },
      { id: 'tamper_evident_record', short: 'Tamper-evident', label: 'Tamper-evident record: hashing, ledger or versioned audit trail', ask: 'If a reading changes, where does the old value show?' },
      { id: 'verifier_workflow', short: 'Verifier workflow', label: 'Supports a verification body (VVB) review or digital issuance', ask: 'Can our verifier work inside it, or do we send files?' },
      { id: 'developer_tooling', short: 'Developer tools', label: 'Tools for developers to run monitoring and produce issuance-ready reports', ask: 'Can we run monitoring ourselves, or only buy it as a service?' },
    ],
    situations: [
      { id: 'nature', label: 'Forest, farm or soil project developer', weights: { satellite_remote_sensing: 3, registry_alignment: 3, developer_tooling: 2, field_sensor_data: 1 } },
      { id: 'build', label: 'Building our own methodology workflow', weights: { developer_tooling: 3, tamper_evident_record: 3, verifier_workflow: 2, registry_alignment: 2 } },
      { id: 'buyer', label: 'Credit buyer checking quality', weights: { credit_quality_rating: 3, 'tag:buyer': 2, satellite_remote_sensing: 1, verifier_workflow: 1 } },
      { id: 'india-market', label: 'Project aiming at the Indian Carbon Market', weights: { 'tag:icm': 3, registry_alignment: 2, satellite_remote_sensing: 1 } },
      { id: 'company', label: 'Company proving its own emissions to lenders or buyers', weights: { 'tag:company': 4, tamper_evident_record: 2, field_sensor_data: 2 } },
    ],
    tags: {
      boomitra: ['buyer'],
      sylithe: ['buyer', 'icm'],
      pramaanone: ['company'],
      senseible: ['company'],
    },
    tagLabels: { buyer: 'Built with credit buyers in mind', icm: 'States alignment with the Indian Carbon Market', company: 'Built for company emissions evidence' },
    related: ['carbon-credits', 'carbon-accounting'],
    next: { lead: 'New to carbon credits in India?', label: 'See which market fits you', to: '/carbon-credits-india' },
    keywords: ['digital MRV platforms', 'dMRV software', 'carbon project MRV', 'remote sensing carbon credits', 'Verra digital MRV'],
  },
  {
    id: 'supplier-emissions',
    ...GUIDE_META['supplier-emissions'],
    lede: 'Your Scope 3 sits with suppliers, and many of them will not fill in a carbon questionnaire. These tools differ on what they ask suppliers for, who pays, and how clearly they label estimates.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'supplier_request_portal', short: 'Request portal', label: 'Sends data requests to suppliers through a portal or campaign, with reminders', ask: 'How does a supplier with no login respond, and who chases them?' },
      { id: 'supplier_primary_data', short: 'Supplier data', label: 'Takes supplier-specific data: activity data, a company footprint or a product footprint', ask: 'What exactly does a supplier send: bills, a questionnaire or a footprint?' },
      { id: 'spend_fallback_labelled', short: 'Labelled estimates', label: 'Spend-based or average-data estimates for the long tail, labelled by method', ask: 'Can I see which lines are measured and which are spend estimates?' },
      { id: 'hotspot_prioritisation', short: 'Hotspots', label: 'Ranks suppliers and categories by emissions, so you know whom to ask first', ask: 'Which 20 suppliers should we start with, and why?' },
      { id: 'supplier_data_quality', short: 'Quality score', label: 'A data-quality score or tier per supplier or data point', ask: 'How is each supplier’s data graded, and can our auditor see the grade?' },
      { id: 'supplier_reduction_engagement', short: 'Reduction plans', label: 'Joint targets, action plans or progress tracking with suppliers', ask: 'Can we set a target with a supplier and track it?' },
      { id: 'procurement_erp_integration', short: 'ERP and exchange', label: 'Pulls purchase data from ERP or procurement systems; supports PACT or Catena-X', ask: 'Which ERP do you connect to today, without a custom project?' },
      { id: 'free_for_suppliers', short: 'Free for suppliers', label: 'Suppliers can respond without paying', ask: 'Does any supplier pay anything to respond?' },
    ],
    situations: [
      { id: 'india-msme', label: 'Buyer with Indian MSME suppliers', q: 'What is the best Scope 3 supplier emissions software for buyers with Indian MSME suppliers in 2027?', weights: { supplier_primary_data: 3, free_for_suppliers: 3, spend_fallback_labelled: 2, 'tag:india': 3, 'tag:documents': 2 } },
      { id: 'bills', label: 'Suppliers who send bills, not questionnaires', q: 'Which supplier emissions software works when suppliers send bills instead of questionnaires?', weights: { 'tag:documents': 4, supplier_primary_data: 3, free_for_suppliers: 2, supplier_data_quality: 1 } },
      { id: 'global', label: 'Large multi-country supplier programme', q: 'What is the best supplier emissions software for a large multi-country supplier programme in 2027?', weights: { supplier_request_portal: 3, hotspot_prioritisation: 2, supplier_data_quality: 2, supplier_reduction_engagement: 2, procurement_erp_integration: 2 } },
      { id: 'pcf', label: 'Product footprints from suppliers', q: 'Which supplier emissions software is best for collecting product carbon footprints from suppliers?', weights: { 'tag:pcf': 4, supplier_primary_data: 2, procurement_erp_integration: 2 } },
      { id: 'reduce', label: 'Cutting supplier emissions, not only counting', q: 'Which supplier emissions software helps cut supplier emissions, not only count them?', weights: { supplier_reduction_engagement: 3, hotspot_prioritisation: 2, supplier_data_quality: 1 } },
    ],
    tags: {
      'the-sustainability-cloud': ['india', 'pcf'],
      senseible: ['india', 'documents'],
      'sprih-supplier-data-exchange': ['documents'],
      makersite: ['pcf'],
      'sphera-supplier-engagement-and-supplier-pcf-calculator': ['pcf'],
    },
    tagLabels: { india: 'Built with Indian suppliers in mind', documents: 'Reads the documents suppliers already have', pcf: 'Handles product-level footprints' },
    related: ['carbon-accounting', 'cbam', 'brsr'],
    next: { lead: 'Not sure how much of your Scope 3 is guesswork?', label: 'Check your supplier evidence', to: '/scope-3-supplier-evidence' },
    keywords: ['best supplier emissions software 2027', 'best Scope 3 software 2027', 'supplier emissions software', 'Scope 3 software', 'supplier engagement carbon', 'Scope 3 supplier data', 'supply chain emissions tools'],
  },
  {
    id: 'carbon-compliance',
    ...GUIDE_META['carbon-compliance'],
    lede: 'CSRD, ISSB, BRSR, India’s carbon market and California’s SB 253 ask for overlapping numbers in different formats. The tools differ on which rules they cover and whether an auditor can trace each number.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'csrd', short: 'CSRD', label: 'CSRD and ESRS reporting', ask: 'Does it run double materiality on the current CSRD scope?' },
      { id: 'issb', short: 'ISSB', label: 'ISSB (IFRS S1 and S2)', ask: 'Which IFRS S2 metrics come straight from our emissions data?' },
      { id: 'brsr', short: 'BRSR', label: 'SEBI BRSR and BRSR Core', ask: 'Does it produce BRSR Core with the evidence an assessor asks for?' },
      { id: 'ccts', short: 'India CCTS', label: 'India’s Carbon Credit Trading Scheme (BEE emission intensity reports)', ask: 'Does it track our intensity target and certificate position?' },
      { id: 'sb253', short: 'SB 253', label: 'California SB 253 and SB 261', ask: 'Which SB 253 outputs are included today?' },
      { id: 'ghg', short: 'Scope 1 to 3 built in', label: 'Built-in Scope 1, 2 and 3 calculation', ask: 'Are emissions calculated inside, or imported from another tool?' },
      { id: 'audit', short: 'Audit trail', label: 'Audit trail and assurance readiness: evidence, approvals, auditor access', ask: 'Can our auditor log in and trace a figure to its document?' },
      { id: 'tagging', short: 'XBRL tagging', label: 'Digital tagging (XBRL or iXBRL) for filing', ask: 'Does it produce the tagged file, or do we tag it elsewhere?' },
    ],
    situations: [
      { id: 'india-listed', label: 'Indian listed company (BRSR, CCTS)', q: 'What is the best carbon compliance software for an Indian listed company under BRSR and CCTS in 2027?', weights: { brsr: 3, ccts: 3, audit: 2, tagging: 1, ghg: 1 } },
      { id: 'eu', label: 'EU group under CSRD', q: 'What is the best carbon compliance software for an EU group reporting under CSRD in 2027?', weights: { csrd: 3, tagging: 3, audit: 2, issb: 1 } },
      { id: 'us', label: 'US-linked: California SB 253', q: 'Which carbon compliance software covers California SB 253 in 2027?', weights: { sb253: 3, issb: 2, ghg: 2, audit: 1 } },
      { id: 'both', label: 'Indian group facing EU and Indian rules', q: 'Which carbon compliance software covers both EU and Indian rules for an Indian group?', weights: { brsr: 2, ccts: 2, csrd: 2, issb: 1, ghg: 1, audit: 1 } },
      { id: 'supplier', label: 'Supplier answering a listed customer', q: 'Which carbon compliance software suits a supplier answering a listed customer’s request?', weights: { ghg: 3, audit: 3, brsr: 1, 'tag:sme': 2 } },
    ],
    tags: { intellocarbon: ['sme'], senseible: ['sme'] },
    tagLabels: { sme: 'Built for MSMEs' },
    related: ['brsr', 'cbam', 'carbon-accounting'],
    next: { lead: 'Talking to two or three of these?', label: 'Score them with your own weights', to: '/carbon-accounting-software-india' },
    keywords: ['best carbon compliance software 2027', 'CSRD software 2027', 'carbon compliance software', 'CSRD software', 'ISSB reporting software', 'BRSR compliance software', 'CCTS compliance software'],
  },
  {
    id: 'cbam',
    ...GUIDE_META['cbam'],
    lede: 'CBAM certificates go on sale in February 2027, yet several tools below still describe the quarterly reports that ended in 2025. Exporters must give their EU buyer emissions data it can use. Importers must file a declaration and budget for certificates.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'goods', short: 'All six sectors', label: 'Covers all six CBAM sectors by CN code', ask: 'Which of our CN codes does it cover today?' },
      { id: 'actuals', short: 'Plant actuals', label: 'Actual embedded emissions per installation: direct, indirect and precursors, by production process', ask: 'Show us two production routes under one CN code.' },
      { id: 'supplier_collection', short: 'Supplier collection', label: 'Collects emissions data from non-EU operators and suppliers', ask: 'How does a supplier with no CBAM knowledge send us their data?' },
      { id: 'operator_template', short: 'EU operator template', label: 'Produces the operator’s emissions report in the EU template', ask: 'Export the Commission template for one of our goods, now.' },
      { id: 'verification', short: 'Verifier support', label: 'Supports verification by an accredited CBAM verifier', ask: 'Which accredited verifier signs, and what do you hand them?' },
      { id: 'defaults', short: 'Default values', label: 'Handles EU default values with the year’s mark-up', ask: 'Where do default values replace our actuals, and with which mark-up?' },
      { id: 'certificates', short: 'Certificate cost', label: 'Estimates certificates owed, after the free-allocation adjustment', ask: 'What will our 2026 imports cost in certificates?' },
      { id: 'declarant_definitive', short: 'Declaration, current rules', label: 'Annual declaration and the 50% quarterly holding, on current rules rather than the old quarterly reports', ask: 'Show us the annual declaration, not a quarterly report.' },
    ],
    situations: [
      { id: 'ex-steel', label: 'Indian exporter: steel or aluminium', q: 'What is the best CBAM software for Indian steel and aluminium exporters in 2027?', weights: { 'tag:exporter': 4, actuals: 3, operator_template: 3, verification: 2, goods: 1, defaults: 1, 'tag:steel': 1 } },
      { id: 'ex-cement', label: 'Indian exporter: cement or fertiliser', q: 'What is the best CBAM software for Indian cement and fertiliser exporters in 2027?', weights: { 'tag:exporter': 4, actuals: 3, operator_template: 3, goods: 2, verification: 1, defaults: 1, 'tag:cement': 1 } },
      { id: 'importer', label: 'EU importer with non-EU suppliers', q: 'What is the best CBAM software for EU importers with non-EU suppliers in 2027?', weights: { 'tag:importer': 4, supplier_collection: 3, declarant_definitive: 3, certificates: 2, defaults: 1 } },
      { id: 'budget', label: 'Budgeting certificate cost for 2027', q: 'Which CBAM software helps budget certificate costs for 2027?', weights: { certificates: 3, defaults: 2, declarant_definitive: 1, actuals: 1 } },
    ],
    tags: {
      senseible: ['exporter', 'steel', 'cement'],
      'osapiens-hub-for-cbam': ['importer'],
      'cbam-compliance-manager': ['importer'],
      'carbon-os': ['exporter', 'steel', 'cement'],
      'tsc-netzero-cbam-importer-and-cbam-exporter': ['exporter', 'importer'],
      unicore: ['exporter'],
      'intellocarbon-cbam-compliance': ['exporter', 'steel', 'cement'],
      'cleancarbon-ai-cbam-software': ['exporter', 'steel'],
      carbonneeti: ['exporter'],
      netzerra: ['exporter', 'steel', 'cement'],
      'carbmee-eis': ['importer'],
      'greenly-cbam': ['importer'],
      karbon: ['exporter'],
      greenalign: ['exporter'],
    },
    tagLabels: { exporter: 'Built for the exporter (plant) side', importer: 'Built for the EU importer side', steel: 'Names steel or aluminium among its sectors', cement: 'Names cement or fertilisers among its sectors' },
    related: ['supplier-emissions', 'carbon-compliance', 'brsr'],
    next: { lead: 'Exporting from India?', label: 'CBAM for Indian exporters, explained', to: '/cbam' },
    context: {
      title: 'What the EU gives you free',
      points: [
        'The operator’s emissions report template, which plants must use when they report actual emissions.',
        'The CBAM Registry, where a plant uploads its data once and shares it with each EU declarant.',
        'Default values, benchmarks and ten guidance documents for non-EU operators.',
        'They hold and share data. They do not collect plant data, split it across processes or chase suppliers. That gap is what the tools below sell.',
      ],
    },
    keywords: ['best CBAM software 2027', 'best CBAM software', 'CBAM software 2027', 'CBAM software for Indian exporters', 'CBAM reporting software', 'CBAM software India', 'CBAM declarant software'],
  },
  {
    id: 'brsr',
    ...GUIDE_META['brsr'],
    lede: 'In March 2025 SEBI let companies choose assessment or assurance for BRSR Core and made value chain disclosure voluntary from FY 2025-26. Some tools still describe the old rules.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'full_brsr', short: 'Full BRSR', label: 'Full BRSR in SEBI format: all nine principles, essential and leadership indicators', ask: 'Does it produce all nine principles, or only the environment section?' },
      { id: 'brsr_core', short: 'BRSR Core', label: 'BRSR Core: the nine attributes, with evidence ready for assessment or assurance', ask: 'For each Core attribute, what evidence sits behind the number?' },
      { id: 'value_chain', short: 'Value chain', label: 'Collects data from value chain partners (2% or more of purchases or sales)', ask: 'How do our partners send data, and what does it cost them?' },
      { id: 'ghg_india', short: 'Indian factors', label: 'Scope 1 and 2 from activity data with Indian factors (CEA grid factor by year)', ask: 'Which CEA grid factor version does it use for this financial year?' },
      { id: 'evidence', short: 'Evidence per figure', label: 'Source document, factor and approver kept against each figure', ask: 'Click a figure: who approved it, and from which bill?' },
      { id: 'xbrl', short: 'XBRL', label: 'Exchange XBRL output for filing', ask: 'Does it produce the exchange XBRL file?' },
      { id: 'current_rules', short: 'March 2025 rules', label: 'Reflects SEBI’s March 2025 changes', ask: 'Show us where it handles assessment versus assurance.' },
      { id: 'pricing', short: 'Published price', label: 'Price published on its site', ask: 'What will year one cost, all in?' },
    ],
    situations: [
      { id: 'top250', label: 'Top 250 listed company', q: 'What is the best BRSR Core software for a top 250 listed company in 2027?', weights: { full_brsr: 3, brsr_core: 3, value_chain: 3, xbrl: 2, current_rules: 2 } },
      { id: 'core-first', label: 'Listed 251 to 1,000, first BRSR Core check', q: 'Which BRSR software is best for a first BRSR Core check (listed 251 to 1,000)?', weights: { brsr_core: 3, evidence: 3, current_rules: 2, ghg_india: 2, full_brsr: 2 } },
      { id: 'supplier', label: 'Supplier asked for figures by a listed customer', q: 'Which BRSR software suits a supplier asked for figures by a listed customer?', weights: { ghg_india: 3, evidence: 3, pricing: 2, current_rules: 1, 'tag:free': 2 } },
      { id: 'plant', label: 'Manufacturer working from plant bills', q: 'Which BRSR software works best for a manufacturer reporting from plant bills?', weights: { ghg_india: 3, evidence: 3, brsr_core: 2, 'tag:bills': 2 } },
    ],
    tags: {
      carbonneeti: ['free', 'bills'],
      carbonlens: ['free', 'bills'],
      'updapt-brsr-reporting': ['free'],
      senseible: ['free', 'bills'],
      'carbon-os': ['bills'],
      karbon: ['bills'],
      'intellocarbon-esg-disclosure-bundle': ['bills'],
    },
    tagLabels: { free: 'Free plan or trial', bills: 'Reads utility bills or invoices' },
    related: ['carbon-compliance', 'supplier-emissions', 'carbon-accounting'],
    next: { lead: 'New to BRSR Core?', label: 'BRSR and BRSR Core, explained', to: '/brsr-reporting' },
    keywords: ['best BRSR software 2027', 'BRSR Core software 2027', 'best BRSR software', 'BRSR Core software', 'BRSR reporting software India', 'SEBI BRSR tool', 'BRSR XBRL software'],
  },
  {
    id: 'carbon-credits',
    ...GUIDE_META['carbon-credits'],
    lede: 'Registries record credits, exchanges and marketplaces sell them, developers create them, and India’s own scheme, the CCTS, is new. Buyers who mix these up can pay for the wrong thing.',
    disclosure: DISCLOSURE,
    criteria: [
      { id: 'registry_issuance', short: 'Registry', label: 'Issues or tracks credits with unique serial numbers, so a tonne cannot be sold twice', ask: 'Where is the serial number kept, and who can see it retired?' },
      { id: 'buy_or_trade', short: 'Buy or trade', label: 'Lets you buy, sell or trade credits', ask: 'Can we buy here at a listed price, or do we need a broker?' },
      { id: 'public_transparency', short: 'Public record', label: 'Public view of projects, issuances and retirements', ask: 'Can anyone check this project’s issuances and retirements?' },
      { id: 'quality_labels', short: 'Quality labels', label: 'Quality signals: CORSIA, Article 6 or similar labels, or independent ratings', ask: 'Which labels does this credit carry, and who awarded them?' },
      { id: 'published_fees', short: 'Published fees', label: 'Fees or prices published', ask: 'What do we pay to open an account, buy and retire?' },
      { id: 'api_access', short: 'API', label: 'API or system access for buyers and developers', ask: 'Can our systems buy or retire through an API?' },
      { id: 'india_relevance', short: 'India', label: 'Indian projects, Indian buyers or the Indian Carbon Market', ask: 'Do you list Indian projects, or serve CCTS participants?' },
      { id: 'small_business_access', short: 'Small buyers', label: 'Usable by a small company without large minimums', ask: 'What is the smallest purchase, and what fixed fees apply?' },
    ],
    situations: [
      { id: 'small-buyer', label: 'Small company buying credits to retire', q: 'Where can a small company buy and retire carbon credits in 2027?', weights: { small_business_access: 3, buy_or_trade: 3, published_fees: 2, quality_labels: 2 } },
      { id: 'developer', label: 'Indian project owner seeking issuance', q: 'Which carbon credit registry should an Indian project owner use for issuance in 2027?', weights: { india_relevance: 3, registry_issuance: 3, 'tag:developer': 2 } },
      { id: 'ccts', label: 'Indian company under CCTS', q: 'Which carbon credit platform does an Indian company under CCTS use in 2027?', weights: { 'tag:ccts': 4, india_relevance: 2, registry_issuance: 1 } },
      { id: 'trader', label: 'Trading desk or large buyer', q: 'Which carbon credit exchange suits a trading desk or large buyer in 2027?', weights: { buy_or_trade: 3, quality_labels: 2, api_access: 2, 'tag:trading': 2 } },
      { id: 'msme-ready', label: 'MSME checking if its savings could count later', q: 'Which tool helps an MSME check if its energy savings could earn carbon credits later?', weights: { 'tag:readiness': 4, india_relevance: 2, small_business_access: 2 } },
    ],
    tags: {
      'verra-registry': ['developer'],
      'gold-standard-impact-registry-and-marketplace': ['developer'],
      'eki-energy-services': ['developer'],
      'indian-carbon-market': ['ccts'],
      cbl: ['trading'],
      senseible: ['readiness'],
    },
    tagLabels: { developer: 'Serves project developers', ccts: 'Runs India’s compliance market', trading: 'Built for trading desks', readiness: 'Gets your evidence ready before a developer or registry' },
    related: ['dmrv', 'green-loans'],
    pinLast: ['senseible'],
    next: { lead: 'Four different things are called carbon credits in India.', label: 'See which one fits you', to: '/carbon-credits-india' },
    keywords: ['best carbon credit platforms 2027', 'carbon credit platforms', 'carbon credit registry', 'carbon credit exchange', 'buy carbon credits India', 'Indian Carbon Market'],
  },
  {
    id: 'green-loans',
    ...GUIDE_META['green-loans'],
    lede: 'SIDBI, IREDA and NBFC green lenders each fund different green projects, with different limits and paperwork, and many do not publish a rate.',
    disclosure: 'Senseible’s loan-readiness check is listed here. Senseible does not lend, arrange or approve loans.',
    criteria: [
      { id: 'what_it_funds', short: 'What it funds', label: 'Which green projects it pays for', ask: 'Is our exact equipment or project on the eligible list?' },
      { id: 'ticket_size', short: 'Loan limits', label: 'Published loan or cover limits', ask: 'What is the minimum and maximum, and does our project fit?' },
      { id: 'financing_share', short: 'Share financed', label: 'Share of project cost financed (the rest is your margin)', ask: 'How much do we put in ourselves?' },
      { id: 'eligibility', short: 'Who qualifies', label: 'Who qualifies: years running, profits, Udyam, credit history', ask: 'How many years of profit do you need to see?' },
      { id: 'tenure', short: 'Repayment period', label: 'Repayment period', ask: 'How long to repay, and is there a moratorium?' },
      { id: 'rate_published', short: 'Rate published', label: 'Interest rate or fee published', ask: 'What rate, and is it fixed or linked to a benchmark?' },
      { id: 'apply_route', short: 'How to apply', label: 'How to apply: online portal, branch or referral partner', ask: 'Can we apply online, and who helps us fill it in?' },
      { id: 'evidence_asked', short: 'Evidence asked', label: 'Energy, emission or environmental evidence the lender asks for', ask: 'Which bills, audits or reports do you want with the application?' },
    ],
    situations: [
      { id: 'efficiency', label: 'Energy-efficiency upgrade', q: 'Which green loan is best for an MSME energy-efficiency upgrade in India in 2027?', weights: { 'tag:efficiency': 4, financing_share: 1, ticket_size: 1, apply_route: 1 } },
      { id: 'solar', label: 'Rooftop solar', q: 'Which green loan is best for MSME rooftop solar in India in 2027?', weights: { 'tag:solar': 4, ticket_size: 1, tenure: 1 } },
      { id: 'machinery', label: 'New or replacement machinery', q: 'Which green loan funds new or replacement machinery for Indian MSMEs in 2027?', weights: { 'tag:machinery': 4, ticket_size: 1, tenure: 1 } },
      { id: 'new-unit', label: 'Unit under three years old', q: 'Which green loans can an MSME unit under three years old get in India?', weights: { 'tag:new-unit': 4, apply_route: 1 } },
      { id: 'small-loan', label: 'Small loan, no property to pledge', q: 'Which green loans can an Indian MSME get without pledging property?', weights: { 'tag:small-loan': 4, eligibility: 1 } },
      { id: 'papers', label: 'Getting papers ready first', q: 'Where can an Indian MSME get its green loan papers ready before applying?', weights: { evidence_asked: 3, 'tag:readiness': 3 } },
    ],
    tags: {
      'sidbi-green-finance-scheme': ['efficiency', 'solar', 'new-unit'],
      'sidbi-end-to-end-energy-efficiency': ['efficiency', 'machinery'],
      'sidbi-machinery-loans': ['machinery', 'new-unit'],
      'sidbi-gcf-fmap': ['efficiency', 'machinery'],
      'mse-gift-and-mse-spice': ['efficiency'],
      'ireda-energy-efficiency-loans': ['efficiency'],
      'ireda-rooftop-solar-loan-scheme': ['solar'],
      'rbi-rules-on-msme-collateral': ['small-loan'],
      'senseible-green-loan-check': ['readiness'],
    },
    tagLabels: { efficiency: 'Lends for energy efficiency', solar: 'Lends for solar', machinery: 'Lends for equipment or machinery', 'new-unit': 'Open to units under three years old', 'small-loan': 'No collateral on small loans', readiness: 'Prepares the evidence lenders ask for' },
    related: ['carbon-credits', 'tenders'],
    pinLast: ['senseible-green-loan-check'],
    priceLabel: 'Rate or cost',
    next: { lead: 'Know what the money is for?', label: 'Compare schemes by need', to: '/msme-green-loan-schemes' },
    keywords: ['best green loans for MSME India 2027', 'green loans for MSME India', 'SIDBI green loan', 'IREDA energy efficiency loan', 'MSME green finance', 'green loan India'],
  },
  {
    id: 'tenders',
    ...GUIDE_META['tenders'],
    lede: 'EU tender notices can carry green procurement criteria. UK central government contracts above £5 million a year ask bidders for a Carbon Reduction Plan. These are the official, free places to find those tenders.',
    disclosure: 'Senseible is not a tender platform and is not on this list.',
    criteria: [
      { id: 'coverage', short: 'Coverage', label: 'Whose tenders it covers', ask: 'Which buyers publish here, and above what value?' },
      { id: 'green_filter', short: 'Green fields', label: 'Green or sustainability fields or filters on notices', ask: 'Can we find notices with green criteria without reading each one?' },
      { id: 'free_access', short: 'Free to read', label: 'Free to search and read notices', ask: 'Is anything behind a paywall?' },
      { id: 'alerts', short: 'Alerts', label: 'Saved searches or email alerts', ask: 'Can we get new notices by email?' },
      { id: 'api_or_bulk_data', short: 'API or bulk data', label: 'API or bulk data download', ask: 'Can we pull notices into our own sheet or system?' },
      { id: 'india_relevance', short: 'Open to Indian firms', label: 'Indian firms can read notices and bid where the tender allows', ask: 'Does this tender accept bidders from outside the country?' },
      { id: 'emission_evidence_in_bids', short: 'Carbon in bids', label: 'Where verified emission evidence helps a bid', ask: 'What carbon evidence does this buyer score, and how?' },
    ],
    situations: [
      { id: 'eu', label: 'Indian exporter eyeing EU tenders', weights: { 'tag:eu': 4, green_filter: 2, api_or_bulk_data: 1 } },
      { id: 'uk-central', label: 'Supplier to UK central government', weights: { 'tag:uk': 4, emission_evidence_in_bids: 3 } },
      { id: 'small', label: 'Small supplier, lower-value contracts', weights: { 'tag:small': 4, free_access: 1 } },
    ],
    priceLabel: 'Cost',
    tags: { ted: ['eu'], 'find-a-tender': ['uk'], 'contracts-finder': ['uk', 'small'] },
    tagLabels: { eu: 'EU public tenders', uk: 'UK public tenders', small: 'Lower-value contracts' },
    related: ['green-loans', 'cbam'],
    keywords: ['sustainability tender platforms', 'green tenders', 'TED tenders', 'Carbon Reduction Plan tenders', 'public procurement carbon'],
  },
];

// <products generated>
const RAW_PRODUCTS: Record<GuideId, RawProduct[]> = {
 "carbon-accounting": [
  {
   "id": "persefoni",
   "name": "Persefoni (Pro and Advanced)",
   "vendor": "Persefoni",
   "site": "https://www.persefoni.com/",
   "who": "Pro: companies with low to medium complexity answering customer or investor footprint requests; Advanced: enterprises and financial institutions (PCAF financed emissions).",
   "pricing": "Pro: free. Advanced: on request.",
   "free": "Free plan (Pro): single user, no time limit, no credit card.",
   "status": null,
   "bestFor": "Teams that need a free starting footprint now and an enterprise upgrade path later.",
   "strengths": [
    "A free Scope 1 to 3 plan that covers all 15 Scope 3 categories.",
    "States SOC 2 Type II and ISO 27001 compliance."
   ],
   "limits": [
    "Free plan is one user; framework metric exports and the methodology report are paid add-ons.",
    "No document reading of bills or invoices found; data comes in through forms, uploads or APIs."
   ],
   "caps": {
    "s12_location_market": {
     "v": "yes",
     "note": "Market-based Scope 2 is listed for Advanced."
    },
    "s3_all_15": {
     "v": "yes",
     "note": "All 15 categories, including in the free Pro plan."
    },
    "source_data_ingestion": {
     "v": "partly",
     "note": "Forms and bulk upload in Pro; APIs and integration hub in Advanced. No document reading found."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Footprint ledger and exportable audit history (Advanced)."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Managed factor sets; custom and extra factors in Advanced; methodology report is an add-on."
    },
    "framework_outputs": {
     "v": "yes",
     "note": "Report builder for CSRD, ISSB, CDP; metric reports for CDP, CSRD, SECR, SB 253, ISSB (several are paid add-ons in Pro). BRSR not found."
    },
    "security_cert": {
     "v": "yes",
     "note": "States SOC 1 Type II, SOC 2 Type II, ISO 27001/27017."
    },
    "targets_scenarios": {
     "v": "partly",
     "note": "Net-Zero Navigator is an add-on."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.persefoni.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.persefoni.com/business/scope-3-supplier-engagement",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "watershed",
   "name": "Watershed",
   "vendor": "Watershed",
   "site": "https://watershed.com/",
   "who": "Large companies with dedicated sustainability teams; also financial institutions (financed emissions option on site).",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Multinationals with a climate team that want measurement, reporting and supplier programmes in one system.",
   "strengths": [
    "Large factor library with calculation lineage shown.",
    "Supply chain module that ranks suppliers and feeds their responses into the footprint."
   ],
   "limits": [
    "No published pricing.",
    "Built for large companies; nothing on the site addresses small firms or India-specific frameworks."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 3 and supply chain measurement described; an explicit list of all 15 categories not found on its site."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Built-in OCR and AI data cleaning named on homepage."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Full data lineage, review workflows and human review named."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Library of 2.3 million emission factors; shows how each number was calculated."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "Multi-framework reporting with AI drafting; specific framework list not on its site."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "Decarbonisation paths and forecasting at material, product and company level."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://watershed.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://watershed.com/solutions/supply-chain",
     "seen": "2026-10-29"
    },
    {
     "url": "https://watershed.com/about-us",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sweep",
   "name": "Sweep",
   "vendor": "Sweep",
   "site": "https://www.sweep.net/",
   "who": "Enterprises and financial institutions; multi-entity, multi-region companies.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "European and US enterprises running CSRD or SB 253 reporting alongside a large supplier programme.",
   "strengths": [
    "Supplier side is free for surveyed suppliers and imports CDP and EcoVadis data.",
    "Product footprints (ISO 14067) and corporate footprint in one system."
   ],
   "limits": [
    "No published pricing.",
    "No India-specific framework coverage found."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Automated Scope 1, 2 and 3 collection across value chain; explicit 15-category list not found."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Connectors to procurement systems and ERPs, API and invoice imports."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Validator/approval workflows and full audit trails; each number traced to source."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Built-in factors from GHG Protocol, Exiobase, IPCC, EPA, ADEME."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "CSRD, CDP and SB 253 content on site; upload once, use across frameworks. BRSR not found."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "SBTi-aligned target workflow and scenario modelling."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sweep.net/carbon-management",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sweep.net/supply-chain-emissions",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sweep.net/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "ibm-envizi-esg-suite",
   "name": "IBM Envizi ESG Suite",
   "vendor": "IBM",
   "site": "https://www.ibm.com/products/envizi",
   "who": "Organisations with many sites and large data volumes; priced by data volume.",
   "pricing": "On request; an online calculator gives an indicative figure. Bundles by data volume: Essentials (up to 1,000 accounts), Standard (1,001 to 5,000), Premium (5,001 to 15,000+), plus modules.",
   "free": null,
   "status": null,
   "bestFor": "Large multi-site enterprises that already run IBM or need an ESG data warehouse.",
   "strengths": [
    "Market-based Scope 2 handled automatically with residual mix factors.",
    "Scales to very large data volumes and ERP feeds."
   ],
   "limits": [
    "No published price; final price set in a sales process.",
    "Built for large enterprises; no small-company plan found."
   ],
   "caps": {
    "s12_location_market": {
     "v": "yes",
     "note": "Applies residual mix factors to grid electricity not covered by certificates, which is the market-based method."
    },
    "s3_all_15": {
     "v": "yes",
     "note": "States coverage across all Scope 3 categories."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Order-level data ingested directly from ERP and finance systems; AI classifies spend."
    },
    "audit_trail": {
     "v": "partly",
     "note": "Built to stand up to external auditors; validation rules and anomaly flags in supply chain module."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Over 40,000 managed factors (EPA, eGRID, DEFRA, IEA, residual mix); custom sets allowed."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "Prebuilt templates aligned to framework questionnaires; specific list not on its site."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "partly"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.ibm.com/products/envizi/scope-1-2-ghg-accounting-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ibm.com/products/envizi/scope-3-ghg-accounting-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ibm.com/products/envizi/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ibm.com/products/envizi/supply-chain",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "microsoft-sustainability-manager",
   "name": "Microsoft Sustainability Manager",
   "vendor": "Microsoft",
   "site": "https://www.microsoft.com/en-us/sustainability/microsoft-sustainability-manager",
   "who": "Organisations on Microsoft cloud; priced per tenant.",
   "pricing": "Essentials: US$4,000 per tenant per month. Premium: US$12,000 per tenant per month. Some features need other Microsoft licences.",
   "free": null,
   "status": null,
   "bestFor": "Large companies standardised on Microsoft cloud that want sustainability data next to their other business data.",
   "strengths": [
    "Published list prices.",
    "Names BRSR among its preparatory report standards."
   ],
   "limits": [
    "All Scope 3 categories only on the US$12,000 a month Premium tier.",
    "Depends on other Microsoft licences for some features."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Essentials covers Scopes 1, 2 and multiple Scope 3 categories; Premium covers all of Scope 3."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Several ingestion methods with increasingly automated data connections."
    },
    "audit_trail": {
     "v": "unknown"
    },
    "factor_transparency": {
     "v": "partly",
     "note": "Pre-built calculation methods that can be tailored."
    },
    "framework_outputs": {
     "v": "yes",
     "note": "Preparatory reports for CSRD, ASRS, BRSR, GRI, IFRS S1/S2, SASB."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "partly",
     "note": "Targets and scorecards; scenario modelling not found."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.microsoft.com/en-us/sustainability/microsoft-sustainability-manager",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "salesforce-net-zero-cloud",
   "name": "Salesforce Net Zero Cloud",
   "vendor": "Salesforce",
   "site": "https://www.salesforce.com/net-zero/",
   "who": "Salesforce customers; Growth edition; add-ons for Enterprise, Unlimited and Performance editions.",
   "pricing": "Net Zero Cloud Growth: on request. Published add-ons: CRM Analytics US$165 per user a month (billed annually); External Engagement Management US$60K per org a year; Agentforce for Net Zero Cloud US$150 per user a month; Multi-Organization Support US$24K per org a year; User Add-On US$25 per user a month.",
   "free": null,
   "status": null,
   "bestFor": "Salesforce customers who want ESG data in the same system as their CRM.",
   "strengths": [
    "Document reader, audit trail and REC management listed in the base edition.",
    "Fits companies already running Salesforce."
   ],
   "limits": [
    "Core edition price not published; the supplier data add-on is US$60K per org a year.",
    "Value depends on being a Salesforce customer."
   ],
   "caps": {
    "s12_location_market": {
     "v": "partly",
     "note": "Scope 1 and 2 analysis and Energy Attribute Credit / REC management listed."
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 3 analysis and Scope 3 Hub listed; category coverage not detailed."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Intelligent Document Reader (OCR) and simplified data collection listed."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Data Access and Audit Trail listed."
    },
    "factor_transparency": {
     "v": "partly",
     "note": "Advanced emission factors management and custom fuel types listed."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "Disclosure and Compliance Hub, report builder, Word plug-in; framework list not on page."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "Science-based targets and emission forecasting listed."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.salesforce.com/net-zero/pricing/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.salesforce.com/net-zero/pricing/add-ons/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sap-sustainability-footprint-management",
   "name": "SAP Sustainability Footprint Management",
   "vendor": "SAP",
   "site": "https://www.sap.com/products/scm/sustainability-footprint-management.html",
   "who": "SAP ERP customers, manufacturers needing corporate and product footprints at scale.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Manufacturers on SAP who need product carbon footprints from ERP data.",
   "strengths": [
    "Calculates from ERP data already in SAP, at product and corporate level.",
    "45,000+ pre-delivered factors."
   ],
   "limits": [
    "Only practical for SAP ERP users.",
    "Disclosure outputs and Scope 3 category coverage not stated on the product page."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "unknown"
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Reuses ERP material flows, production, energy and supplier data."
    },
    "audit_trail": {
     "v": "partly",
     "note": "Standardised audit-ready methods stated."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "45,000+ pre-delivered factors, including supplier-specific footprints, matched with AI."
    },
    "framework_outputs": {
     "v": "unknown"
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "partly",
     "note": "Hotspot analysis; decarbonisation planning not detailed."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sap.com/products/scm/sustainability-footprint-management.html",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sphera",
   "name": "Sphera",
   "vendor": "Sphera",
   "site": "https://sphera.com/",
   "who": "Large industrial companies; EHS, product stewardship and supply chain buyers.",
   "pricing": "On request.",
   "free": null,
   "status": "A Blackstone portfolio company, per Sphera.",
   "bestFor": "Industrial firms that want consultants and an EHS-grade system together.",
   "strengths": [
    "LCA-based factor library (Managed LCA Content).",
    "Software plus consultants for building the inventory."
   ],
   "limits": [
    "Much of the Scope 3 work is sold as consulting rather than self-serve software.",
    "No published pricing."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 3 relevance analysis and quantification offered as consulting."
    },
    "source_data_ingestion": {
     "v": "unknown"
    },
    "audit_trail": {
     "v": "partly",
     "note": "Management and reporting software described as audit-proof."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Factors from Defra, IEA, EPA, IPCC, GHG Protocol plus 1,500+ LCA-based factor sets; custom libraries."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "CCF services align with CSRD/ESRS, ISSB, CDP, TCFD, SBTi."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "partly",
     "note": "SBT and net-zero consulting."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://sphera.com/solutions/environment-health-safety-sustainability/corporate-sustainability-software/environmental-impact-calculation/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://sphera.com/solutions/sustainability-and-esg-consulting/sustainability-performance-improvement/corporate-carbon-footprint-ccf-services/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://sphera.com/company/who-we-are/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "greenly",
   "name": "Greenly",
   "vendor": "Greenly",
   "site": "https://greenly.earth/en-us",
   "who": "SMB to enterprise; states 4,000 clients in 30+ countries.",
   "pricing": "On request.",
   "free": null,
   "status": "Greenly and Normative announced a merger on 10 September 2026.",
   "bestFor": "Small and mid-size companies that want software plus a climate expert to get a first footprint.",
   "strengths": [
    "Serves small companies as well as enterprises, with expert support.",
    "States SOC 2 compliance."
   ],
   "limits": [
    "Prices not published.",
    "Spend-based start for Scope 3 (accounting export via ADEME factors) before physical data."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 1, 2 and 3 with activity- and spend-based methods; 15-category list not on its site."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "EcoPilot turns uploaded files and accounting exports into categorised data."
    },
    "audit_trail": {
     "v": "partly",
     "note": "Audit-ready quality checks stated."
    },
    "factor_transparency": {
     "v": "partly",
     "note": "Automated matching against 500k+ factors; combined set of 5 million+ factors after Normative deal."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "CSRD, CDP, TCFD; New York State GHG reporting."
    },
    "security_cert": {
     "v": "yes",
     "note": "States SOC 2 compliance (pricing FAQ)."
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "Scenario simulation and trajectory builder; SBTi guidance."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://greenly.earth/en-us",
     "seen": "2026-10-29"
    },
    {
     "url": "https://greenly.earth/en-us/info/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://greenly.earth/en-us/products/carbon-footprint",
     "seen": "2026-10-29"
    },
    {
     "url": "https://greenly.earth/en-gb/blog/ecology-news/greenly-and-normative-join-forces",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "plan-a",
   "name": "Plan A",
   "vendor": "PlanA.earth",
   "site": "https://plana.earth/",
   "who": "Companies setting science-based decarbonisation plans; founded 2017.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "European mid-size companies that want a science-led reduction plan with the footprint.",
   "strengths": [
    "States GHG Protocol and TÜV Rheinland certification of the software.",
    "Built around decarbonisation plans and target setting."
   ],
   "limits": [
    "Its site shows Diginex branding; confirm who owns it before signing.",
    "No published pricing."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "unknown"
    },
    "source_data_ingestion": {
     "v": "partly",
     "note": "Custom APIs for data integration mentioned in customer examples."
    },
    "audit_trail": {
     "v": "unknown"
    },
    "factor_transparency": {
     "v": "partly",
     "note": "Certified calculation methods maintained by in-house scientists."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "Stakeholder-ready footprint reports; framework list not on its site."
    },
    "security_cert": {
     "v": "partly",
     "note": "States certified data security standards; standard not named on homepage."
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "SBTi-aligned target setting and decarbonisation forecasts."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://plana.earth/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://plana.earth/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "osapiens-hub-for-corporate-carbon-footprint",
   "name": "osapiens HUB for Corporate Carbon Footprint",
   "vendor": "osapiens",
   "site": "https://www.osapiens.com/en/solutions/carbon-management",
   "who": "Mid-size and large companies with supply chain compliance needs; 2,500+ companies in 60+ countries.",
   "pricing": "On request.",
   "free": null,
   "status": "osapiens has completed its acquisition of the Nasdaq Metrio reporting and carbon accounting software.",
   "bestFor": "European companies that must handle carbon, CBAM and supply chain laws together.",
   "strengths": [
    "Carbon, CBAM, EUDR and supplier compliance on one supplier record.",
    "Shows a data-quality score per line so assurers see method mix."
   ],
   "limits": [
    "No published pricing.",
    "Carbon is one part of a broad compliance suite; depth of reduction planning unclear."
   ],
   "caps": {
    "s12_location_market": {
     "v": "yes",
     "note": "CCF method certified for GHG Protocol Corporate Suite; Scope 2 location- and market-based."
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 3 at line level with spend, average and supplier-specific methods; all 15 not listed."
    },
    "source_data_ingestion": {
     "v": "partly",
     "note": "Data from entities, sites and suppliers; ERP connection described in supplier suite."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Each factor carries source, versioning and audit-trail documentation; data-quality score per data point."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "EEA, EXIOBASE, ecoinvent (add-on), UBA; custom factors."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "Metrio adds California climate laws, CDP, GRI, IFRS and SASB coverage."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "partly",
     "note": "Decarbonisation steering mentioned; no detail."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.osapiens.com/en/solutions/carbon-management",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.osapiens.com/en/about-us",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.osapiens.com/en/resources/company-news/2026/osapiens-acquires-the-nasdaq-metrio-platform-and-customers-and-accelerates-its-u.s.-expansion",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sprih",
   "name": "Sprih",
   "vendor": "Sprih",
   "site": "https://sprih.com/",
   "who": "Large enterprises (stated); also supply chain programmes.",
   "pricing": "On request. Some reporting is offered at no cost; terms not detailed.",
   "free": null,
   "status": null,
   "bestFor": "Enterprises with document-heavy data that want AI extraction and drafted reports.",
   "strengths": [
    "Reads invoices and bills with OCR, for own and supplier data.",
    "Audit trail records extraction method and timestamp."
   ],
   "limits": [
    "No published pricing.",
    "Factor sources and Scope 2 method not stated on its site."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 1, 2 and 3 assessment; category list not stated."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Smart OCR reads PNG, JPEG, PDF invoices and bills; third-party integrations."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Source traceability with timestamps and extraction logs."
    },
    "factor_transparency": {
     "v": "unknown"
    },
    "framework_outputs": {
     "v": "partly",
     "note": "CSRD, SB 253, EUDR named; BRSR resources on site."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://sprih.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/corporate-sustainability/carbon-accounting-assessment/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/supply-chain-sustainability/supplier-data-exchange/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "climes-carbon-os",
   "name": "Climes Carbon-OS",
   "vendor": "Climes",
   "site": "https://climes.io/",
   "who": "Listed companies (BRSR Core), exporters with EU buyers (CBAM), lenders (PCAF), suppliers to multinationals.",
   "pricing": "On request.",
   "free": "Free Carbon X-Ray for listed companies (a check, not a plan).",
   "status": null,
   "bestFor": "Indian listed companies preparing BRSR Core assurance.",
   "strengths": [
    "Built for BRSR Core assurance with a document-level evidence ledger.",
    "Covers CBAM, PCAF and product footprints on one ledger."
   ],
   "limits": [
    "No published pricing.",
    "Little public detail on data intake and security."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Scope 1, 2 and 3 across operations and value chain; financed emissions."
    },
    "source_data_ingestion": {
     "v": "partly",
     "note": "Shared ingestion layer named; details not stated."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Evidence ledger tracing each tonne to its document."
    },
    "factor_transparency": {
     "v": "partly",
     "note": "Shared factor library stated."
    },
    "framework_outputs": {
     "v": "yes",
     "note": "BRSR Core, CBAM, PCAF, SBTi, CCTS, ISO 14067."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://climes.io/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://climes.io/carbon-accounting-software-india",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "the-sustainability-cloud",
   "name": "The Sustainability Cloud (TSC NetZero)",
   "vendor": "The Sustainability Cloud",
   "site": "https://www.thesustainabilitycloud.com/",
   "who": "SMEs to enterprises; plans by facilities and users; country selector includes India, US, UK, Germany, Canada, Australia, South Africa, UAE, Mexico.",
   "pricing": "India prices: Free ₹0 (1 facility, 1 user); Business Basic ₹3,599 a month (1 facility, 5 users); Business Standard ₹7,199 a month (5 facilities, 10 users); Business Premium ₹11,999 a month (5 facilities, 25 users); Enterprise custom. Monthly or annual billing (annual saves 16%). Free and paid SME plans cover Scope 1 and 2.",
   "free": "Free plan (Scope 1 and 2, 1 facility, 1 user); free trial offered on paid SME plans.",
   "status": null,
   "bestFor": "Indian companies that want low-cost Scope 1 and 2 now and BRSR/CBAM modules later.",
   "strengths": [
    "Published rupee prices with a free Scope 1 and 2 plan.",
    "Wide framework list including BRSR, CBAM and PACT exchange."
   ],
   "limits": [
    "SME plans are manual entry and Scope 1 and 2 only; Scope 3 needs higher tiers.",
    "Security certification not stated on its site."
   ],
   "caps": {
    "s12_location_market": {
     "v": "unknown"
    },
    "s3_all_15": {
     "v": "yes",
     "note": "All 15 activities using all calculation methods (Scope 3 module)."
    },
    "source_data_ingestion": {
     "v": "partly",
     "note": "Data from SAP, Oracle, SCADA and IIoT; web forms with approval workflows. Free and SME plans are manual data entry."
    },
    "audit_trail": {
     "v": "yes",
     "note": "Carbon ledger with audit trail per record; base-year recalculation policy."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "45,000+ factors (IPCC, US EPA, DEFRA, IEA, ecoinvent); custom factors; choice of IPCC AR4/5/6 GWPs."
    },
    "framework_outputs": {
     "v": "yes",
     "note": "CBAM, CSRD, BRSR, GRI, CDP, SASB, IFRS S1/S2."
    },
    "security_cert": {
     "v": "unknown"
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "SBTi targeting and decarbonisation module."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/carbon-accounting-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/pricing/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/corporate-value-chain-scope3-emission-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/about/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible",
   "vendor": "Senseible",
   "site": "https://senseible.earth/",
   "who": "MSMEs and exporters (self-serve); enterprises collecting supplier data; lenders.",
   "pricing": SENSEIBLE_PRICE,
   "free": "Free Snapshot plan.",
   "status": null,
   "bestFor": "Indian MSMEs and exporters who need a defensible footprint from invoices and bills at low cost.",
   "strengths": [
    "Builds the footprint from bills already kept, with factor and source on every line.",
    "Low published rupee price for MSMEs."
   ],
   "limits": [
    "No SOC 2 or ISO 27001 certification. Verification is Senseible's own expert-supervised check, not third-party assurance.",
    "Reports are self-declared drafts; large-enterprise connectors are built per customer."
   ],
   "caps": {
    "s12_location_market": {
     "v": "yes",
     "note": "Location-based and market-based Scope 2; market-based needs certificate or contract data. India grid factor from CEA by financial year."
    },
    "s3_all_15": {
     "v": "partly",
     "note": "Uses the GHG Protocol 15 categories; Scope 3 lines go to a supplier evidence trail; spend-based estimates labelled with wider uncertainty."
    },
    "source_data_ingestion": {
     "v": "yes",
     "note": "Reads invoices, electricity bills, fuel slips and freight records (photo or PDF). ERP, Tally, SFTP and API feeds are built per enterprise."
    },
    "audit_trail": {
     "v": "yes",
     "note": "SHA-256 fingerprint per file, factor and source per line, audit-trail spreadsheet export."
    },
    "factor_transparency": {
     "v": "yes",
     "note": "Published factors (IPCC 2006, CEA, India BUR-2 for coal) shown per line; no factor, no figure."
    },
    "framework_outputs": {
     "v": "partly",
     "note": "BRSR, GRI, GHG Protocol, CBAM data and others as self-declared drafts; filing and assurance stay with you."
    },
    "security_cert": {
     "v": "no",
     "note": "No SOC 2 or ISO 27001 certification."
    },
    "targets_scenarios": {
     "v": "yes",
     "note": "Self-serve net zero planner; science-based target setting with analysts is set up on request."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://senseible.earth/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/carbon-accounting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/trust",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/enterprise",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/pricing",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "dmrv": [
  {
   "id": "hedera-guardian",
   "name": "Hedera Guardian",
   "vendor": "Hedera / Hashgraph (open source, Apache 2.0)",
   "site": "https://guardian.hedera.com/",
   "who": "Registries, project developers and builders who want to digitise a methodology into a dMRV workflow.",
   "pricing": "Free open-source software (Apache 2.0); hosting and Hedera network fees are the user's.",
   "free": "Open source.",
   "status": null,
   "bestFor": "Registries and developers building their own digitised methodology workflows.",
   "strengths": [
    "Open source with methodology templates for many registries.",
    "Public-ledger record of each workflow step."
   ],
   "limits": [
    "A toolkit you deploy and configure, not a managed measurement service.",
    "No remote sensing of its own."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "unknown"
    },
    "field_sensor_data": {
     "v": "yes",
     "note": "Includes an MRV sender service for device data."
    },
    "registry_alignment": {
     "v": "yes",
     "note": "Methodology Library folders for Verra, Gold Standard, CDM, Climate Action Reserve, Global Carbon Council, iREC and others."
    },
    "credit_quality_rating": {
     "v": "no"
    },
    "tamper_evident_record": {
     "v": "yes",
     "note": "Uses the Hedera public network as the trust layer; IPFS storage."
    },
    "verifier_workflow": {
     "v": "yes",
     "note": "Policy Workflow Engine turns methodology requirements into MRV workflows with roles."
    },
    "developer_tooling": {
     "v": "yes",
     "note": "Self-hostable with Docker; issues digital environmental assets."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://github.com/hashgraph/guardian (README and Methodology Library folder, last commit 6 Oct 2026)",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "verra-digital-mrv",
   "name": "Verra digital MRV (Project Hub DMRV pilots)",
   "vendor": "Verra (non-profit standard)",
   "site": "https://verra.org/",
   "who": "VCS project proponents and VVBs.",
   "pricing": "Registry fees apply.",
   "free": null,
   "status": "A programme of the Verra registry, not a vendor product.",
   "bestFor": "VCS developers who want faster, more frequent issuance on supported methodologies.",
   "strengths": [
    "The registry itself is running DMRV pilots, so outputs land where credits are issued.",
    "Vets third-party data providers for ARR."
   ],
   "limits": [
    "Pilot stage; limited methodologies.",
    "Not a measurement tool; developers still need a data provider."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "partly",
     "note": "Vetted data service providers supply remote-sensing stocking index data for VM0047 ARR."
    },
    "field_sensor_data": {
     "v": "partly",
     "note": "Connected monitoring in DMRV pilots."
    },
    "registry_alignment": {
     "v": "yes",
     "note": "Active pilots across five methodologies; 24 digital methodologies supporting DMRV verification (July 2026 slides)."
    },
    "credit_quality_rating": {
     "v": "no"
    },
    "tamper_evident_record": {
     "v": "unknown"
    },
    "verifier_workflow": {
     "v": "yes",
     "note": "Digital review cycle and more frequent issuance; API documentation."
    },
    "developer_tooling": {
     "v": "partly",
     "note": "Data uploaded directly to Project Hub."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://verra.org/documents/july-2026-stakeholder-update-webinar-presentation-slides/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://verra.org/verra-announces-five-new-data-service-providers-for-arr-methodology/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://verra.org/eoi-request-digital-measurement-reporting-and-verification-pilot-program/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://verra.org/tag/digital",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "gold-standard-dmrv-pilot-programme",
   "name": "Gold Standard dMRV pilot programme",
   "vendor": "Gold Standard (non-profit standard)",
   "site": "https://www.goldstandard.org/",
   "who": "GS4GG project developers and verifiers.",
   "pricing": null,
   "free": null,
   "status": "Pilot running until October 2026, per Gold Standard. Check for successor rules.",
   "bestFor": "Gold Standard developers testing digital monitoring with the registry.",
   "strengths": [
    "Registry-backed route to digital verification.",
    "Open to developer-proposed tools."
   ],
   "limits": [
    "Pilot with an October 2026 end date.",
    "Not software; the developer supplies the tool."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "partly",
     "note": "One approved rice-methane PoA uses satellite (SAR) tracking."
    },
    "field_sensor_data": {
     "v": "partly",
     "note": "Automated data collection is the pilot aim."
    },
    "registry_alignment": {
     "v": "yes",
     "note": "Within Gold Standard for the Global Goals."
    },
    "credit_quality_rating": {
     "v": "no"
    },
    "tamper_evident_record": {
     "v": "unknown"
    },
    "verifier_workflow": {
     "v": "yes",
     "note": "Tests tools that help verifiers check reported data."
    },
    "developer_tooling": {
     "v": "partly",
     "note": "Projects propose their own dMRV solution."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.goldstandard.org/news/new-pilot-programme-for-digital-measurement-reporting-verification",
     "seen": "2026-10-29"
    },
    {
     "url": "https://globalgoals.goldstandard.org/standards/Pilot-decisions-Q1-2025.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "boomitra",
   "name": "Boomitra",
   "vendor": "Boomitra",
   "site": "https://boomitra.com/",
   "who": "Credit buyers and governments; farmers and ranchers across the Global South.",
   "pricing": "Not applicable (sells credits).",
   "free": null,
   "status": "A soil-carbon project developer that uses its own dMRV, not a software vendor.",
   "bestFor": "Buyers seeking soil-carbon removal credits measured by satellite.",
   "strengths": [
    "Remote sensing calibrated on a very large soil-sample archive.",
    "VM0042 alignment stated."
   ],
   "limits": [
    "Not software other developers can license.",
    "Soil carbon only."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "yes",
     "note": "Sentinel-1/2, ALOS-2, Landsat, SMAP, SMOS at 10 m."
    },
    "field_sensor_data": {
     "v": "yes",
     "note": "1 million+ georeferenced soil samples, including India Soil Health Card data."
    },
    "registry_alignment": {
     "v": "yes",
     "note": "States it is the first Verra-approved remote-sensing solution for VM0042 soil carbon."
    },
    "credit_quality_rating": {
     "v": "no"
    },
    "tamper_evident_record": {
     "v": "unknown"
    },
    "verifier_workflow": {
     "v": "yes",
     "note": "Per-project uncertainty metrics given to buyers and verifiers."
    },
    "developer_tooling": {
     "v": "no",
     "note": "Develops its own projects; no software sold to other developers found."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://boomitra.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://boomitra.com/inside-boomitras-proven-technology/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://boomitra.com/faq/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sylithe",
   "name": "Sylithe",
   "vendor": "Sylithe Technologies Private Limited",
   "site": "https://sylithe.com/",
   "who": "Project developers and credit buyers; nature-based projects (ARR, REDD+, agroforestry) and biochar.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Indian ARR, REDD+ and agroforestry developers preparing for the Indian Carbon Market.",
   "strengths": [
    "India-specific forest models and Indian Carbon Market alignment.",
    "Dynamic baselines with matched control areas."
   ],
   "limits": [
    "No independent validation found.",
    "Nature-based and biochar only."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "yes",
     "note": "Sentinel-2, SAR and GEDI LiDAR; LULC, canopy height, above-ground biomass at 10 m."
    },
    "field_sensor_data": {
     "v": "partly",
     "note": "Drone and field sample plots mentioned for greenbelt projects."
    },
    "registry_alignment": {
     "v": "yes",
     "note": "States alignment with Indian Carbon Market/CCTS, Verra VM0047 and VM0006, Gold Standard."
    },
    "credit_quality_rating": {
     "v": "partly",
     "note": "Pre-issuance risk detection for reversal and leakage for buyers."
    },
    "tamper_evident_record": {
     "v": "unknown"
    },
    "verifier_workflow": {
     "v": "partly",
     "note": "Audit-ready issuance reports."
    },
    "developer_tooling": {
     "v": "yes",
     "note": "Continuous monitoring for developers before issuance."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://sylithe.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://sylithe.com/llms.txt",
     "seen": "2026-10-29"
    },
    {
     "url": "https://sylithe.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "pramaanone",
   "name": "PramaanOne",
   "vendor": "PramaanOne",
   "site": "https://www.pramaanone.com/",
   "who": "Enterprises needing emissions evidence; also project originators and registries (site text).",
   "pricing": "Not published.",
   "free": null,
   "status": null,
   "bestFor": "Indian enterprises exploring meter- and satellite-backed emissions evidence.",
   "strengths": [
    "Covers enterprise emissions evidence and project credits in one product.",
    "Meter, IoT and satellite inputs."
   ],
   "limits": [
    "Little public detail on how it works.",
    "No pricing, customers or independent approvals found."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "yes",
     "note": "Satellite evidence and forestry monitoring."
    },
    "field_sensor_data": {
     "v": "yes",
     "note": "Meter data and IoT telemetry."
    },
    "registry_alignment": {
     "v": "partly",
     "note": "Registry intelligence pages for Verra, Gold Standard, India CCTS, GCC, Article 6."
    },
    "credit_quality_rating": {
     "v": "partly",
     "note": "ICVCM CCP eligibility and credit integrity screening."
    },
    "tamper_evident_record": {
     "v": "partly",
     "note": "Audit trails and QR certificates."
    },
    "verifier_workflow": {
     "v": "partly",
     "note": "Audit packs."
    },
    "developer_tooling": {
     "v": "partly",
     "note": "Environmental asset monetisation and registry APIs."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://pramaanone.com/ (content read from the site's JavaScript bundle /static/js/main.c2a05ebb.js)",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible",
   "vendor": "Senseible",
   "site": "https://senseible.earth/",
   "who": "MSMEs, exporters and enterprises proving their own Scope 1, 2 and 3 figures to lenders, buyers and auditors.",
   "pricing": SENSEIBLE_PRICE,
   "free": "Free Snapshot plan.",
   "status": null,
   "bestFor": "Companies that need verifiable emissions evidence for lenders or buyers, not carbon project developers.",
   "strengths": [
    "Document-level fingerprints and factor sources for company emissions evidence.",
    "Low entry price for small firms."
   ],
   "limits": [
    "Not a crediting dMRV: no registry methodology, issuance or project monitoring.",
    "Verification is Senseible's own expert-supervised check, not independent assurance."
   ],
   "caps": {
    "satellite_remote_sensing": {
     "v": "partly",
     "note": "Satellite mapping of supplier sites and plots is a service set up on request, not carbon-stock measurement."
    },
    "field_sensor_data": {
     "v": "partly",
     "note": "Meter and hardware feeds are set up with the team for each customer."
    },
    "registry_alignment": {
     "v": "no",
     "note": "No credit issuance or registry; eligibility signals only."
    },
    "credit_quality_rating": {
     "v": "no"
    },
    "tamper_evident_record": {
     "v": "yes",
     "note": "Fingerprint (SHA-256) per file; the same document is never counted twice."
    },
    "verifier_workflow": {
     "v": "partly",
     "note": "Audit-trail export for auditors; not a VVB and gives no third-party assurance."
    },
    "developer_tooling": {
     "v": "no",
     "note": "Not built for carbon project developers."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://senseible.earth/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/trust",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/enterprise",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "supplier-emissions": [
  {
   "id": "ecovadis-carbon-action-manager",
   "name": "EcoVadis Carbon Action Manager",
   "vendor": "EcoVadis",
   "site": "https://ecovadis.com/solutions/carbon/",
   "who": "Procurement and sustainability teams at large buyers with big supplier bases.",
   "pricing": "Buyer side: on request. Supplier rating subscriptions are paid; prices not published.",
   "free": null,
   "status": null,
   "bestFor": "Large buyers whose suppliers are already in the EcoVadis network.",
   "strengths": [
    "Large existing network of suppliers already rated and reporting.",
    "Scorecards and corrective action plans for supplier improvement."
   ],
   "limits": [
    "Suppliers generally pay for EcoVadis subscriptions.",
    "Carbon scorecard only for companies sized S, M and L, per its pricing page."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Collection across Scope 1, 2, 3 and PCFs through the EcoVadis network."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "48,000+ GHG reporters already sharing data; PCF calculator described as upcoming."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "Hotspots estimated by industry and country without contacting each supplier."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Identifies suppliers driving the largest emissions."
    },
    "supplier_data_quality": {
     "v": "yes",
     "note": "Assesses data reliability; evidence-backed carbon scorecards."
    },
    "supplier_reduction_engagement": {
     "v": "yes",
     "note": "Improvement plans, Corrective Action Plans, 17 Academy courses, 35+ tracked metrics."
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Integrates supplier data into carbon accounting tools such as Sweep and Normative."
    },
    "free_for_suppliers": {
     "v": "partly"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://ecovadis.com/solutions/carbon/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://ecovadis.com/pricing/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "cdp-supply-chain-membership",
   "name": "CDP Supply Chain Membership",
   "vendor": "CDP (non-profit)",
   "site": "https://www.cdp.net/en/supply-chain",
   "who": "Large buyers requesting environmental disclosure from suppliers.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Large buyers that want standardised, comparable supplier disclosure.",
   "strengths": [
    "Standardised, widely recognised disclosure format.",
    "Supplier answers can include emissions allocated to the requesting customer."
   ],
   "limits": [
    "An annual questionnaire cycle, not continuous data.",
    "Not a calculation tool; buyers still need carbon accounting software."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Members request chosen suppliers to disclose through CDP."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Emissions allocations to the customer, targets, transition plans, water, forests."
    },
    "spend_fallback_labelled": {
     "v": "unknown"
    },
    "hotspot_prioritisation": {
     "v": "partly",
     "note": "Risk and opportunity insights."
    },
    "supplier_data_quality": {
     "v": "partly",
     "note": "Standardised disclosure; CDP scores."
    },
    "supplier_reduction_engagement": {
     "v": "partly",
     "note": "Expert support and tools for supplier engagement."
    },
    "procurement_erp_integration": {
     "v": "unknown"
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.cdp.net/en/supply-chain",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "makersite",
   "name": "Makersite (with SiGREEN, now Mattermaps)",
   "vendor": "Makersite GmbH",
   "site": "https://makersite.io/",
   "who": "Manufacturers: product engineering, sustainability and procurement teams.",
   "pricing": "On request ('custom price' on Pro, Teams and Enterprise). Annual licences paid upfront; Pro 1 user and 2,000 material components; Teams up to 10 users and 4,000; Enterprise 50,000.",
   "free": null,
   "status": "Makersite took over Siemens’ SiGREEN PCF exchange in June 2026 and renamed it Mattermaps. It runs the Together for Sustainability (TfS) PCF Exchange.",
   "bestFor": "Manufacturers in chemicals, automotive and industrials that need supplier product footprints.",
   "strengths": [
    "Product-level supplier data with TfS, Catena-X and PACT exchange.",
    "Combines BoM, ERP and supplier data."
   ],
   "limits": [
    "Built around product footprints rather than a single corporate Scope 3 figure.",
    "No published price."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "SiGREEN collects and exchanges PCF data between companies and suppliers."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Product-level supplier footprints; connects TfS, Catena-X and PACT."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "AI fills gaps from 150+ data sources; positions itself against spend-based."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Hotspots by material, process, supplier and logistics beyond Tier 1."
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "partly",
     "note": "Simulates supplier and material changes."
    },
    "procurement_erp_integration": {
     "v": "yes",
     "note": "PLM and ERP data; Windchill and Teamcenter pages."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://makersite.io/press/makersite-acquires-sigreen/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://makersite.io/get-to-net-zero/scope-3-supply-chain-emissions-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://makersite.io/pricing/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbmee-eis",
   "name": "carbmee EIS",
   "vendor": "carbmee",
   "site": "https://www.carbmee.com/",
   "who": "Enterprise manufacturers with complex supply chains.",
   "pricing": "On request (Small, Medium, Large and Enterprise tiers, all quoted).",
   "free": null,
   "status": null,
   "bestFor": "Large manufacturers that want ERP-driven Scope 3 with supplier engagement.",
   "strengths": [
    "Transaction-level Scope 3 from ERP data.",
    "CBAM, PCF and corporate footprint modules alongside supplier engagement."
   ],
   "limits": [
    "No published prices.",
    "Enterprise focus; dedicated expert onboarding over about three months."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Supplier engagement module for onboarding and collaboration."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Moves from spend-based to supplier-specific data."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "Spend-based starting point; labelling not detailed."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Surfaces carbon hotspots and highest-emitting suppliers."
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "yes",
     "note": "Reduction roadmaps with suppliers."
    },
    "procurement_erp_integration": {
     "v": "yes",
     "note": "API or CSV; works with ERP, PLM and procurement systems."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.carbmee.com/solution/the-only-supplier-engagement-model",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbmee.com/solution/the-only-carbon-management-and-accounting-platform",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbmee.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbmee.com/about-us",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sweep",
   "name": "Sweep (supply chain emissions)",
   "vendor": "Sweep",
   "site": "https://www.sweep.net/supply-chain-emissions",
   "who": "Enterprises with large supplier bases.",
   "pricing": "On request.",
   "free": "Free supplier accounts.",
   "status": null,
   "bestFor": "Enterprises running a large, multi-country supplier programme.",
   "strengths": [
    "Free supplier accounts with their own footprint dashboard.",
    "Imports existing CDP and EcoVadis data."
   ],
   "limits": [
    "No published pricing.",
    "Built for large programmes; no small-buyer plan found."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Supplier portals, campaigns, automated reminders."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Verified declared data; imports from CDP Supply Chain, EcoVadis, S&P, SBTi."
    },
    "spend_fallback_labelled": {
     "v": "yes",
     "note": "Sectoral estimates for 100% coverage from day one, replaced by primary data."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Ranks suppliers driving most emissions; benchmarks 200+ sectors."
    },
    "supplier_data_quality": {
     "v": "yes",
     "note": "Scorecards compare emissions, data quality and commitments."
    },
    "supplier_reduction_engagement": {
     "v": "yes",
     "note": "Joint reduction targets tracked supplier by supplier."
    },
    "procurement_erp_integration": {
     "v": "yes",
     "note": "Connectors to procurement and ERP systems, API, invoice imports."
    },
    "free_for_suppliers": {
     "v": "yes",
     "note": "Free Sweep accounts for every surveyed supplier."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sweep.net/supply-chain-emissions",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "watershed-supply-chain",
   "name": "Watershed Supply Chain",
   "vendor": "Watershed",
   "site": "https://watershed.com/solutions/supply-chain",
   "who": "Large companies.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Watershed customers extending into supplier engagement.",
   "strengths": [
    "Supplier data flows directly into the corporate footprint.",
    "Tens of thousands of supplier disclosures already matched."
   ],
   "limits": [
    "No published pricing.",
    "Whether suppliers pay is not stated."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Guided supplier portal for data requests, targets and reduction plans."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Responses replace industry averages in the footprint."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "CEDA/FLAG data and supplier disclosures used until primary data arrives."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Ranks suppliers by emissions impact and climate maturity."
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "yes",
     "note": "Target commitments and reduction plans; scorecards."
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Works with existing teams and tools; specifics not listed."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://watershed.com/solutions/supply-chain",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "persefoni-scope-3-data-exchange",
   "name": "Persefoni Scope 3 Data Exchange",
   "vendor": "Persefoni",
   "site": "https://www.persefoni.com/business/scope-3-supplier-engagement",
   "who": "Buyers asking suppliers for footprints; suppliers with no prior experience.",
   "pricing": "Free for suppliers (Pro). Buyers sending requests need Advanced: on request.",
   "free": "Free for suppliers.",
   "status": null,
   "bestFor": "Buyers whose suppliers have never measured and need a free tool to start.",
   "strengths": [
    "Suppliers get a full free carbon accounting tool, not a survey.",
    "Copilot and Academy help first-time suppliers."
   ],
   "limits": [
    "Supplier figures are self-calculated; quality scoring not found.",
    "Reduction tracking with suppliers not found."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Send and respond to data requests (sending in Advanced)."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Suppliers calculate their own footprint in free Persefoni Pro."
    },
    "spend_fallback_labelled": {
     "v": "unknown"
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Value chain analytics by supplier (Advanced)."
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "unknown"
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "APIs and integration hub in Advanced."
    },
    "free_for_suppliers": {
     "v": "yes",
     "note": "Suppliers use Persefoni Pro at zero cost."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.persefoni.com/business/scope-3-supplier-engagement",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.persefoni.com/pricing",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "osapiens-hub",
   "name": "osapiens HUB (Supplier Intelligence and CCF)",
   "vendor": "osapiens",
   "site": "https://www.osapiens.com/en/solutions/supplier-intelligence",
   "who": "Companies managing supplier compliance (LkSG, CSDDD, EUDR) alongside carbon.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "European buyers combining Scope 3 with supply chain due diligence laws.",
   "strengths": [
    "One supplier record shared across carbon, CBAM and due diligence.",
    "Method and quality labelled per line for auditors."
   ],
   "limits": [
    "Supplier decarbonisation programme features not found.",
    "No published pricing."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Structured questionnaires in 29 languages with approval workflows."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Primary supplier data used per line where available."
    },
    "spend_fallback_labelled": {
     "v": "yes",
     "note": "Spend, average and supplier-specific in one inventory, each point carrying a quality score."
    },
    "hotspot_prioritisation": {
     "v": "partly",
     "note": "Not described as a separate feature."
    },
    "supplier_data_quality": {
     "v": "yes",
     "note": "Data-quality score per data point."
    },
    "supplier_reduction_engagement": {
     "v": "unknown"
    },
    "procurement_erp_integration": {
     "v": "yes",
     "note": "Connects each supplier record to ERP."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.osapiens.com/en/solutions/supplier-intelligence",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.osapiens.com/en/solutions/carbon-management",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sphera-supplier-engagement-and-supplier-pcf-calculator",
   "name": "Sphera Supplier Engagement and Supplier PCF Calculator",
   "vendor": "Sphera",
   "site": "https://sphera.com/solutions/supply-chain-risk-management/supplier-engagement-solution/",
   "who": "Procurement teams at industrial companies.",
   "pricing": "On request.",
   "free": "Free PCF calculator for suppliers.",
   "status": null,
   "bestFor": "Industrial buyers that want product-level Category 1 data from suppliers.",
   "strengths": [
    "Free supplier PCF calculator backed by LCA data.",
    "Feeds supplier responses into risk and compliance views."
   ],
   "limits": [
    "Corporate Scope 3 spend fallback not described.",
    "No published pricing."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Automated outreach, catalog assessments and custom workflows."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Suppliers enter BoMs to calculate cradle-to-gate PCFs."
    },
    "spend_fallback_labelled": {
     "v": "unknown"
    },
    "hotspot_prioritisation": {
     "v": "partly",
     "note": "AI assessment insights flag suppliers needing attention."
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "partly",
     "note": "Supports supplier-led reduction communication."
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Aligned with Catena-X and PACT."
    },
    "free_for_suppliers": {
     "v": "yes",
     "note": "The PCF calculator is complimentary for suppliers."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://sphera.com/solutions/supply-chain-risk-management/supplier-engagement-solution/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://sphera.com/solutions/supply-chain-risk-management/supplier-engagement-solution/supplier-pcf-calculator/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "the-sustainability-cloud",
   "name": "The Sustainability Cloud (Scope 3 hub)",
   "vendor": "The Sustainability Cloud",
   "site": "https://www.thesustainabilitycloud.com/products/net-zero/corporate-value-chain-scope3-emission-software/",
   "who": "Enterprises; India and other markets.",
   "pricing": "Scope 3 is on higher plans; enterprise pricing is custom. Published SME plans cover Scope 1 and 2 only.",
   "free": "Free plan covers Scope 1 and 2 only.",
   "status": null,
   "bestFor": "Indian enterprises that want PACT-based supplier exchange with BRSR and CBAM in one suite.",
   "strengths": [
    "PACT-conformant exchange and data quality ratings.",
    "Rupee-priced entry plans."
   ],
   "limits": [
    "Scope 3 not in published SME plans.",
    "Supplier reduction programmes not found."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Supplier, employee and customer portals with automated reminders."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Primary data; PACT PCF exchange."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "Spend-based and average factors available; per-line labelling not stated."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Hotspots by product, supplier, employee and customer."
    },
    "supplier_data_quality": {
     "v": "yes",
     "note": "Data quality ratings aligned with PACT Pathfinder."
    },
    "supplier_reduction_engagement": {
     "v": "unknown"
    },
    "procurement_erp_integration": {
     "v": "yes",
     "note": "SAP, Oracle; PACT data exchange API."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/corporate-value-chain-scope3-emission-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/carbon-accounting-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/products/net-zero/pricing/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sprih-supplier-data-exchange",
   "name": "Sprih Supplier Data Exchange",
   "vendor": "Sprih",
   "site": "https://www.sprih.com/supply-chain-sustainability/supplier-data-exchange/",
   "who": "Enterprises with suppliers of mixed digital maturity.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Buyers whose suppliers send documents rather than filled questionnaires.",
   "strengths": [
    "Accepts supplier documents in any format, including utility bills.",
    "Audit trail of extraction per data point."
   ],
   "limits": [
    "Prioritisation and spend fallback not described.",
    "No published pricing."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "partly",
     "note": "Supplier engagement listed; suppliers submit any format."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Reads supplier PDFs, Excel, scans and utility bills."
    },
    "spend_fallback_labelled": {
     "v": "unknown"
    },
    "hotspot_prioritisation": {
     "v": "unknown"
    },
    "supplier_data_quality": {
     "v": "yes",
     "note": "Dashboards of supplier data quality; automated validation."
    },
    "supplier_reduction_engagement": {
     "v": "partly",
     "note": "Supplier education and empowerment programme."
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Third-party integrations."
    },
    "free_for_suppliers": {
     "v": "partly",
     "note": "No tech upgrades needed by suppliers; cost to suppliers not stated."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sprih.com/supply-chain-sustainability/supplier-data-exchange/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "salesforce-net-zero-cloud",
   "name": "Salesforce Net Zero Cloud (External Engagement Management)",
   "vendor": "Salesforce",
   "site": "https://www.salesforce.com/net-zero/pricing/add-ons/",
   "who": "Salesforce customers.",
   "pricing": "External Engagement Management add-on: US$60K per org a year, billed annually, on top of Net Zero Cloud (on request).",
   "free": null,
   "status": null,
   "bestFor": "Salesforce shops that want supplier ESG data in their CRM.",
   "strengths": [
    "Published add-on price.",
    "Supplier data in the same system as CRM accounts."
   ],
   "limits": [
    "The supplier add-on is US$60K per org a year; base edition price not published.",
    "Few supplier features described on the pricing page."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "yes",
     "note": "Supplier data model and 50 external engagement ledgers."
    },
    "supplier_primary_data": {
     "v": "partly",
     "note": "Supplier Sustainability Data feature listed."
    },
    "spend_fallback_labelled": {
     "v": "partly",
     "note": "Data gap filling listed."
    },
    "hotspot_prioritisation": {
     "v": "unknown"
    },
    "supplier_data_quality": {
     "v": "unknown"
    },
    "supplier_reduction_engagement": {
     "v": "unknown"
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Runs on Salesforce."
    },
    "free_for_suppliers": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.salesforce.com/net-zero/pricing/add-ons/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.salesforce.com/net-zero/pricing/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible (enterprise supplier emissions)",
   "vendor": "Senseible",
   "site": "https://senseible.earth/enterprise",
   "who": "Enterprises sourcing from MSMEs, especially in India; exporters needing supplier data for CBAM and BRSR Core.",
   "pricing": "On request: priced by suppliers added, team seats and integrations. Pilots start with 10 to 15 suppliers.",
   "free": "Free Scope 3 supplier evidence check; free Snapshot plan.",
   "status": null,
   "bestFor": "Buyers whose Scope 3 sits with Indian MSME suppliers who keep bills but cannot fill questionnaires.",
   "strengths": [
    "Small suppliers send bills, not questionnaires; buyers get figures and proof hashes, not invoices.",
    "Labels every supplier line by method, from document-backed to spend-only."
   ],
   "limits": [
    "Supplier portal, ERP feeds and roll-up are built per enterprise, not self-serve today.",
    "No SOC 2 or ISO 27001; not an assurance provider."
   ],
   "caps": {
    "supplier_request_portal": {
     "v": "partly",
     "note": "Requests by email or GSTIN with reminders; a branded supplier portal and roll-up are built per enterprise."
    },
    "supplier_primary_data": {
     "v": "yes",
     "note": "Suppliers share electricity bills and fuel invoices they already keep; read automatically into activity data (hybrid method)."
    },
    "spend_fallback_labelled": {
     "v": "yes",
     "note": "Suppliers without bills stay on average-data or spend-based estimates, labelled, so method share is visible."
    },
    "hotspot_prioritisation": {
     "v": "yes",
     "note": "Supplier tiering from invoices (primary, factor-derived, spend-only) and coverage by share of purchases."
    },
    "supplier_data_quality": {
     "v": "partly",
     "note": "A quality score per document; a per-supplier quality view is still being rolled out."
    },
    "supplier_reduction_engagement": {
     "v": "unknown",
     "note": "Supplier reminders exist; joint supplier targets not described."
    },
    "procurement_erp_integration": {
     "v": "partly",
     "note": "Tally, SAP, Oracle, Zoho, SFTP and API are built per enterprise."
    },
    "free_for_suppliers": {
     "v": "yes",
     "note": "Suppliers do not pay to share; supplier owns its record and consents per buyer."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://senseible.earth/enterprise",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/enterprise/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/scope-3-supplier-evidence",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "carbon-compliance": [
  {
   "id": "tsc-netzero",
   "name": "TSC NetZero",
   "vendor": "The Sustainability Cloud",
   "site": "https://www.thesustainabilitycloud.com/",
   "who": "Indian listed enterprises and exporters; also banks (PCAF) and EU importers (CBAM).",
   "pricing": "On request for reporting modules (CBAM importer prices are published separately).",
   "free": null,
   "status": null,
   "bestFor": "Indian listed groups that report to BRSR Core and also face CSRD or ISSB requests.",
   "strengths": [
    "Covers Indian (BRSR, CCTS) and global (CSRD, ISSB) frameworks with question mapping across them.",
    "XBRL output for BRSR Core and plant-system integrations (SCADA, DCS, BMS, IoT)."
   ],
   "limits": [
    "No SB 253 coverage found.",
    "Some CBAM pages still describe transitional quarterly reports."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "CSRD software page with double materiality."
    },
    "issb": {
     "v": "yes",
     "note": "Lists IFRS S1 and S2 among frameworks."
    },
    "brsr": {
     "v": "yes"
    },
    "ccts": {
     "v": "yes",
     "note": "GHG intensity tracking and CCC position."
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2 and 3 accounting modules."
    },
    "audit": {
     "v": "yes",
     "note": "Audit trail per question; invite an auditor; maker-checker."
    },
    "tagging": {
     "v": "yes",
     "note": "BRSR Core output in PDF, Excel and XBRL."
    }
   },
   "rating": null,
   "researchRank": 1,
   "sources": [
    {
     "url": "https://www.thesustainabilitycloud.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/brsr-reporting/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/brsr-core/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/csrd-reporting-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/ccts-india-compliance-software/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbon-os",
   "name": "Carbon-OS",
   "vendor": "Climes",
   "site": "https://www.climes.io/",
   "who": "Listed companies, lenders, CBAM exporters and OEM supply chains; enterprise.",
   "pricing": "On request.",
   "free": "Free Carbon X-Ray for listed companies.",
   "status": null,
   "bestFor": "Indian enterprises with several regimes at once that need figures an assurer can trace.",
   "strengths": [
    "Rule statements on its pages are current (CSRD Omnibus, BRSR assessment-or-assurance, CBAM definitive period).",
    "One evidence ledger feeds BRSR Core, CCTS, CBAM, CSRD and ISSB."
   ],
   "limits": [
    "No SB 253 coverage found.",
    "No published prices."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "Double materiality workflow; reflects Directive (EU) 2026/470."
    },
    "issb": {
     "v": "yes",
     "note": "68 SASB industry metric sets."
    },
    "brsr": {
     "v": "yes"
    },
    "ccts": {
     "v": "yes",
     "note": "Sector output metrics; report ready for an ACVA."
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2, 3 and financed emissions."
    },
    "audit": {
     "v": "yes",
     "note": "Preparer, reviewer, approver per figure; documents stored with entries."
    },
    "tagging": {
     "v": "partly",
     "note": "ESRS datapoint tags ready for XBRL once ESMA's taxonomy applies."
    }
   },
   "rating": null,
   "researchRank": 2,
   "sources": [
    {
     "url": "https://www.climes.io/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/csrd-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/issb-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/brsr-core-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/ccts-reporting-india",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "intellocarbon",
   "name": "Intellocarbon",
   "vendor": "Intellocarbon Solutions Private Limited",
   "site": "https://www.intellocarbon.com/",
   "who": "Indian industrial companies and MSMEs.",
   "pricing": "Not published.",
   "free": "Free CBAM and CCTS calculators.",
   "status": null,
   "bestFor": "Indian MSMEs that want many frameworks from one data entry at MSME cost.",
   "strengths": [
    "One subscription covers BRSR Core, ISSB, GRI, CSRD/ESRS and CDP plus CBAM and CCTS in other plans.",
    "Built for Indian MSMEs."
   ],
   "limits": [
    "States BRSR Core needs reasonable assurance; SEBI's March 2025 circular allows assessment or assurance.",
    "CBAM pages still describe quarterly reporting."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "ESRS module; states CSRD scope after Directive 2026/470."
    },
    "issb": {
     "v": "yes"
    },
    "brsr": {
     "v": "yes",
     "note": "BRSR Core."
    },
    "ccts": {
     "v": "yes",
     "note": "BEE-format reports and CCC surplus tracking."
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2 and 3."
    },
    "audit": {
     "v": "partly",
     "note": "Verifier review inside the tool; ISO 14064-3 aligned workflow."
    },
    "tagging": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 3,
   "sources": [
    {
     "url": "https://www.intellocarbon.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/esg",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sweep",
   "name": "Sweep",
   "vendor": "Sweep",
   "site": "https://www.sweep.net/",
   "who": "Large companies in CSRD, ISSB and SB 253 scope.",
   "pricing": "On request.",
   "free": "Free CSRD roadmap and materiality tools.",
   "status": null,
   "bestFor": "Multinationals reporting to CSRD, ISSB and California at once.",
   "strengths": [
    "EU and US frameworks (CSRD, ISSB, SB 253) from one data set with digital tagging.",
    "Named a leader by IDC MarketScape 2026 and Verdantix 2026, per Sweep."
   ],
   "limits": [
    "No India frameworks (BRSR, CCTS) found.",
    "No published prices."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "Materiality builder; reflects Omnibus scope."
    },
    "issb": {
     "v": "yes",
     "note": "IFRS S1/S2 and SASB, 250+ indicators."
    },
    "brsr": {
     "v": "unknown"
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "yes"
    },
    "ghg": {
     "v": "yes",
     "note": "Carbon management."
    },
    "audit": {
     "v": "yes",
     "note": "Internal controls and audits."
    },
    "tagging": {
     "v": "yes",
     "note": "Tags indicators for ESAP machine-readable format."
    }
   },
   "rating": null,
   "researchRank": 4,
   "sources": [
    {
     "url": "https://www.sweep.net/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sweep.net/csrd",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sweep.net/issb",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sweep.net/sb-253",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "persefoni",
   "name": "Persefoni",
   "vendor": "Persefoni AI",
   "site": "https://www.persefoni.com/",
   "who": "Businesses of all sizes; financial institutions (PCAF).",
   "pricing": "Free plan; paid plan on request.",
   "free": "Free 'Measure Your Footprint' plan, no card.",
   "status": null,
   "bestFor": "US-linked companies and financial firms preparing for California and ISSB.",
   "strengths": [
    "Free starting plan with Scope 1 to 3.",
    "US coverage (SB 253, SB 261) and financed emissions."
   ],
   "limits": [
    "Framework reports are GHG-metric reports; no India coverage found.",
    "Several features marked 'coming soon' on the pricing page."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "CSRD GHG metrics report and report builder."
    },
    "issb": {
     "v": "yes"
    },
    "brsr": {
     "v": "unknown"
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "yes",
     "note": "CA SB-253 metrics report; SB 253 and SB 261 pages."
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2, all 15 Scope 3 categories, PCAF."
    },
    "audit": {
     "v": "yes",
     "note": "Footprint ledger and exportable audit history."
    },
    "tagging": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 5,
   "sources": [
    {
     "url": "https://www.persefoni.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.persefoni.com/pricing",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "osapiens-hub-disclosures-and-reporting",
   "name": "osapiens HUB Disclosures and Reporting",
   "vendor": "osapiens",
   "site": "https://www.osapiens.com/en/solutions/disclosure-and-reporting",
   "who": "Mid-market and enterprise organisations worldwide.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "European groups that must file tagged CSRD statements.",
   "strengths": [
    "Certified XBRL tagging and a reporting cockpit that updates the report from the data.",
    "Covers CSRD, VSME, GRI, ISSB, HKFRS SDS and UK SRS."
   ],
   "limits": [
    "No India or California frameworks found.",
    "No prices."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "CSRD/ESRS template, double materiality, VSME."
    },
    "issb": {
     "v": "yes"
    },
    "brsr": {
     "v": "unknown"
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "unknown"
    },
    "audit": {
     "v": "yes",
     "note": "Audit and quality assurance."
    },
    "tagging": {
     "v": "yes",
     "note": "Certified automated XBRL tagging; three certified taxonomies."
    }
   },
   "rating": null,
   "researchRank": 6,
   "sources": [
    {
     "url": "https://www.osapiens.com/en/solutions/disclosure-and-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.osapiens.com/en/regulations/issb",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sprih",
   "name": "Sprih",
   "vendor": "Sprih",
   "site": "https://www.sprih.com/",
   "who": "Large enterprises and their value chains across industries.",
   "pricing": "On request.",
   "free": "Free gap assessment and one AI-drafted report in a chosen framework, delivered in 4 business days.",
   "status": null,
   "bestFor": "Indian and US enterprises wanting AI-drafted disclosures with peer benchmarks.",
   "strengths": [
    "Free drafted report lets a buyer test output before paying.",
    "BRSR filing checker compares XBRL against the PDF."
   ],
   "limits": [
    "ISSB not named on its reporting page.",
    "No CCTS or published prices."
   ],
   "caps": {
    "csrd": {
     "v": "yes"
    },
    "issb": {
     "v": "unknown",
     "note": "TCFD and SASB named; ISSB not named."
    },
    "brsr": {
     "v": "yes",
     "note": "SEBI reporting and BRSR checker."
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "yes",
     "note": "California climate laws."
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2 and 3."
    },
    "audit": {
     "v": "yes",
     "note": "Audit trails and source-level checks."
    },
    "tagging": {
     "v": "partly",
     "note": "Checks BRSR XBRL against the PDF; XBRL generation not stated."
    }
   },
   "rating": null,
   "researchRank": 7,
   "sources": [
    {
     "url": "https://www.sprih.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/corporate-sustainability/sustainability-reporting/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/check-your-brsr-filing/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/get-free-report/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "karbon",
   "name": "Karbon",
   "vendor": "Planet Sustech",
   "site": "https://www.planetsustech.com/",
   "who": "Hard-to-abate and listed enterprises; SME programmes; India, UAE, Oman, Bangladesh.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Indian public-sector and infrastructure enterprises that want software and delivery together.",
   "strengths": [
    "On-premise deployment option.",
    "Software plus consulting, training and assurance support."
   ],
   "limits": [
    "Framework coverage described at headline level only.",
    "No prices."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "Listed under services delivered on Karbon."
    },
    "issb": {
     "v": "unknown"
    },
    "brsr": {
     "v": "yes"
    },
    "ccts": {
     "v": "yes",
     "note": "'India's carbon market, run end to end'."
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2, 3 on one data set."
    },
    "audit": {
     "v": "yes",
     "note": "Evidence behind every figure; assurance module."
    },
    "tagging": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 8,
   "sources": [
    {
     "url": "https://www.planetsustech.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.planetsustech.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "ibm-envizi-esg-suite",
   "name": "IBM Envizi ESG Suite",
   "vendor": "IBM",
   "site": "https://www.ibm.com/products/envizi",
   "who": "Enterprises with large ESG data volumes.",
   "pricing": "On request; an indicative calculator by account bundle: Essentials (up to 1,000 accounts), Standard (1,001 to 5,000), Premium (5,001 to 15,000+). Minimum term 12 months.",
   "free": null,
   "status": null,
   "bestFor": "Global enterprises consolidating ESG data at scale, especially real estate and multi-site groups.",
   "strengths": [
    "Over 1,000 framework questions with answer reuse across years and frameworks.",
    "Scales to very large data volumes."
   ],
   "limits": [
    "ISSB, BRSR, CCTS and SB 253 not named on its site.",
    "Enterprise pricing via sales."
   ],
   "caps": {
    "csrd": {
     "v": "yes",
     "note": "ESRS as a managed framework."
    },
    "issb": {
     "v": "unknown",
     "note": "SASB and TCFD named; ISSB not named."
    },
    "brsr": {
     "v": "unknown"
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2, 3 and financed emissions modules."
    },
    "audit": {
     "v": "yes",
     "note": "Data health checks and audit trails."
    },
    "tagging": {
     "v": "unknown",
     "note": "'Data tagging' refers to internal reuse, not XBRL."
    }
   },
   "rating": null,
   "researchRank": 9,
   "sources": [
    {
     "url": "https://www.ibm.com/products/envizi",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ibm.com/products/envizi/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ibm.com/products/envizi/esg-reporting-frameworks",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "updapt",
   "name": "Updapt",
   "vendor": "Updapt",
   "site": "https://www.updapt.com/",
   "who": "Enterprises in India and the UAE.",
   "pricing": "On request.",
   "free": "Free trial offered.",
   "status": null,
   "bestFor": "Indian and Gulf enterprises wanting BRSR and CSRD in one tool.",
   "strengths": [
    "Free trial.",
    "India and UAE framework focus with double materiality and supplier assessment modules."
   ],
   "limits": [
    "Little product detail is published on its site.",
    "No CCTS or SB 253 found."
   ],
   "caps": {
    "csrd": {
     "v": "yes"
    },
    "issb": {
     "v": "partly"
    },
    "brsr": {
     "v": "yes"
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "partly",
     "note": "Net zero module; calculation detail not read."
    },
    "audit": {
     "v": "yes",
     "note": "Multi-level validation and audit trails."
    },
    "tagging": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 10,
   "sources": [
    {
     "url": "https://www.updapt.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.updapt.com/brsr-reporting-software",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.updapt.com/csrdreportingsoftware",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.updapt.com/sitemap.xml",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible",
   "vendor": "Senseible",
   "site": "https://senseible.earth",
   "who": "MSMEs and suppliers in India that need emission records from their own bills; not a multi-framework disclosure suite.",
   "pricing": SENSEIBLE_PRICE,
   "free": "Free Snapshot plan (10 invoice scans a month) and a free CBAM cost calculator.",
   "status": null,
   "bestFor": "Suppliers and MSMEs answering a listed customer's emissions request, not compliance teams filing several frameworks.",
   "strengths": [
    "Every figure traced to a bill with factor and source.",
    "Low published prices with a free plan."
   ],
   "limits": [
    "Not a multi-framework disclosure suite; reports are self-declared drafts from your own records.",
    "BRSR coverage limited to energy and emissions fields."
   ],
   "caps": {
    "csrd": {
     "v": "no",
     "note": "Not offered as a CSRD/ESRS reporting tool."
    },
    "issb": {
     "v": "unknown"
    },
    "brsr": {
     "v": "partly",
     "note": "Drafts BRSR energy and emissions fields (Scope 1, Scope 2, energy) from bills; draft is self-declared; filing stays with the company."
    },
    "ccts": {
     "v": "unknown"
    },
    "sb253": {
     "v": "unknown"
    },
    "ghg": {
     "v": "yes",
     "note": "Scope 1, 2 and 3 records from invoices, with factor and source on every line; spend-based Scope 3 labelled as such."
    },
    "audit": {
     "v": "yes",
     "note": "Fingerprint (SHA-256) per document, never counted twice; 'Verified by Senseible' is an in-house check, not third-party assurance."
    },
    "tagging": {
     "v": "no",
     "note": "No XBRL output described."
    }
   },
   "rating": null,
   "researchRank": 11,
   "sources": [
    {
     "url": "https://senseible.earth/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/brsr-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/pricing",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "cbam": [
  {
   "id": "senseible",
   "name": "Senseible",
   "vendor": "Senseible",
   "site": "https://senseible.earth",
   "who": "Indian producers and exporters of CBAM goods, especially steel and aluminium, and MSMEs; the operator side, not the EU declarant.",
   "pricing": SENSEIBLE_CBAM_PRICE,
   "free": "Free Snapshot plan (10 invoice scans a month) and a free CBAM cost calculator.",
   "status": null,
   "bestFor": "Indian steel, aluminium, cement or fertiliser plants that need to hand an EU buyer a verifier-ready operator report.",
   "strengths": [
    "Produces the operator file in the Commission template plus a verifier pack, which is what an EU buyer's declarant and verifier ask for.",
    "Published low entry prices in rupees and a free CBAM cost calculator covering 2026 to 2034."
   ],
   "limits": [
    "Exporter side only: no declarant XML, no annual declaration, no multi-supplier portal for EU importers.",
    "Senseible checks every figure in-house; an accredited verifier signs off, either Senseible’s partner or one the client appoints."
   ],
   "caps": {
    "goods": {
     "v": "yes",
     "note": "Lists iron and steel, aluminium, cement, fertilisers, hydrogen and electricity by CN code; suite models tonnes per CN code."
    },
    "actuals": {
     "v": "yes",
     "note": "Models fuels, materials, processes, purchased and own precursors and electricity; returns specific embedded emissions per good. Indirect emissions counted for cement and fertilisers."
    },
    "supplier_collection": {
     "v": "partly",
     "note": "Takes precursor supplier values or EU defaults; no supplier portal for collecting from many operators is described."
    },
    "operator_template": {
     "v": "yes",
     "note": "Operator emissions report in .xlsx structured to the Commission communication template, with a SHA-256 of the workbook."
    },
    "verification": {
     "v": "yes",
     "note": "Verifier pack: evidence index, sampling by largest contributor, checklist and a misstatement check against 5% materiality per good. Senseible checks in-house; an accredited verifier (Senseible’s partner or the client’s own) signs off."
    },
    "defaults": {
     "v": "yes",
     "note": "Precursors at EU default values with the year's mark-up; calculator applies 10/20/30% and 1% for fertilisers."
    },
    "certificates": {
     "v": "yes",
     "note": "Free-allocation adjustment and certificate estimate; calculator projects cost 2026 to 2034."
    },
    "declarant_definitive": {
     "v": "no",
     "note": "States plainly it is not a declarant or customs representative and does not file the declaration."
    }
   },
   "rating": null,
   "researchRank": 3,
   "sources": [
    {
     "url": "https://senseible.earth/cbam-suite",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/cbam",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/cbam-authorised-declarant",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/cbam-calculator",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/assets/planPricing-DqTxH_YM.js",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "osapiens-hub-for-cbam",
   "name": "osapiens HUB for CBAM",
   "vendor": "osapiens",
   "site": "https://www.osapiens.com/en/regulations/cbam",
   "who": "EU importers and their procurement, trade-compliance and finance teams; mid-market and enterprise. 2,500+ customers in 60+ countries (company-wide).",
   "pricing": "On request.",
   "free": "Supplier portal is free for suppliers; no buyer trial stated.",
   "status": null,
   "bestFor": "EU importers with many non-EU suppliers who need declarations and certificate budgeting in one place.",
   "strengths": [
    "Built around the definitive-period workflow: authorisation, annual declaration, 50% holding and certificate cost.",
    "Supplier portal in 29 languages lowers the burden on non-EU suppliers."
   ],
   "limits": [
    "No published prices.",
    "Does not show plant-side tools for the operator's emissions report; relies on suppliers producing their own figures."
   ],
   "caps": {
    "goods": {
     "v": "partly",
     "note": "Describes covered goods and the 50-tonne threshold; no per-sector or CN-code coverage list on the page."
    },
    "actuals": {
     "v": "partly",
     "note": "Calculates embedded carbon per good and production site from supplier data; plant-level attribution is done by the supplier."
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Free supplier portal in 29 languages with e-learning, reminders and email templates; supplier benchmarking."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "unknown",
     "note": "Mentions verified production-level data but no verifier workflow."
    },
    "defaults": {
     "v": "yes",
     "note": "Explains fallback to EU default values."
    },
    "certificates": {
     "v": "yes"
    },
    "declarant_definitive": {
     "v": "yes"
    }
   },
   "rating": null,
   "researchRank": 1,
   "sources": [
    {
     "url": "https://www.osapiens.com/en/regulations/cbam",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.osapiens.com/en/about-us",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "cbam-compliance-manager",
   "name": "Deloitte CBAM Compliance Manager",
   "vendor": "Deloitte (Netherlands member firm page)",
   "site": "https://www.deloitte.com/nl/en/services/tax/services/eu-carbon-border-adjustment-mechanism-cbam.html",
   "who": "EU importers; optional managed service where Deloitte acts as authorised declarant and buys certificates. Separate CBAM Exporter Portal for non-EU suppliers.",
   "pricing": "On request (software only or managed service).",
   "free": null,
   "status": null,
   "bestFor": "Large EU importers that want CBAM software and a managed declarant service from one adviser.",
   "strengths": [
    "Can take the declarant role and certificate purchases off the importer's hands.",
    "Ties CBAM to customs filing through TrackonTrade and ERP links."
   ],
   "limits": [
    "No public prices; built for larger importers.",
    "Older Deloitte product papers describe quarterly XML reports; check the current version."
   ],
   "caps": {
    "goods": {
     "v": "unknown"
    },
    "actuals": {
     "v": "partly",
     "note": "Allocates supplier and import emissions; default versus actual calculations with audit-grade logs."
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Automated supplier solicitation and validation; Exporter Portal for suppliers to share product-level data."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "partly",
     "note": "Validation of supplier carbon content; audit trails. No accredited-verifier workflow described."
    },
    "defaults": {
     "v": "yes",
     "note": "Cost forecasting on actual or EU default values."
    },
    "certificates": {
     "v": "yes",
     "note": "Certificate cost forecasting by volume and supplier location; certificate monitoring."
    },
    "declarant_definitive": {
     "v": "yes",
     "note": "Generates XML declarations; prepares annual declarations; optional declarant service."
    }
   },
   "rating": null,
   "researchRank": 2,
   "sources": [
    {
     "url": "https://www.deloitte.com/nl/en/services/tax/services/eu-carbon-border-adjustment-mechanism-cbam.html",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbon-os",
   "name": "Carbon-OS (CBAM)",
   "vendor": "Climes",
   "site": "https://www.climes.io/cbam-reporting-india",
   "who": "Indian exporters of steel, aluminium and cement; also listed companies, lenders and OEM supply chains in the same software.",
   "pricing": "On request.",
   "free": "Free Carbon X-Ray for listed companies; no CBAM trial stated.",
   "status": null,
   "bestFor": "Indian groups that file BRSR Core and CCTS and also export CBAM goods.",
   "strengths": [
    "Route-level allocation (blast furnace versus electric arc under one CN code) is explained and supported.",
    "One data layer for CBAM, CCTS and BRSR Core."
   ],
   "limits": [
    "No mention of the Commission operator template or certificate cost estimates.",
    "No published prices."
   ],
   "caps": {
    "goods": {
     "v": "yes",
     "note": "Screens export lines by CN code; lists all six sectors."
    },
    "actuals": {
     "v": "yes",
     "note": "Allocates fuel, power and process inputs per installation and production route monthly; carries precursor emissions."
    },
    "supplier_collection": {
     "v": "partly",
     "note": "Collects supplier-declared embedded emissions against input materials with evidence; no supplier portal detail."
    },
    "operator_template": {
     "v": "unknown",
     "note": "Describes a per-consignment emissions statement for the EU buyer, not the Commission template by name."
    },
    "verification": {
     "v": "partly",
     "note": "States accredited verification applies and keeps records retrievable; no verifier workflow described."
    },
    "defaults": {
     "v": "partly",
     "note": "Explains default mark-ups and the August 2026 correction; no tool for applying them described."
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Exporter side. Rules on the page match the definitive period, and it says CCTS is not yet recognised for deduction."
    }
   },
   "rating": null,
   "researchRank": 4,
   "sources": [
    {
     "url": "https://www.climes.io/cbam-reporting-india",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/about",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "tsc-netzero-cbam-importer-and-cbam-exporter",
   "name": "TSC NetZero CBAM Importer and CBAM Exporter",
   "vendor": "The Sustainability Cloud",
   "site": "https://www.thesustainabilitycloud.com/products/cbam-importer/",
   "who": "EU importers, customs agents (CHAs) and traders on the importer product; non-EU exporters on the exporter product.",
   "pricing": "Importer: Free (1 user, 2 imports a month); Business Basic €60 a month billed monthly or €48 a month billed annually (3 users, 6 imports a month); Business Standard €200 a month billed monthly or €160 billed annually (5 users, 10 imports a month); add 5 imports for €50 a month or €480 a year; onboarding €150 one time (€300 on CHA plans). CHA and trader plans: contact sales. Exporter product: on request.",
   "free": "Free importer plan; 14-day free trial on paid importer plans.",
   "status": null,
   "bestFor": "Small EU importers wanting a low-cost start, and Indian exporters wanting plant data feeds.",
   "strengths": [
    "Covers both sides of the trade, with published euro prices and a free importer tier.",
    "Plant data feeds (SCADA, CEMS, sub-meters) and an assurance module for verifiers."
   ],
   "limits": [
    "Pricing and exporter pages still describe transitional quarterly reports and the transitional registry.",
    "No certificate cost or default-value handling shown."
   ],
   "caps": {
    "goods": {
     "v": "partly",
     "note": "Defines CBAM goods as CN codes under Regulation 2023/956; no sector list checked."
    },
    "actuals": {
     "v": "yes",
     "note": "Product and process-level attribution rules; bubble and process methods; ERP, SCADA, IIoT, sub-meter and CEMS feeds."
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Email web-form collection from suppliers, approval workflow; exporter product has a supplier portal for precursors."
    },
    "operator_template": {
     "v": "unknown",
     "note": "Mentions digital monitoring-methodology templates per product."
    },
    "verification": {
     "v": "yes",
     "note": "Assurance module to invite EU-accredited auditors; audit trails."
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "partly",
     "note": "Generates CBAM XML, but the pricing page still says one XML report per quarter for the EU transitional registry and the exporter page still describes quarterly reporting."
    }
   },
   "rating": null,
   "researchRank": 5,
   "sources": [
    {
     "url": "https://www.thesustainabilitycloud.com/products/cbam-importer/pricing/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/products/cbam-exporter/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "unicore",
   "name": "UniCORE",
   "vendor": "Uniqus (tool powered by ESG UniVerse)",
   "site": "https://uniqus.com/unicore/",
   "who": "EU-focused exporters, with an Indian emphasis (CCTS); paired with Uniqus advisory.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Indian exporters who want CBAM cost scenarios with consulting support.",
   "strengths": [
    "Liability forecasting to 2034 and investment-case modelling for boards.",
    "Advisory team bundled with the tool."
   ],
   "limits": [
    "Claims India's CCTS cuts CBAM cost; the EU act on carbon price paid abroad is not yet adopted.",
    "Few product details beyond a May 2026 brochure."
   ],
   "caps": {
    "goods": {
     "v": "yes",
     "note": "Lists all six sectors; models proposed downstream goods."
    },
    "actuals": {
     "v": "yes",
     "note": "Bottom-up SEE from combustion, process, electricity, heat and precursors."
    },
    "supplier_collection": {
     "v": "partly",
     "note": "Benchmarks supplier intensities; no collection portal described."
    },
    "operator_template": {
     "v": "partly",
     "note": "Says it generates 'official template' documents pre-filled with plant data for the EU customer; template version not stated."
    },
    "verification": {
     "v": "unknown"
    },
    "defaults": {
     "v": "partly",
     "note": "Mentions default mark-up from 2028."
    },
    "certificates": {
     "v": "yes",
     "note": "Multi-year liability to 2034 with free-allocation phase-out; scenario and NPV modelling."
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Exporter side. Brochure cites the transitional implementing regulation 2023/1773 as its compliance basis."
    }
   },
   "rating": null,
   "researchRank": 6,
   "sources": [
    {
     "url": "https://uniqus.com/wp-content/uploads/2026/05/UniCore.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "intellocarbon-cbam-compliance",
   "name": "Intellocarbon CBAM Compliance",
   "vendor": "Intellocarbon Solutions Private Limited",
   "site": "https://www.intellocarbon.com/products/cbam-compliance",
   "who": "Indian industrial exporters and MSMEs in steel, cement, aluminium, fertilisers, hydrogen and electricity; also UK CBAM.",
   "pricing": "Not published (the site describes self-serve pricing).",
   "free": "Free CBAM and CCTS calculators, no signup.",
   "status": null,
   "bestFor": "Indian steel exporters selling into both the EU and UK.",
   "strengths": [
    "Verifier review inside the tool against the EU checklist.",
    "Same plan covers UK CBAM from 2027 and the Green Steel Taxonomy for steel."
   ],
   "limits": [
    "Describes quarterly CBAM reporting windows, which ended with the transitional period.",
    "States carbon paid under India's CCTS reduces EU CBAM today; the EU act on carbon price paid abroad is not yet adopted."
   ],
   "caps": {
    "goods": {
     "v": "yes",
     "note": "Six sectors listed."
    },
    "actuals": {
     "v": "yes",
     "note": "Combustion, process and indirect sources modelled at facility and production-route level; precursor reconciliation."
    },
    "supplier_collection": {
     "v": "unknown"
    },
    "operator_template": {
     "v": "partly",
     "note": "Assembles an 'importer communication package'; template version not named."
    },
    "verification": {
     "v": "yes",
     "note": "Accredited verifier works inside the tool against the Annex VI checklist."
    },
    "defaults": {
     "v": "partly",
     "note": "Compares actuals with EU defaults and benchmarks."
    },
    "certificates": {
     "v": "yes",
     "note": "Certificate price charted quarterly; liability projections."
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Exporter side, and the page says CBAM has four reporting windows a year; definitive-period rules use an annual declaration."
    }
   },
   "rating": null,
   "researchRank": 7,
   "sources": [
    {
     "url": "https://www.intellocarbon.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/products/cbam-compliance",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/about",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/esg",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "cleancarbon-ai-cbam-software",
   "name": "CleanCarbon.ai CBAM software",
   "vendor": "CleanCarbon.ai",
   "site": "https://cleancarbon.ai/",
   "who": "Indian exporters in steel, aluminium, fasteners, machinery and automotive parts; mid-sized firms and large exporters.",
   "pricing": "On request.",
   "free": "Free 30-minute strategy call; free CN code checker and calculator.",
   "status": null,
   "bestFor": "Indian engineering exporters that want hands-on help as much as software.",
   "strengths": [
    "Supplier data collection shown in named case studies.",
    "Combines software, training and on-site support."
   ],
   "limits": [
    "Still describes quarterly CBAM reports.",
    "Verification claims rest on ISO certificates, not a named CBAM accreditation."
   ],
   "caps": {
    "goods": {
     "v": "partly",
     "note": "CN code checker tool; sector pages for iron and steel and aluminium."
    },
    "actuals": {
     "v": "partly",
     "note": "Converts production and energy use into product footprints; method detail not shown."
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Centralised supplier workflows; case studies of 35-supplier collection."
    },
    "operator_template": {
     "v": "partly",
     "note": "Excel, XML and PDF outputs 'accepted by the European Commission'; template not named."
    },
    "verification": {
     "v": "partly",
     "note": "Markets itself as an accredited verification service and lists ISO 14065 and ISO/IEC 17029 certificates; no CBAM accreditation by an EU national accreditation body is named."
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "partly",
     "note": "Free CBAM tax calculator."
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Software page still says it creates quarterly CBAM reports."
    }
   },
   "rating": null,
   "researchRank": 8,
   "sources": [
    {
     "url": "https://cleancarbon.ai/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://cleancarbon.ai/cbam-compliance-software/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://cleancarbon.ai/about-us/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbonneeti",
   "name": "CarbonNeeti",
   "vendor": "Meridian Intelligence (trade name of AANYA TECHNOLOGIES)",
   "site": "https://www.carbonneeti.com/",
   "who": "Indian manufacturers filing BRSR and CCTS; CBAM output included in the BRSR + CCTS plan.",
   "pricing": "BRSR + CCTS plan (includes CBAM): ₹1,00,000 a month plus 18% GST, up to 5 plants; Group ₹3,75,000 a month plus GST, up to 15 plants; Enterprise on request. Yearly billing charges 10 months for 12.",
   "free": "30 days free, no card.",
   "status": null,
   "bestFor": "Indian manufacturers already using it for BRSR and CCTS who also need a CBAM template.",
   "strengths": [
    "Names the Commission template as an output.",
    "Two-person approval on every figure; verifiers join free."
   ],
   "limits": [
    "CBAM is a side output of a BRSR and CCTS tool; no CBAM calculation detail published.",
    "A young product (started January 2025); data hosted in France."
   ],
   "caps": {
    "goods": {
     "v": "partly",
     "note": "Lists the six sectors and states when an entity is outside scope."
    },
    "actuals": {
     "v": "unknown"
    },
    "supplier_collection": {
     "v": "unknown"
    },
    "operator_template": {
     "v": "yes",
     "note": "Lists 'EU CBAM Communication Template v2.1.1' as an output."
    },
    "verification": {
     "v": "partly",
     "note": "Verifiers get free seats and can raise queries on pre-check findings."
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Exporter side."
    }
   },
   "rating": null,
   "researchRank": 9,
   "sources": [
    {
     "url": "https://www.carbonneeti.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbonneeti.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbonneeti.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "netzerra",
   "name": "NetZerra",
   "vendor": "NetZerra",
   "site": "https://www.netzerra.com/",
   "who": "Indian manufacturers and traders exporting steel, aluminium, fertilisers and chemicals; MSMEs on Tally.",
   "pricing": "NetZerra Enterprise from ₹1,50,000 a year; may scale with facility throughput.",
   "free": null,
   "status": null,
   "bestFor": "Tally-based Indian MSMEs that want ledger data pulled in automatically, once it reflects definitive-period rules.",
   "strengths": [
    "Tally plugin that pulls in Indian MSME ledger data.",
    "Published starting price."
   ],
   "limits": [
    "Built around quarterly XML reports that no longer apply.",
    "Penalty figures on the page are not explained against the regulation."
   ],
   "caps": {
    "goods": {
     "v": "partly",
     "note": "Maps Indian HSN codes to CN codes; sectors listed partly."
    },
    "actuals": {
     "v": "partly",
     "note": "Scope 1 and 2 with CEA factors and an embedded-emissions calculator; process detail not shown."
    },
    "supplier_collection": {
     "v": "partly",
     "note": "Multi-supplier data management; upstream data relay for traders."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "partly",
     "note": "Lists a 'verifier marketplace'."
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Sells '4 quarterly EU-compliant XML exports' and says each quarter without a report risks a fine; quarterly reports ended 31 Dec 2025."
    }
   },
   "rating": null,
   "researchRank": 10,
   "sources": [
    {
     "url": "https://www.netzerra.com/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbmee-eis",
   "name": "carbmee EIS (CBAM)",
   "vendor": "carbmee",
   "site": "https://www.carbmee.com/climate-regulations-cbam",
   "who": "Enterprise manufacturers with complex supply chains.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Large manufacturers already using carbmee for Scope 3 that also import CBAM goods.",
   "strengths": [
    "Takes ERP and procurement data for large manufacturers.",
    "The same software covers corporate, supply-chain and product footprints."
   ],
   "limits": [
    "Page states non-compliance penalties are a percentage of turnover and puts packaging in CBAM scope; neither matches the CBAM Regulation's goods list or per-tonne penalties.",
    "Few CBAM-specific functions described."
   ],
   "caps": {
    "goods": {
     "v": "unknown"
    },
    "actuals": {
     "v": "partly",
     "note": "Built on transactional procurement data."
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Supplier engagement and collaboration module."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "unknown"
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "partly",
     "note": "Promises 'audit-grade CBAM reports ready for EU submission'; output format not stated."
    }
   },
   "rating": null,
   "researchRank": 11,
   "sources": [
    {
     "url": "https://www.carbmee.com/climate-regulations-cbam",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbmee.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbmee.com/about-us",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "greenly-cbam",
   "name": "Greenly CBAM",
   "vendor": "Greenly",
   "site": "https://greenly.earth/en-gb/cbam",
   "who": "EU declarants and UK firms exporting to the EU.",
   "pricing": "On request.",
   "free": "Free CBAM checker and calculators.",
   "status": null,
   "bestFor": "Existing Greenly customers with a few CBAM suppliers, after checking its CBAM rules are current.",
   "strengths": [
    "Automated supplier requests when new products or suppliers appear.",
    "Large supplier emissions database for sourcing comparisons."
   ],
   "limits": [
    "CBAM page describes transitional rules (quarterly XML) and says default values can no longer be used, though the Commission publishes them for the definitive period.",
    "No prices published."
   ],
   "caps": {
    "goods": {
     "v": "yes",
     "note": "Six sectors listed."
    },
    "actuals": {
     "v": "unknown"
    },
    "supplier_collection": {
     "v": "yes",
     "note": "CBAM questionnaires, supplier spaces, automated follow-ups."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "unknown"
    },
    "defaults": {
     "v": "no",
     "note": "Page says default values cannot be used anymore; the Commission publishes default values for the definitive period (corrected August 2026)."
    },
    "certificates": {
     "v": "partly",
     "note": "Forecasting of allowances and costs mentioned."
    },
    "declarant_definitive": {
     "v": "no",
     "note": "Still offers 'automated quarterly XML reports' for the declarant portal."
    }
   },
   "rating": null,
   "researchRank": 12,
   "sources": [
    {
     "url": "https://greenly.earth/en-gb/cbam",
     "seen": "2026-10-29"
    },
    {
     "url": "https://greenly.earth/en-gb/pricing",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "karbon",
   "name": "Karbon (CBAM services)",
   "vendor": "Planet Sustech",
   "site": "https://www.planetsustech.com/",
   "who": "Hard-to-abate and listed enterprises in India, UAE, Oman and Bangladesh; SME programmes too.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Enterprises that want a consultant to run CBAM alongside BRSR and CCTS.",
   "strengths": [
    "On-premise option.",
    "Consulting delivery in the same software."
   ],
   "limits": [
    "CBAM appears only as a service line; no CBAM product page found.",
    "No CBAM method or output detail published."
   ],
   "caps": {
    "goods": {
     "v": "unknown"
    },
    "actuals": {
     "v": "unknown"
    },
    "supplier_collection": {
     "v": "yes",
     "note": "Supplier engagement and assessment module."
    },
    "operator_template": {
     "v": "unknown"
    },
    "verification": {
     "v": "partly",
     "note": "Audit, assurance and evidence module."
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 13,
   "sources": [
    {
     "url": "https://www.planetsustech.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.planetsustech.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "greenalign",
   "name": "Greenalign",
   "vendor": "Fitsol",
   "site": "https://www.fitsol.green/platform/greenalign",
   "who": "Manufacturers and exporters.",
   "pricing": "On request (Pro plan listed without a price).",
   "free": null,
   "status": null,
   "bestFor": "Manufacturers that want reduction services alongside light CBAM reporting.",
   "strengths": [
    "Bundles reporting with a marketplace of reduction services.",
    "CBAM, BRSR and CDP templates in one tool."
   ],
   "limits": [
    "CBAM listed as 'AI-enabled CSRD and CBAM compliance' with no method detail.",
    "No prices."
   ],
   "caps": {
    "goods": {
     "v": "unknown"
    },
    "actuals": {
     "v": "unknown"
    },
    "supplier_collection": {
     "v": "partly",
     "note": "Partner engagement and emission calculation listed in the Pro plan."
    },
    "operator_template": {
     "v": "partly",
     "note": "Built-in CBAM reporting templates; not named as the Commission template."
    },
    "verification": {
     "v": "unknown"
    },
    "defaults": {
     "v": "unknown"
    },
    "certificates": {
     "v": "unknown"
    },
    "declarant_definitive": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": 14,
   "sources": [
    {
     "url": "https://www.fitsol.green/platform/greenalign",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.fitsol.green/pricing",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "brsr": [
  {
   "id": "tsc-netzero-for-brsr-and-brsr-core",
   "name": "TSC NetZero for BRSR and BRSR Core",
   "vendor": "The Sustainability Cloud",
   "site": "https://www.thesustainabilitycloud.com/brsr-reporting/",
   "who": "Top 1,000 listed companies and their value chains.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Top 250 listed companies collecting value chain data and filing XBRL.",
   "strengths": [
    "End-to-end: value chain collection, audit trail and XBRL in one tool.",
    "Quarterly or half-yearly drafts roll up into the annual report."
   ],
   "limits": [
    "No published BRSR prices.",
    "Its pages do not mention SEBI's March 2025 changes."
   ],
   "caps": {
    "full_brsr": {
     "v": "yes",
     "note": "Section and question workflow; previous-year comparison."
    },
    "brsr_core": {
     "v": "yes"
    },
    "value_chain": {
     "v": "yes",
     "note": "Assign questions to partners, review, approve, consolidate."
    },
    "ghg_india": {
     "v": "partly",
     "note": "Scope 1 and 2 accounting; Indian factor source not stated on its site."
    },
    "evidence": {
     "v": "yes",
     "note": "Audit record per question; maker-checker; auditor invite."
    },
    "xbrl": {
     "v": "yes",
     "note": "PDF, Excel and XBRL."
    },
    "current_rules": {
     "v": "unknown"
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 1,
   "sources": [
    {
     "url": "https://www.thesustainabilitycloud.com/brsr-reporting/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.thesustainabilitycloud.com/brsr-core/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbonneeti",
   "name": "CarbonNeeti",
   "vendor": "Meridian Intelligence (trade name of AANYA TECHNOLOGIES)",
   "site": "https://www.carbonneeti.com/",
   "who": "Indian manufacturers; advisors and verifiers as free seats.",
   "pricing": "BRSR: ₹50,000 a month plus 18% GST (one company, up to 5 plants); BRSR + CCTS: ₹1,00,000 a month plus GST; Group: ₹3,75,000 a month plus GST (up to 15 plants); Enterprise on request. Yearly billing charges 10 months for 12.",
   "free": "30 days free, no card; reading and exports stay open after the trial.",
   "status": null,
   "bestFor": "Listed manufacturers in the 251 to 1,000 band preparing BRSR Core and CCTS from plant bills.",
   "strengths": [
    "Each figure tied to the bill page, factor edition and two approvers.",
    "Published prices and a 30-day trial."
   ],
   "limits": [
    "Value chain collection not described.",
    "A young product (started January 2025); data hosted outside India."
   ],
   "caps": {
    "full_brsr": {
     "v": "yes",
     "note": "Prepares the BRSR; company files."
    },
    "brsr_core": {
     "v": "yes"
    },
    "value_chain": {
     "v": "unknown"
    },
    "ghg_india": {
     "v": "yes",
     "note": "CEA CO2 Baseline Database v22.0 factor for FY 2025-26 shown."
    },
    "evidence": {
     "v": "yes",
     "note": "Bill page, factor edition, working and two-person approval per figure."
    },
    "xbrl": {
     "v": "partly",
     "note": "Partial XBRL file completed in the exchange's BRSR utility."
    },
    "current_rules": {
     "v": "yes",
     "note": "Refers to assessment or assurance of BRSR Core."
    },
    "pricing": {
     "v": "yes"
    }
   },
   "rating": null,
   "researchRank": 2,
   "sources": [
    {
     "url": "https://www.carbonneeti.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbonneeti.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.carbonneeti.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbonlens",
   "name": "CarbonLens",
   "vendor": "CarbonLens",
   "site": "https://carbonlenss.com/",
   "who": "Mid-market listed companies ranked 251 to 1,000; CA firms.",
   "pricing": "Starter ₹2,49,000 a year (Scope 1 and 2, BRSR Core, up to 3 users); Growth ₹4,99,000 a year (Scope 3, Tally, bill reading, CCTS, up to 10 users); Enterprise custom.",
   "free": "14-day free trial, no card.",
   "status": null,
   "bestFor": "Mid-cap listed companies wanting a priced, self-serve BRSR tool, after checking its rule statements.",
   "strengths": [
    "Published annual prices and Tally integration.",
    "Portal for CA firms reviewing several clients."
   ],
   "limits": [
    "Regulatory timeline on its pages is out of date on assurance and value chain.",
    "XBRL output not stated."
   ],
   "caps": {
    "full_brsr": {
     "v": "yes",
     "note": "All nine principles auto-populated."
    },
    "brsr_core": {
     "v": "yes",
     "note": "BRSR Core report and checklist."
    },
    "value_chain": {
     "v": "partly",
     "note": "Supplier / Scope 3 value chain portal on the Enterprise plan."
    },
    "ghg_india": {
     "v": "yes",
     "note": "CEA, BEE and MoEFCC factors; utility bill OCR."
    },
    "evidence": {
     "v": "partly",
     "note": "Timestamped, attributed data points; document linkage not described."
    },
    "xbrl": {
     "v": "partly",
     "note": "'Exact format required for SEBI filing'; XBRL not named."
    },
    "current_rules": {
     "v": "no",
     "note": "Says BRSR Core assurance is mandatory and lists value chain with the top 500; SEBI's March 2025 circular allows assessment or assurance and made value chain disclosure voluntary for the top 250."
    },
    "pricing": {
     "v": "yes"
    }
   },
   "rating": null,
   "researchRank": 3,
   "sources": [
    {
     "url": "https://carbonlenss.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://carbonlenss.com/brsr-software",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "carbon-os",
   "name": "Carbon-OS (BRSR Core)",
   "vendor": "Climes",
   "site": "https://www.climes.io/brsr-core-reporting",
   "who": "Listed companies, especially those entering BRSR Core assessment or assurance.",
   "pricing": "On request.",
   "free": "Free Carbon X-Ray for listed companies.",
   "status": null,
   "bestFor": "Companies in the top 1,000 facing their first BRSR Core assessment or assurance.",
   "strengths": [
    "Rule statements match SEBI's current framework.",
    "Each BRSR Core cell clicks through to its records."
   ],
   "limits": [
    "XBRL output not stated.",
    "No published prices."
   ],
   "caps": {
    "full_brsr": {
     "v": "partly",
     "note": "Focus is BRSR Core, not the full narrative report."
    },
    "brsr_core": {
     "v": "yes",
     "note": "All nine attributes with evidence types."
    },
    "value_chain": {
     "v": "partly",
     "note": "Explains voluntary value chain rules; collection tool not described."
    },
    "ghg_india": {
     "v": "yes",
     "note": "Scope 2 factor library versioned by year and state."
    },
    "evidence": {
     "v": "yes",
     "note": "Document stored with each entry; preparer, reviewer, approver."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "yes",
     "note": "Assessment or assurance; value chain voluntary for top 250 from FY 2025-26."
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 4,
   "sources": [
    {
     "url": "https://www.climes.io/brsr-core-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.climes.io/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sprih",
   "name": "Sprih",
   "vendor": "Sprih",
   "site": "https://www.sprih.com/",
   "who": "Large enterprises and value chains.",
   "pricing": "On request.",
   "free": "Free gap assessment and drafted report; free BRSR filing check.",
   "status": null,
   "bestFor": "Listed companies that want last year's filing checked before choosing a tool.",
   "strengths": [
    "Free check of last year's BRSR (PDF against XBRL, totals, intensities).",
    "Value chain module."
   ],
   "limits": [
    "BRSR Core workflow not described.",
    "No prices."
   ],
   "caps": {
    "full_brsr": {
     "v": "yes",
     "note": "SEBI reporting supported; BRSR case study."
    },
    "brsr_core": {
     "v": "partly",
     "note": "BRSR Core named; attribute workflow not described."
    },
    "value_chain": {
     "v": "yes",
     "note": "Value chain and supplier engagement module."
    },
    "ghg_india": {
     "v": "partly",
     "note": "Scope 1, 2, 3; Indian factor source not stated."
    },
    "evidence": {
     "v": "partly",
     "note": "Audit trails and source-level checks."
    },
    "xbrl": {
     "v": "partly",
     "note": "Checker compares XBRL with the PDF; generation not stated."
    },
    "current_rules": {
     "v": "unknown"
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 5,
   "sources": [
    {
     "url": "https://www.sprih.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/check-your-brsr-filing/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/get-free-report/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sprih.com/corporate-sustainability/sustainability-reporting/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible",
   "vendor": "Senseible",
   "site": "https://senseible.earth",
   "who": "Unlisted suppliers asked for figures by a listed customer, and listed companies needing Scope 1, Scope 2 and energy figures traced to bills.",
   "pricing": SENSEIBLE_PRICE,
   "free": "Free Snapshot plan (10 invoice scans a month) and a free CBAM cost calculator.",
   "status": null,
   "bestFor": "Suppliers and smaller listed companies that need defensible Scope 1, 2 and energy figures for BRSR.",
   "strengths": [
    "Each energy and emissions figure traces to a specific bill and factor.",
    "Free plan and low published prices, suited to suppliers asked for data."
   ],
   "limits": [
    "Covers two of nine BRSR Core attributes; not a full BRSR tool.",
    "Draft is self-declared; no XBRL output."
   ],
   "caps": {
    "full_brsr": {
     "v": "no",
     "note": "Drafts only the BRSR energy and emissions fields; not the full report."
    },
    "brsr_core": {
     "v": "partly",
     "note": "Builds the GHG footprint and energy footprint attributes from bills; other seven attributes not covered."
    },
    "value_chain": {
     "v": "partly",
     "note": "Supplier questionnaire template and supplier emissions pages; supplier evidence trail for Scope 3 lines."
    },
    "ghg_india": {
     "v": "yes",
     "note": "Units, litres and kilograms read off each bill; CEA grid factor by the bill's financial year."
    },
    "evidence": {
     "v": "yes",
     "note": "Factor and source on every line; SHA-256 per document."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "yes",
     "note": "Reflects the 28 March 2025 circular: assessment or assurance, 2% partner rule, voluntary value chain."
    },
    "pricing": {
     "v": "yes"
    }
   },
   "rating": null,
   "researchRank": 6,
   "sources": [
    {
     "url": "https://senseible.earth/brsr-reporting",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sustaineve",
   "name": "Sustaineve",
   "vendor": "Sustaineve",
   "site": "https://www.sustaineve.com/",
   "who": "Mid-size Indian manufacturers, priced by facility count.",
   "pricing": "Essential ₹1.5 lakh to ₹3 lakh a year (1 to 3 facilities); Growth ₹4 lakh to ₹6 lakh a year (3 to 6 facilities); Enterprise ₹8 lakh to ₹12 lakh a year, custom contract (6 to 15 facilities). Billed annually.",
   "free": "No self-serve trial; guided demo.",
   "status": null,
   "bestFor": "Manufacturers needing Principle 6 figures now and willing to wait for the rest.",
   "strengths": [
    "Unlimited users, priced per facility with published ranges.",
    "Manufacturing-specific Scope 1 categories with state grid factors."
   ],
   "limits": [
    "Social and Governance modules, needed for full BRSR, not yet live when checked.",
    "Scope 3 marked coming soon."
   ],
   "caps": {
    "full_brsr": {
     "v": "no",
     "note": "Full BRSR report generation is listed as upcoming; Social and Governance modules were due Q3 2026 and still shown as upcoming when checked."
    },
    "brsr_core": {
     "v": "partly",
     "note": "Principle 6 GHG, energy, water and waste."
    },
    "value_chain": {
     "v": "partly",
     "note": "Supplier ESG data collection on Tier 2."
    },
    "ghg_india": {
     "v": "yes",
     "note": "CEA state-specific grid factors; IPCC 2006 and 2019."
    },
    "evidence": {
     "v": "yes",
     "note": "Source, factor, method and standard version per calculation."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "partly",
     "note": "Says independent assessment is 'encouraged'; does not describe BRSR Core phase-in."
    },
    "pricing": {
     "v": "yes"
    }
   },
   "rating": null,
   "researchRank": 7,
   "sources": [
    {
     "url": "https://www.sustaineve.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sustaineve.com/compliance/brsr",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sustaineve.com/pricing",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sustaineve.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "intellocarbon-esg-disclosure-bundle",
   "name": "Intellocarbon ESG Disclosure Bundle",
   "vendor": "Intellocarbon Solutions Private Limited",
   "site": "https://www.intellocarbon.com/esg",
   "who": "Indian industrial MSMEs and listed entities.",
   "pricing": "Not published.",
   "free": null,
   "status": null,
   "bestFor": "Exporters that need BRSR Core alongside CBAM and CCTS from one vendor.",
   "strengths": [
    "One subscription also covers ISSB, GRI, CSRD and CDP.",
    "Records the company's cohort and states whether assurance is due."
   ],
   "limits": [
    "Assurance wording out of date.",
    "No value chain or XBRL detail."
   ],
   "caps": {
    "full_brsr": {
     "v": "unknown"
    },
    "brsr_core": {
     "v": "yes"
    },
    "value_chain": {
     "v": "unknown"
    },
    "ghg_india": {
     "v": "partly",
     "note": "Electricity bills read for Scope 2; factor source not stated."
    },
    "evidence": {
     "v": "partly",
     "note": "Verifier review inside the tool."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "no",
     "note": "Describes reasonable assurance phasing; SEBI now allows assessment or assurance."
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 8,
   "sources": [
    {
     "url": "https://www.intellocarbon.com/esg",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.intellocarbon.com/about",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "updapt-brsr-reporting",
   "name": "Updapt BRSR reporting",
   "vendor": "Updapt",
   "site": "https://www.updapt.com/brsr-reporting-software",
   "who": "Indian enterprises.",
   "pricing": "On request.",
   "free": "Free trial offered.",
   "status": null,
   "bestFor": "Enterprises wanting a broad ESG data tool that includes BRSR.",
   "strengths": [
    "Free trial.",
    "Supplier assessment and double materiality modules alongside BRSR."
   ],
   "limits": [
    "Little BRSR detail is published on its site.",
    "No BRSR Core or XBRL detail found."
   ],
   "caps": {
    "full_brsr": {
     "v": "partly",
     "note": "BRSR page lists the nine principles; workflow detail not published."
    },
    "brsr_core": {
     "v": "unknown"
    },
    "value_chain": {
     "v": "partly",
     "note": "Supplier assessment module."
    },
    "ghg_india": {
     "v": "unknown"
    },
    "evidence": {
     "v": "partly",
     "note": "Validation levels and audit trails."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "unknown"
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 9,
   "sources": [
    {
     "url": "https://www.updapt.com/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.updapt.com/brsr-reporting-software",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.updapt.com/sitemap.xml",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "karbon",
   "name": "Karbon (BRSR)",
   "vendor": "Planet Sustech",
   "site": "https://www.planetsustech.com/",
   "who": "Listed and public-sector enterprises in hard-to-abate sectors.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "PSUs and infrastructure companies that want BRSR delivered as a service.",
   "strengths": [
    "Shows ESG rating score changes for named listed clients (vendor's data).",
    "Consulting and assurance support."
   ],
   "limits": [
    "BRSR functions described only at headline level.",
    "No prices."
   ],
   "caps": {
    "full_brsr": {
     "v": "partly",
     "note": "BRSR listed among frameworks and services."
    },
    "brsr_core": {
     "v": "unknown"
    },
    "value_chain": {
     "v": "yes",
     "note": "Supplier assessment, reused across reports."
    },
    "ghg_india": {
     "v": "partly",
     "note": "Reads bills, logs and meter photos; factor source not stated."
    },
    "evidence": {
     "v": "yes",
     "note": "Evidence behind every figure."
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "unknown"
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 10,
   "sources": [
    {
     "url": "https://www.planetsustech.com/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "greenalign",
   "name": "Greenalign",
   "vendor": "Fitsol",
   "site": "https://www.fitsol.green/platform/greenalign",
   "who": "Manufacturers and exporters.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Manufacturers that want reduction projects bundled with reporting.",
   "strengths": [
    "Reporting plus a marketplace of reduction services.",
    "Gap guidance on missing data."
   ],
   "limits": [
    "Little BRSR detail published.",
    "No prices."
   ],
   "caps": {
    "full_brsr": {
     "v": "partly",
     "note": "Built-in BRSR templates."
    },
    "brsr_core": {
     "v": "unknown"
    },
    "value_chain": {
     "v": "partly",
     "note": "Partner engagement listed."
    },
    "ghg_india": {
     "v": "partly",
     "note": "India-specific and global factors."
    },
    "evidence": {
     "v": "unknown"
    },
    "xbrl": {
     "v": "unknown"
    },
    "current_rules": {
     "v": "unknown"
    },
    "pricing": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": 11,
   "sources": [
    {
     "url": "https://www.fitsol.green/platform/greenalign",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.fitsol.green/pricing",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "carbon-credits": [
  {
   "id": "verra-registry",
   "name": "Verra Registry",
   "vendor": "Verra",
   "site": "https://verra.org",
   "who": "Project developers who register projects and issue credits; buyers and brokers who hold, transfer and retire credits. Any account holder passes KYC checks. Worldwide.",
   "pricing": "Account opening US$750 and annual maintenance US$750 per account; VCU issuance levy US$0.23 per claimed tonne of CO2e; VCU transfer, retirement and cancellation US$0.02 per VCU each (Verra Program Fee Schedule v1.1).",
   "free": "Public view is open; accounts are paid.",
   "status": "Moving to a new registry system (transition page updated 26 July 2026).",
   "bestFor": "Developers issuing VCS credits and buyers who want to hold and retire them in their own name.",
   "strengths": [
    "Unit-level labels and VVB tracked at each verification in the new registry.",
    "Full fee schedule is public, so costs can be planned."
   ],
   "limits": [
    "Not a place to buy at a quoted price; you need a seller or broker.",
    "Every account pays US$750 a year, whatever its size."
   ],
   "caps": {
    "registry_issuance": {
     "v": "yes",
     "note": "Central record of Verra projects and units; you need an account to register projects or issue, retire or transfer credits; it keeps each project and credit unique."
    },
    "buy_or_trade": {
     "v": "partly",
     "note": "Holds, transfers and retires credits between account holders; it is not a marketplace with prices."
    },
    "public_transparency": {
     "v": "yes",
     "note": "Has a public view; the new registry adds reporting on project data and issuance history."
    },
    "quality_labels": {
     "v": "partly",
     "note": "Administrators add and remove labels at unit level; fee schedule lists label fees, for example GHG reduction and removal labels."
    },
    "published_fees": {
     "v": "yes",
     "note": "Fee schedule v1.1 published."
    },
    "api_access": {
     "v": "yes",
     "note": "Project Hub APIs (Digital Gateway); documentation needs a login."
    },
    "india_relevance": {
     "v": "unknown",
     "note": "Not stated on its site."
    },
    "small_business_access": {
     "v": "partly",
     "note": "No minimum size stated, but a US$750 opening fee plus US$750 a year applies to every account."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://verra.org/registry/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://verra.org/documents/verra-program-fee-schedule-v1-1/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://verra.org/verra-registry-transition/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "gold-standard-impact-registry-and-marketplace",
   "name": "Gold Standard Impact Registry and Marketplace",
   "vendor": "Gold Standard Foundation",
   "site": "https://www.goldstandard.org",
   "who": "Project developers certifying reductions, removals and SDG impacts; companies buying certified credits; governments. Projects in 133 countries per the homepage.",
   "pricing": "Registry account US$1,000 a year per organisation; issuance US$0.25 per credit (cash option) or US$0.15 plus 2% of issuance; US$0.20 or US$0.10 in least developed countries; transfer and retirement US$0.02 per credit. Marketplace prices vary by project (US$10, 12 and 39 per tonne seen on 29 October 2026).",
   "free": "Registry public view and SDG Impact Dashboard are open.",
   "status": null,
   "bestFor": "Smaller buyers who want to retire certified credits at a visible price without a broker.",
   "strengths": [
    "Buy by the tonne at a listed price, including Indian projects.",
    "Registry, marketplace and regulation tracker under one standard body."
   ],
   "limits": [
    "Marketplace only carries Gold Standard projects.",
    "No API found for automated buying."
   ],
   "caps": {
    "registry_issuance": {
     "v": "yes",
     "note": "Impact Registry records where credits are issued, held, transferred and retired."
    },
    "buy_or_trade": {
     "v": "yes",
     "note": "Gold Standard Marketplace sells credits from listed projects at a per-tonne price."
    },
    "public_transparency": {
     "v": "yes",
     "note": "Registry is publicly searchable; SDG Impact Dashboard is open access."
    },
    "quality_labels": {
     "v": "yes",
     "note": "Homepage states CORSIA, ICVCM and ISEAL endorsement; fee schedule lists an Article 6 label including CORSIA at US$0.05 per credit."
    },
    "published_fees": {
     "v": "yes",
     "note": "Fee Schedule v3.1 (28 July 2025) and marketplace prices per tonne."
    },
    "api_access": {
     "v": "unknown",
     "note": "No API mentioned on its site."
    },
    "india_relevance": {
     "v": "yes",
     "note": "Marketplace lists Indian projects, for example a 400 MW solar project at Bhadla, Rajasthan at US$12 per tonne."
    },
    "small_business_access": {
     "v": "yes",
     "note": "Marketplace sells by the tonne online; no minimum stated on listing page."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.goldstandard.org/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.goldstandard.org/digital-apps",
     "seen": "2026-10-29"
    },
    {
     "url": "https://marketplace.goldstandard.org/collections/projects",
     "seen": "2026-10-29"
    },
    {
     "url": "https://globalgoals.goldstandard.org/standards/Gold-Standard-Fee-Schedule-v.3.1.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "cbl",
   "name": "CBL (Xpansiv)",
   "vendor": "Xpansiv",
   "site": "https://xpansiv.com/cbl/",
   "who": "Commercial, financial and industrial traders: corporate buyers, fund managers, trading houses. Global.",
   "pricing": "On request.",
   "free": null,
   "status": null,
   "bestFor": "Traders and large buyers who need exchange pricing and fast settlement.",
   "strengths": [
    "Deep spot liquidity with same-day settlement.",
    "Standard contracts (CORSIA, GEO CCP) give price benchmarks."
   ],
   "limits": [
    "Built for trading desks, not one-off small purchases.",
    "No published fees."
   ],
   "caps": {
    "registry_issuance": {
     "v": "partly",
     "note": "Not an issuer; Xpansiv also runs a registry business (issue, track and transfer RECs and carbon) and links to 15+ registries for settlement."
    },
    "buy_or_trade": {
     "v": "yes",
     "note": "Spot exchange for carbon credits and RECs, with order book, auctions and RFQ; trades settle T+0."
    },
    "public_transparency": {
     "v": "partly",
     "note": "Market data and live pricing offered; whether it is free was not stated."
    },
    "quality_labels": {
     "v": "yes",
     "note": "Standardised contracts including GEO CCP and CORSIA contracts."
    },
    "published_fees": {
     "v": "no",
     "note": "No fees on page; contact sales."
    },
    "api_access": {
     "v": "unknown",
     "note": "Not stated on its site."
    },
    "india_relevance": {
     "v": "unknown",
     "note": "Not stated; trades I-RECs."
    },
    "small_business_access": {
     "v": "unknown",
     "note": "Participants described as 200+ organisations; no minimum stated."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://xpansiv.com/cbl/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "eki-energy-services",
   "name": "EKI Energy Services",
   "vendor": "EKI Energy Services Ltd (formerly EnKing International)",
   "site": "https://www.enkingint.org/",
   "who": "Companies buying offsets and project owners who want carbon credits developed; 3,500+ clients in 40+ countries per its site.",
   "pricing": "On request.",
   "free": null,
   "status": "Listed on BSE; renamed from EnKing International.",
   "bestFor": "Indian project owners who want a developer to take a project to issuance.",
   "strengths": [
    "Handles the whole project cycle from design to issuance.",
    "Also offers footprints, EPR and renewable certificates."
   ],
   "limits": [
    "Broker and developer, so prices are negotiated.",
    "No public price or fee list."
   ],
   "caps": {
    "registry_issuance": {
     "v": "no",
     "note": "Develops projects and supplies credits; it is not a registry."
    },
    "buy_or_trade": {
     "v": "yes",
     "note": "Supplies credits for offsetting (states 200+ million offsets supplied)."
    },
    "public_transparency": {
     "v": "unknown"
    },
    "quality_labels": {
     "v": "partly",
     "note": "Advises on Article 6 and ITMOs; no ratings."
    },
    "published_fees": {
     "v": "no"
    },
    "api_access": {
     "v": "unknown"
    },
    "india_relevance": {
     "v": "yes",
     "note": "Indian company headquartered in Indore."
    },
    "small_business_access": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.enkingint.org/",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "indian-carbon-market",
   "name": "Indian Carbon Market (Carbon Credit Trading Scheme)",
   "vendor": "Government of India: BEE (administrator), Grid Controller of India (registry), CERC (regulator)",
   "site": "https://www.cercind.gov.in/current_reg.html",
   "who": "Obligated entities (compliance market) and non-obligated entities (offset market) in India.",
   "pricing": "Prices are set on the power exchanges; fees not published.",
   "free": null,
   "status": "CERC trading regulations notified 27 February 2026. Check the exchanges for when trading starts.",
   "bestFor": "Indian obligated industries and offset project owners preparing for CCTS.",
   "strengths": [
    "The only route to India's compliance certificates.",
    "Regulated by CERC with registry cross-checks on sale bids."
   ],
   "limits": [
    "Start of trading not confirmed on an official page when checked.",
    "Registry fees and rules sit with BEE and Grid Controller of India; check them directly."
   ],
   "caps": {
    "registry_issuance": {
     "v": "yes",
     "note": "Grid Controller of India acts as the registry; BEE issues Carbon Credit Certificates on government approval."
    },
    "buy_or_trade": {
     "v": "yes",
     "note": "Certificates trade only on power exchanges unless CERC allows otherwise, in a compliance segment and an offset segment, monthly by default."
    },
    "public_transparency": {
     "v": "unknown"
    },
    "quality_labels": {
     "v": "unknown"
    },
    "published_fees": {
     "v": "partly"
    },
    "api_access": {
     "v": "unknown"
    },
    "india_relevance": {
     "v": "yes",
     "note": "India's national scheme."
    },
    "small_business_access": {
     "v": "partly",
     "note": "Non-obligated entities may join the offset segment voluntarily; registration with BEE and the exchange required."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.cercind.gov.in/regulations/205-Noti.pdf",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.cercind.gov.in/current_reg.html",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible",
   "name": "Senseible (readiness only)",
   "vendor": "Senseible",
   "site": "https://senseible.earth",
   "who": "Indian MSMEs that want to see whether reductions in their own bills could support a credit claim later.",
   "pricing": SENSEIBLE_PRICE,
   "free": "Free Snapshot tier.",
   "status": null,
   "bestFor": "MSMEs building the evidence base before approaching a project developer or registry.",
   "strengths": [
    "Turns bills and invoices into a hash-fingerprinted emissions record a credit buyer or developer can check.",
    "Free to start."
   ],
   "limits": [
    "Cannot issue, register or sell credits; you still need a standard (Verra, Gold Standard, CCTS) and a verifier.",
    "Eligibility signals are not an additionality decision."
   ],
   "caps": {
    "registry_issuance": {
     "v": "no",
     "note": "Does not issue credits and is not a registry."
    },
    "buy_or_trade": {
     "v": "no",
     "note": "Not an exchange or marketplace."
    },
    "public_transparency": {
     "v": "no",
     "note": "Records are private to the user."
    },
    "quality_labels": {
     "v": "no",
     "note": "No quality labels; 'Verified by Senseible' is an in-house check, not third-party assurance."
    },
    "published_fees": {
     "v": "yes",
     "note": "Free Snapshot plan; paid plans published on the pricing page."
    },
    "api_access": {
     "v": "partly",
     "note": "No public self-serve API; enterprise API on request."
    },
    "india_relevance": {
     "v": "yes",
     "note": "Uses CEA grid factors and Indian invoices (HSN codes)."
    },
    "small_business_access": {
     "v": "yes",
     "note": "Built for MSMEs; free tier."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://senseible.earth/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/carbon-credits",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/pricing",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "green-loans": [
  {
   "id": "sidbi-green-finance-scheme",
   "name": "SIDBI Green Finance Scheme (GFS)",
   "vendor": "Small Industries Development Bank of India (SIDBI)",
   "site": "https://www.sidbi.in/en/green-finance",
   "who": "New and existing Udyam-registered MSMEs, plus solar and green service providers or aggregators serving MSMEs.",
   "pricing": "Rate not published; ask SIDBI.",
   "free": null,
   "status": null,
   "bestFor": "A new or growing MSME funding a broad green project, or an aggregator funding many small ones.",
   "strengths": [
    "Open to new units, not only those with three years' history.",
    "Large ceiling and open to aggregators."
   ],
   "limits": [
    "At least 25% must come from you.",
    "Rate and security only in the sanction letter."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "Renewable energy, energy-efficient buildings, waste management, resource and energy efficiency, wastewater treatment, cleaner production."
    },
    "ticket_size": {
     "v": "yes",
     "note": "Maximum Rs 100 crore for an MSME and/or a service provider or aggregator with an MSME linkage."
    },
    "financing_share": {
     "v": "yes",
     "note": "Up to 75% of project cost."
    },
    "eligibility": {
     "v": "yes",
     "note": "New and existing MSMEs with valid Udyam, satisfactory credit history, no defaults; service providers and aggregators with MSME linkage also eligible."
    },
    "tenure": {
     "v": "partly",
     "note": "Flexible, set per project."
    },
    "rate_published": {
     "v": "no",
     "note": "Not published."
    },
    "apply_route": {
     "v": "yes",
     "note": "Apply online via 'Apply Now' (SIDBI online loan portal), or via a SIDBI branch or registered Referral Partner; toll-free 180-022-6753."
    },
    "evidence_asked": {
     "v": "partly",
     "note": "All borrowers must comply with SIDBI's Environment and Social Management Framework."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sidbi.in/en/green-finance",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sidbi-end-to-end-energy-efficiency",
   "name": "SIDBI End to End Energy Efficiency (4E)",
   "vendor": "Small Industries Development Bank of India (SIDBI)",
   "site": "https://www.sidbi.in/en/green-finance",
   "who": "Established MSMEs with three years of cash profit.",
   "pricing": "Rate not published; ask SIDBI.",
   "free": null,
   "status": null,
   "bestFor": "A profitable unit replacing inefficient equipment without putting in its own money.",
   "strengths": [
    "Can fund the whole project cost.",
    "Covers civil works and commissioning, not just equipment."
   ],
   "limits": [
    "Needs three profitable years.",
    "Rate not published."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "Energy-efficiency measures end to end: equipment, installation, civil works, commissioning."
    },
    "ticket_size": {
     "v": "yes",
     "note": "Maximum Rs 15 crore."
    },
    "financing_share": {
     "v": "yes",
     "note": "Up to 100%."
    },
    "eligibility": {
     "v": "yes",
     "note": "MSME units running at least three years with cash profit in the last three financial years."
    },
    "tenure": {
     "v": "yes",
     "note": "Up to 84 months."
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "yes",
     "note": "Apply online via 'Apply Now' (SIDBI online loan portal), or via a SIDBI branch or registered Referral Partner; toll-free 180-022-6753."
    },
    "evidence_asked": {
     "v": "partly",
     "note": "Must comply with SIDBI's Environment and Social Management Framework; energy audit requirement not stated on the current FAQ."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sidbi.in/en/green-finance",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sidbi-machinery-loans",
   "name": "SIDBI machinery loans (EXPRESS, SPEED, UDAY)",
   "vendor": "Small Industries Development Bank of India (SIDBI)",
   "site": "https://www.sidbi.in/en/machinery-loan",
   "who": "MSMEs buying new machines; UDAY suits units under three years old.",
   "pricing": "Rate not published.",
   "free": null,
   "status": null,
   "bestFor": "Replacing old machines with efficient new ones when a green scheme does not fit.",
   "strengths": [
    "UDAY serves new units that green loans with vintage rules exclude.",
    "Fast, digitally assessed EXPRESS route."
   ],
   "limits": [
    "Not a green product; no energy saving needed or rewarded.",
    "Rates not published."
   ],
   "caps": {
    "what_it_funds": {
     "v": "partly",
     "note": "New machinery for new units, expansion, modernisation and technology upgrades; not restricted to green or energy-saving machines."
    },
    "ticket_size": {
     "v": "yes",
     "note": "EXPRESS up to Rs 3 crore; SPEED up to Rs 15 crore; UDAY up to Rs 50 lakh."
    },
    "financing_share": {
     "v": "unknown"
    },
    "eligibility": {
     "v": "yes",
     "note": "EXPRESS: three years running, GST mandatory. SPEED: three years with cash profit in last three FYs. UDAY: new units or under three years."
    },
    "tenure": {
     "v": "yes",
     "note": "EXPRESS and UDAY up to 60 months; SPEED up to 84 months."
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "yes",
     "note": "Online via SIDBI portal, a branch or a Referral Partner."
    },
    "evidence_asked": {
     "v": "no",
     "note": "No energy evidence asked on the FAQ."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sidbi.in/en/machinery-loan",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "sidbi-gcf-fmap",
   "name": "SIDBI GCF-FMAP (Green Climate Fund loans)",
   "vendor": "Small Industries Development Bank of India (SIDBI)",
   "site": "https://www.sidbi.in/en/green-pathways-e-series",
   "who": "MSMEs in the listed sectors with low or medium environmental risk.",
   "pricing": "Not published.",
   "free": null,
   "status": null,
   "bestFor": "Units in textile, foundry, plastic, brick, paper or steel re-rolling buying listed efficient equipment.",
   "strengths": [
    "Sector-specific equipment lists make eligibility concrete.",
    "Uses Green Climate Fund money."
   ],
   "limits": [
    "Limited to listed sectors.",
    "Amounts and rates not published."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "Direct finance in sectors with published environmental and social plans: textile, foundry, steel re-rolling, plastic, brick kiln, pulp and paper, agriculture (adaptation)."
    },
    "ticket_size": {
     "v": "unknown"
    },
    "financing_share": {
     "v": "unknown"
    },
    "eligibility": {
     "v": "partly",
     "note": "Category A (high-risk) projects are not covered; proposals are screened against SIDBI's exclusion list (brick kiln sector plan)."
    },
    "tenure": {
     "v": "unknown"
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "partly",
     "note": "Through SIDBI; contact via the Green Pathways page."
    },
    "evidence_asked": {
     "v": "yes",
     "note": "Environmental and social screening under SIDBI's ESMS against the sector plan."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sidbi.in/en/green-pathways-e-series",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.sidbi.in/assets/front/pdf/ESIA_ESMP_Brick_Kiln_English.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "mse-gift-and-mse-spice",
   "name": "MSE-GIFT and MSE-SPICE (RAMP schemes listed by SIDBI)",
   "vendor": "Small Industries Development Bank of India (SIDBI)",
   "site": "https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans",
   "who": "Micro and small enterprises adopting green technology or circular practices.",
   "pricing": "Not published.",
   "free": null,
   "status": "Listed on SIDBI’s page (updated 7 October 2026); whether the window is still open is unclear.",
   "bestFor": "MSEs taking a green loan who want to check for an interest incentive on top.",
   "strengths": [
    "Government support that lowers the cost of a green loan.",
    "Covers circular economy projects other schemes miss."
   ],
   "limits": [
    "Whether the window is still open is unclear; ask the lender.",
    "Support rate and cap not on the page."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "MSE-GIFT: clean or green technology at a concessional rate. MSE-SPICE: circular economy (recycling, reuse) for micro and small units."
    },
    "ticket_size": {
     "v": "unknown"
    },
    "financing_share": {
     "v": "unknown"
    },
    "eligibility": {
     "v": "partly",
     "note": "Micro and small enterprises (MSEs)."
    },
    "tenure": {
     "v": "unknown"
    },
    "rate_published": {
     "v": "no",
     "note": "Concessional support described, no rate published."
    },
    "apply_route": {
     "v": "unknown"
    },
    "evidence_asked": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "ireda-energy-efficiency-loans",
   "name": "IREDA energy efficiency loans",
   "vendor": "Indian Renewable Energy Development Agency (IREDA)",
   "site": "https://www.ireda.in/IredaWebPortal/loan-products/sectors/energy-efficiency",
   "who": "Companies and LLPs with larger energy-efficiency projects; ESCOs.",
   "pricing": "Grade-based rates; see Financing Norms.",
   "free": null,
   "status": null,
   "bestFor": "Mid-sized companies and ESCOs financing energy-efficiency retrofits.",
   "strengths": [
    "Accepts ESCO and shared-savings projects.",
    "BEE grading and risk guarantee support."
   ],
   "limits": [
    "Rs 50 lakh minimum.",
    "Proprietors and partnerships need full bank guarantee or FD."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "Retrofit with efficient equipment, process change, waste heat recovery for power, ESCO projects, turnkey EE equipment."
    },
    "ticket_size": {
     "v": "yes",
     "note": "Minimum Rs 50 lakh unless a scheme says otherwise."
    },
    "financing_share": {
     "v": "yes",
     "note": "Up to 75% for new clients meeting DSCR thresholds (Financing Norms, 1 October 2026)."
    },
    "eligibility": {
     "v": "yes",
     "note": "Companies, LLPs and public bodies; proprietorships and partnerships only against a full bank guarantee or FD."
    },
    "tenure": {
     "v": "unknown",
     "note": "Varies by scheme."
    },
    "rate_published": {
     "v": "partly",
     "note": "Rates tied to five internal risk grades in IREDA’s Financing Norms."
    },
    "apply_route": {
     "v": "yes",
     "note": "Online Loan Application (OLA) linked on page."
    },
    "evidence_asked": {
     "v": "yes",
     "note": "BEE grading available with fee reimbursement; securitisation under BEE's Partial Risk Guarantee Fund."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.ireda.in/IredaWebPortal/loan-products/sectors/energy-efficiency",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.ireda.in/IredaWebPortal/documents/loan-products/financing-norms-01-10-2026.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "ireda-rooftop-solar-loan-scheme",
   "name": "IREDA rooftop solar loan scheme",
   "vendor": "Indian Renewable Energy Development Agency (IREDA)",
   "site": "https://www.ireda.in/IredaWebPortal/documents/loan-products/financing-norms-01-10-2026.pdf",
   "who": "Aggregators and RESCOs; large roof owners.",
   "pricing": "Grade-based rates.",
   "free": null,
   "status": null,
   "bestFor": "Solar aggregators financing many MSME rooftops.",
   "strengths": [
    "Aggregator route pools many small roofs.",
    "Clear published norms."
   ],
   "limits": [
    "5,000 kWp minimum excludes a single MSME roof.",
    "No subsidy from IREDA."
   ],
   "caps": {
    "what_it_funds": {
     "v": "yes",
     "note": "Rooftop solar on industrial, commercial and institutional roofs."
    },
    "ticket_size": {
     "v": "yes",
     "note": "Minimum application 5,000 kWp in both Direct and Aggregator categories; aggregator sub-projects at least 20 kWp."
    },
    "financing_share": {
     "v": "partly",
     "note": "Up to 75% norm for new clients."
    },
    "eligibility": {
     "v": "partly",
     "note": "Roof owners (Direct) or aggregators; single MSME roof falls below the minimum, so the route is via an aggregator."
    },
    "tenure": {
     "v": "yes",
     "note": "Up to 10 years after a 12-month moratorium from commissioning; up to 15 years if at least 80% of private off-takers are rated A- or above."
    },
    "rate_published": {
     "v": "partly",
     "note": "Grade-based; 15 bps discount only for projects on government or PSU buildings."
    },
    "apply_route": {
     "v": "yes",
     "note": "Online Loan Application."
    },
    "evidence_asked": {
     "v": "unknown"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.ireda.in/IredaWebPortal/documents/loan-products/financing-norms-01-10-2026.pdf",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "rbi-rules-on-msme-collateral",
   "name": "RBI rules on MSME collateral",
   "vendor": "Reserve Bank of India",
   "site": "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11060",
   "who": "Any micro or small enterprise borrowing from a bank.",
   "pricing": null,
   "free": null,
   "status": "In force (Master Direction updated 9 February 2026). A rule, not a loan.",
   "bestFor": "Small units pushing back when a bank asks for property on a small green loan.",
   "strengths": [
    "Collateral-free floor for small loans.",
    "14-working-day decision limit for loans up to Rs 25 lakh."
   ],
   "limits": [
    "Not a scheme; you still need a lender.",
    "Above Rs 25 lakh, each bank's own timelines apply."
   ],
   "caps": {
    "what_it_funds": {
     "v": "no",
     "note": "A rule, not a loan."
    },
    "ticket_size": {
     "v": "yes",
     "note": "No collateral for MSE loans up to Rs 20 lakh; banks may extend to Rs 25 lakh for good track records."
    },
    "financing_share": {
     "v": "no"
    },
    "eligibility": {
     "v": "yes",
     "note": "MSE units; all PMEGP units."
    },
    "tenure": {
     "v": "no"
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "partly",
     "note": "Banks must track applications and decide loans up to Rs 25 lakh within 14 working days."
    },
    "evidence_asked": {
     "v": "no"
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11060",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "nbfc-green-lenders",
   "name": "NBFC green lenders (RBI green deposit framework)",
   "vendor": "Deposit-taking NBFCs and HFCs under RBI",
   "site": "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12940&Mode=0",
   "who": "Borrowers of deposit-taking NBFCs that raise green deposits.",
   "pricing": null,
   "free": null,
   "status": "In force.",
   "bestFor": "Borrowers comparing NBFC green products against bank and SIDBI routes.",
   "strengths": [
    "NBFCs may lend green whether or not they raise green deposits.",
    "Published frameworks show what each lender counts as green."
   ],
   "limits": [
    "Terms vary by lender; check each lender’s own framework.",
    "Expect end-use checks and reporting."
   ],
   "caps": {
    "what_it_funds": {
     "v": "partly",
     "note": "Green deposit money goes to an interim list of green activities pending India's official taxonomy."
    },
    "ticket_size": {
     "v": "unknown"
    },
    "financing_share": {
     "v": "unknown"
    },
    "eligibility": {
     "v": "unknown",
     "note": "Lender-specific."
    },
    "tenure": {
     "v": "unknown"
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "unknown"
    },
    "evidence_asked": {
     "v": "partly",
     "note": "NBFC must publish its green Financing Framework with an external reviewer's opinion; allocation verified by a third party, so borrower end-use is checked."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12940&Mode=0",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "senseible-green-loan-check",
   "name": "Senseible green loan check (readiness step)",
   "vendor": "Senseible",
   "site": "https://senseible.earth/green-loan-check",
   "who": "Indian MSMEs preparing a green loan application.",
   "pricing": SENSEIBLE_LOAN_PRICE,
   "free": "Free check and free Snapshot tier.",
   "status": null,
   "bestFor": "MSMEs getting their papers and emissions evidence ready before approaching a lender.",
   "strengths": [
    "Produces the bill-based evidence several schemes ask for (12 months of bills).",
    "Two-minute checklist of what a credit team will ask."
   ],
   "limits": [
    "Not a lender; the bank or SIDBI decides.",
    "A checklist, not an eligibility decision."
   ],
   "caps": {
    "what_it_funds": {
     "v": "no",
     "note": "Does not lend; the check covers rooftop solar, efficient machinery, cleaner fuel, EVs, waste or water upgrades as the purpose."
    },
    "ticket_size": {
     "v": "no"
    },
    "financing_share": {
     "v": "no"
    },
    "eligibility": {
     "v": "partly",
     "note": "Gives a preparation checklist, not an eligibility decision."
    },
    "tenure": {
     "v": "no"
    },
    "rate_published": {
     "v": "no"
    },
    "apply_route": {
     "v": "partly",
     "note": "Signed-in users on Essential and higher can prepare a full application with documents kept private."
    },
    "evidence_asked": {
     "v": "yes",
     "note": "Turns electricity bills and fuel invoices into a fingerprinted emissions record a lender can check."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://senseible.earth/green-loan-check",
     "seen": "2026-10-29"
    },
    {
     "url": "https://senseible.earth/msme-green-loan-schemes",
     "seen": "2026-10-29"
    }
   ]
  }
 ],
 "tenders": [
  {
   "id": "ted",
   "name": "TED (Tenders Electronic Daily)",
   "vendor": "Publications Office of the European Union",
   "site": "https://ted.europa.eu/en/",
   "who": "Suppliers bidding for EU public contracts; exporters and consultants.",
   "pricing": "Free.",
   "free": "Free.",
   "status": null,
   "bestFor": "Exporters and consultants tracking EU public tenders with green criteria.",
   "strengths": [
    "Open API with bulk download.",
    "Notices carry structured green procurement fields."
   ],
   "limits": [
    "Green flag depends on the buyer filling it.",
    "EU only."
   ],
   "caps": {
    "coverage": {
     "v": "yes",
     "note": "Supplement to the Official Journal of the EU: EU public procurement notices, plus contracts awarded by EU institutions."
    },
    "green_filter": {
     "v": "partly",
     "note": "eForms notices carry Green Procurement (BT-774), Green Procurement Criteria (BT-805) and Clean Vehicles Directive fields; no dedicated green filter found on the website."
    },
    "free_access": {
     "v": "yes",
     "note": "Search API needs no authentication; notices are public."
    },
    "alerts": {
     "v": "unknown",
     "note": "Account login exists; alerts not stated."
    },
    "api_or_bulk_data": {
     "v": "yes",
     "note": "Open Search API with bulk XML download."
    },
    "india_relevance": {
     "v": "partly",
     "note": "Indian firms can read notices; eligibility to bid depends on each tender."
    },
    "emission_evidence_in_bids": {
     "v": "partly",
     "note": "Tenders flagged with green procurement criteria may score environmental performance; verified emission records can support such responses."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://ted.europa.eu/en/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://docs.ted.europa.eu/api/latest/search.html",
     "seen": "2026-10-29"
    },
    {
     "url": "https://docs.ted.europa.eu/eforms/latest/reference/business-terms/index.html",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "find-a-tender",
   "name": "Find a Tender (UK)",
   "vendor": "UK Government (Cabinet Office)",
   "site": "https://www.find-tender.service.gov.uk/",
   "who": "Suppliers bidding for UK public contracts.",
   "pricing": "Free.",
   "free": "Free.",
   "status": "Replaced TED in the UK on 31 December 2020.",
   "bestFor": "Suppliers to UK central government who must submit a Carbon Reduction Plan.",
   "strengths": [
    "One place for UK notices across the contract life cycle.",
    "Clear carbon rule for large central government contracts."
   ],
   "limits": [
    "No green filter found.",
    "UK only."
   ],
   "caps": {
    "coverage": {
     "v": "yes",
     "note": "Above and below threshold UK procurements from 24 February 2025 (below threshold in Scotland excluded); full contract life cycle."
    },
    "green_filter": {
     "v": "unknown"
    },
    "free_access": {
     "v": "yes",
     "note": "Public search of notices."
    },
    "alerts": {
     "v": "unknown"
    },
    "api_or_bulk_data": {
     "v": "partly"
    },
    "india_relevance": {
     "v": "partly",
     "note": "Open to read; eligibility per tender."
    },
    "emission_evidence_in_bids": {
     "v": "yes",
     "note": "Central government contracts above £5 million a year must ask bidders for a Carbon Reduction Plan with current Scope 1 and 2 and a defined subset of Scope 3 emissions (PPN 006)."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.find-tender.service.gov.uk/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.gov.uk/government/publications/ppn-006-taking-account-of-carbon-reduction-plans-in-the-procurement-of-major-government-contracts/ppn-006-taking-account-of-carbon-reduction-plans-html",
     "seen": "2026-10-29"
    }
   ]
  },
  {
   "id": "contracts-finder",
   "name": "Contracts Finder (UK)",
   "vendor": "UK Government",
   "site": "https://www.contractsfinder.service.gov.uk/",
   "who": "Suppliers to England and non-devolved public bodies, including lower-value contracts.",
   "pricing": "Free.",
   "free": "Free.",
   "status": "Live since 26 February 2015; still labelled beta.",
   "bestFor": "Small suppliers looking for lower-value UK public contracts.",
   "strengths": [
    "Lower-value contracts that smaller suppliers can win.",
    "Free, open licence."
   ],
   "limits": [
    "No sustainability filter.",
    "Mostly England."
   ],
   "caps": {
    "coverage": {
     "v": "yes",
     "note": "Below-threshold contracts over £12,000 including VAT (£30,000 outside central government) for England and non-devolved territories, per Find a Tender."
    },
    "green_filter": {
     "v": "no",
     "note": "Keyword and region search only."
    },
    "free_access": {
     "v": "yes"
    },
    "alerts": {
     "v": "unknown"
    },
    "api_or_bulk_data": {
     "v": "partly",
     "note": "Content under Open Government Licence; API not stated."
    },
    "india_relevance": {
     "v": "partly",
     "note": "Open to read."
    },
    "emission_evidence_in_bids": {
     "v": "partly",
     "note": "Large contracts fall under PPN 006; lower-value ones only if the buyer asks."
    }
   },
   "rating": null,
   "researchRank": null,
   "sources": [
    {
     "url": "https://www.contractsfinder.service.gov.uk/",
     "seen": "2026-10-29"
    },
    {
     "url": "https://www.find-tender.service.gov.uk/",
     "seen": "2026-10-29"
    }
   ]
  }
 ]
};
// </products generated>

/** Live guides only; related links to held guides are dropped. */
export const GUIDES: Guide[] = ALL_GUIDES
  .filter(g => !HELD_GUIDES.includes(g.id))
  .map(g => ({ ...g, related: g.related.filter(id => !HELD_GUIDES.includes(id)) }));
export const GUIDE_BY_PATH: Record<string, Guide> = Object.fromEntries(GUIDES.map(g => [g.path, g]));
export const GUIDE_BY_ID = Object.fromEntries(ALL_GUIDES.map(g => [g.id, g])) as Record<GuideId, Guide>;
export const GUIDE_PATHS = GUIDES.map(g => g.path);
/** The guides that compare software, linked from the carbon accounting chooser. */
export const SOFTWARE_GUIDE_IDS: GuideId[] = ['carbon-accounting', 'supplier-emissions', 'carbon-compliance', 'cbam', 'brsr'];

export function productsFor(id: GuideId): Product[] {
  const g = GUIDE_BY_ID[id];
  return RAW_PRODUCTS[id].map(p => ({ ...p, tags: g.tags[p.id] ?? [], isSenseible: p.id.startsWith('senseible') }));
}

const MARK_VALUE: Record<Mark, number> = { yes: 1, partly: 0.5, no: 0, unknown: 0 };
export const MARK_LABEL: Record<Mark, string> = { yes: 'Yes', partly: 'Partly', no: 'No', unknown: 'Not stated' };

/** Equal-weight count of criteria met (yes 1, partly 0.5). */
export function baseScore(g: Guide, p: Product): number {
  return g.criteria.reduce((s, c) => s + MARK_VALUE[p.caps[c.id]?.v ?? 'unknown'], 0);
}

/** True when the category's order comes from the research rank rather than a plain count. */
export function researchRanked(id: GuideId): boolean {
  return RAW_PRODUCTS[id].every(p => p.researchRank != null);
}

/** Default order: the research rank where the category has one, else criteria met. Ties keep list order. */
export function defaultOrder(g: Guide): Product[] {
  const list = productsFor(g.id);
  const ranked = list.every(p => p.researchRank != null);
  const pinned = (p: Product) => (g.pinLast?.includes(p.id) ? 1 : 0);
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (pinned(a.p) - pinned(b.p)) || (ranked
      ? (a.p.researchRank! - b.p.researchRank!)
      : (baseScore(g, b.p) - baseScore(g, a.p)) || (a.i - b.i)))
    .map(x => x.p);
}

export interface Fit {
  product: Product;
  /** 0 to 1 against the situation's weights. */
  fit: number;
  reasons: string[];
  gaps: string[];
}

/** Scores every product for a situation; reasons and gaps are built from the same marks the table shows. */
export function rankFor(g: Guide, situationId: string | null): Fit[] {
  const base = defaultOrder(g);
  const s = g.situations.find(x => x.id === situationId);
  if (!s) return base.map(product => ({ product, fit: baseScore(g, product) / g.criteria.length, reasons: [], gaps: [] }));
  const max = Object.values(s.weights).reduce((a, b) => a + b, 0);
  const crit = Object.fromEntries(g.criteria.map(c => [c.id, c]));
  const fits = base.map((product, i) => {
    let score = 0;
    let tagHit = false;
    const hits: { w: number; text: string }[] = [];
    const misses: { w: number; text: string }[] = [];
    for (const [key, w] of Object.entries(s.weights)) {
      if (key.startsWith('tag:')) {
        const tag = key.slice(4);
        if (product.tags.includes(tag)) { score += w; tagHit = true; hits.push({ w, text: g.tagLabels[tag] }); }
        continue;
      }
      const cap = product.caps[key];
      const m = cap?.v ?? 'unknown';
      score += w * MARK_VALUE[m];
      if (m === 'yes' || m === 'partly') hits.push({ w: w * MARK_VALUE[m], text: cap?.note ? `${crit[key].short}: ${cap.note}` : `${crit[key].short}: ${MARK_LABEL[m].toLowerCase()}` });
      else if (w >= 2) misses.push({ w, text: `${crit[key].short}: ${m === 'no' ? 'not offered' : 'not stated on its site'}` });
    }
    hits.sort((a, b) => b.w - a.w);
    misses.sort((a, b) => b.w - a.w);
    const sink = g.pinLast?.includes(product.id) && !tagHit ? 1 : 0;
    return { product, fit: max ? score / max : 0, reasons: hits.slice(0, 2).map(h => h.text), gaps: misses.slice(0, 1).map(m => m.text), i, sink };
  });
  return fits
    .sort((a, b) => (a.sink - b.sink) || (b.fit - a.fit) || (a.i - b.i))
    .map(({ i: _i, sink: _s, ...f }) => f);
}

/** One answer per situation question, worked out from the same ranking the page shows. */
export function quickAnswers(g: Guide): { question: string; answer: string }[] {
  return g.situations.filter(s => s.q).map(s => {
    const [first, ...rest] = rankFor(g, s.id).slice(0, 3);
    const then = rest.length ? `, then ${rest.map(f => f.product.name).join(' and ')}` : '';
    const why = first.reasons[0] ? ` Why ${first.product.name}: ${reasonText(first.reasons[0])}.` : '';
    return { question: s.q!, answer: `On this guide’s checks, the best fit is ${first.product.name}${then}.${why}` };
  });
}

/** "BRSR Core: yes" reads as "covers BRSR Core"; a note keeps its first sentence. */
function reasonText(r: string): string {
  const m = r.match(/^(.+?): (yes|partly)$/i);
  if (m) return `${m[2].toLowerCase() === 'yes' ? 'covers' : 'partly covers'} ${keepCase(m[1])}`;
  const note = r.includes(': ') ? r.slice(r.indexOf(': ') + 2) : r;
  const first = note.split(/(?<=[a-z0-9)])\. |; /)[0].replace(/\.$/, '');
  return keepCase(first);
}

/** Lower-cases a leading word unless it is an acronym or a name. */
function keepCase(t: string): string {
  const w = t.split(/[\s:]/)[0];
  if (w.length > 1 && w.slice(0, 2) === w.slice(0, 2).toUpperCase()) return t;
  if (/^(Indian|India|Scope|Senseible|EU|SBTi)\b/.test(t)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Latest date any source in the guide was seen, as YYYY-MM-DD. */
export function lastChecked(id: GuideId): string {
  return RAW_PRODUCTS[id].flatMap(p => p.sources.map(s => s.seen)).sort().at(-1) ?? '';
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[m - 1]} ${y}`;
}

/** ItemList structured data: only the products actually listed, in default order. */
export function itemListLd(g: Guide, canonical: (path: string) => string) {
  const list = defaultOrder(g);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: g.h1,
    url: canonical(g.path),
    numberOfItems: list.length,
    itemListElement: list.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      ...(p.site ? { url: p.site } : {}),
    })),
  };
}
