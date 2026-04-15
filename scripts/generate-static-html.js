/**
 * Build-time Static HTML Generator for SEO
 * 
 * Generates individual HTML files for each public route with correct
 * meta tags, structured data, and FULL semantic content embedded in
 * noscript blocks. This solves the SPA indexing problem.
 * 
 * Run after `vite build`: node scripts/generate-static-html.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const SITE_URL = 'https://senseible.earth';

// Solution page content for noscript rendering
const solutionContent = {
  cbam: {
    intro: 'The EU Carbon Border Adjustment Mechanism (CBAM) requires importers to report and pay for embedded carbon in goods imported into the EU.',
    steps: ['Map CBAM-covered products by CN codes', 'Calculate embedded Scope 1+2 emissions per tonne', 'Prepare quarterly CBAM declarations', 'Estimate financial exposure from 2026-2034', 'Implement reduction strategies'],
    urgency: 'CBAM financial obligations are active since January 2026. Every quarter of delay means higher default values applied to your exports.'
  },
  scope3: {
    intro: 'Scope 3 emissions typically represent 65-90% of total carbon footprint but remain unmeasured for most MSMEs.',
    steps: ['Map your complete value chain', 'Collect supplier invoices and data', 'Apply country-specific emission factors', 'Generate GHG Protocol-compliant reports'],
    urgency: 'EU CSDDD and CSRD require brands to report supply chain emissions. Suppliers without data risk losing contracts.'
  },
  'carbon-audit': {
    intro: 'A carbon audit establishes your baseline emissions from operational data — the first step to compliance, green finance, and carbon credits.',
    steps: ['Upload utility bills and fuel invoices', 'Auto-classify into Scope 1, 2, 3', 'Review data quality and trust scores', 'Download audit-ready compliance report'],
    urgency: 'BRSR value chain reporting is expanding. MSMEs in listed company supply chains must provide emission data.'
  },
  'green-finance': {
    intro: 'Green loans offer 2-7% lower interest rates, but 90% of MSMEs lack the verified emission data required for applications.',
    steps: ['Build verified carbon profile', 'Check eligibility against bank criteria', 'Generate TCFD/CDP-aligned disclosures', 'Apply with data — no manual reporting'],
    urgency: 'Green finance windows are time-limited. Banks allocate fixed annual budgets for sustainable lending.'
  }
};

const countryData = {
  'india': { grid: '0.708 kgCO₂/kWh', exports: '$120B to EU', msmes: '63 million' },
  'bangladesh': { grid: '0.623 kgCO₂/kWh', exports: '$47B garments', msmes: '7.8 million' },
  'indonesia': { grid: '0.761 kgCO₂/kWh', exports: '$20B to EU', msmes: '64 million' },
  'vietnam': { grid: '0.625 kgCO₂/kWh', exports: '$50B to EU', msmes: '5.4 million' },
  'philippines': { grid: '0.505 kgCO₂/kWh', exports: '$12B to EU', msmes: '1 million' },
  'pakistan': { grid: '0.454 kgCO₂/kWh', exports: '$8B to EU', msmes: '5.2 million' },
  'singapore': { grid: '0.408 kgCO₂/kWh', exports: '$15B to EU', msmes: '300K' },
  'thailand': { grid: '0.493 kgCO₂/kWh', exports: '$25B to EU', msmes: '3.1 million' },
  'malaysia': { grid: '0.585 kgCO₂/kWh', exports: '$30B to EU', msmes: '1.2 million' },
  'sri-lanka': { grid: '0.462 kgCO₂/kWh', exports: '$3B to EU', msmes: '1 million' },
};

// All public routes with their SEO metadata
const routes = [
  {
    path: '/',
    title: 'Senseible — AI Carbon MRV & Climate Finance for MSMEs | senseible.earth',
    description: "India's first AI carbon layer. Turn invoices into verified Scope 1, 2, 3 emissions, carbon credits & green loan eligibility in under 47 seconds. Built for MSMEs, trusted by exporters.",
    keywords: 'carbon credits, carbon accounting, carbon MRV, MSME carbon, climate finance, green loans, CBAM compliance',
    noscriptContent: `<h1>Senseible — AI Carbon MRV & Climate Finance for MSMEs</h1>
      <p>Turn invoices into verified Scope 1, 2, 3 emissions, carbon credits, and green loan eligibility in under 47 seconds. India's first AI-powered carbon layer built for MSMEs and trusted by exporters.</p>
      <h2>What Senseible Does</h2>
      <ul><li>Upload any invoice → get verified emission data instantly</li><li>CBAM compliance for EU-bound exports</li><li>Carbon credit monetization from verified reductions</li><li>Green loan eligibility with auto-generated disclosures</li></ul>
      <h2>Tools</h2>
      <ul><li><a href="${SITE_URL}/cbam-calculator">CBAM Cost Calculator</a> — Free EU carbon border tax estimator</li><li><a href="${SITE_URL}/net-zero">Net-Zero Goal Engine</a> — Build your decarbonization roadmap</li></ul>
      <h2>Industries</h2>
      <ul><li><a href="${SITE_URL}/industries/steel">Steel Manufacturing</a></li><li><a href="${SITE_URL}/industries/textile">Textile & Apparel</a></li><li><a href="${SITE_URL}/industries/chemical">Chemical Industry</a></li><li><a href="${SITE_URL}/industries/logistics">Logistics & Transport</a></li></ul>
      <h2>Countries Served</h2>
      <p>India, Bangladesh, Indonesia, Vietnam, Philippines, Pakistan, Thailand, Malaysia, Singapore, Sri Lanka</p>`,
  },
  {
    path: '/about',
    title: 'About Senseible — AI Carbon Infrastructure for Emerging Markets',
    description: 'Senseible builds AI-powered carbon MRV infrastructure enabling MSMEs to convert operational data into verified carbon outcomes across India and the EU.',
    keywords: 'about senseible, carbon infrastructure, MSME sustainability, climate tech India',
  },
  {
    path: '/mission',
    title: 'Our Mission — Making Carbon Accounting Accessible for Every MSME',
    description: 'Senseible is on a mission to democratize carbon accounting for 400 million MSMEs. Infrastructure-grade MRV starting with India.',
    keywords: 'carbon mission, MSME decarbonization, climate finance access',
  },
  {
    path: '/principles',
    title: 'Our Principles — Deterministic, Transparent Carbon Science',
    description: 'Senseible operates on deterministic math, not AI guesses. Every emission number is traceable to source invoices with fixed factors.',
    keywords: 'carbon principles, deterministic MRV, transparent carbon accounting',
  },
  {
    path: '/pricing',
    title: 'Pricing — Carbon MRV Plans for MSMEs | Senseible',
    description: 'Start free with Snapshot tier. Upgrade to Lens or Pulse for unlimited invoices, compliance reports, and carbon credit monetization.',
    keywords: 'carbon accounting pricing, MSME carbon plans, green finance pricing',
  },
  {
    path: '/cbam-calculator',
    title: 'CBAM Calculator — EU Carbon Border Tax Cost Estimator | Senseible',
    description: 'Free CBAM cost estimator for EU importers. Calculate carbon border tax exposure for steel, aluminium, cement, fertilizers from India. 2026-2034 projections.',
    keywords: 'CBAM calculator, CBAM cost estimator, EU carbon border tax, CBAM India',
    noscriptContent: `<h1>CBAM Calculator — EU Carbon Border Tax Cost Estimator</h1>
      <p>Free tool to calculate your EU Carbon Border Adjustment Mechanism (CBAM) exposure. Covers steel, aluminium, cement, fertilizers, and hydrogen exports.</p>
      <h2>How It Works</h2>
      <ol><li>Select your sector and production route</li><li>Enter annual export tonnage</li><li>Choose your country (grid factor auto-applied)</li><li>Get year-by-year cost projections from 2026 to 2034</li></ol>
      <h2>CBAM Phase-In Schedule</h2>
      <p>2026: 2.5% | 2027: 5% | 2028: 10% | 2029: 22.5% | 2030: 48.5% | 2031: 61% | 2032: 73.5% | 2033: 86% | 2034: 100%</p>
      <h2>Related</h2>
      <ul><li><a href="${SITE_URL}/solutions/cbam-steel-india">CBAM for Indian Steel</a></li><li><a href="${SITE_URL}/solutions/cbam-chemicals-india">CBAM for Indian Chemicals</a></li><li><a href="${SITE_URL}/climate-intelligence/cbam-compliance-indian-exporters">CBAM Compliance Guide</a></li></ul>`,
  },
  {
    path: '/net-zero',
    title: 'Net-Zero Goal Engine — MSME Decarbonization Roadmap | Senseible',
    description: 'Build your net-zero roadmap in 5 steps. Set science-based targets, get reduction strategies, and track real progress. Built for MSMEs.',
    keywords: 'net zero MSME, MSME decarbonization, net zero roadmap India, SBTi MSME',
  },
  {
    path: '/contact',
    title: 'Contact Senseible — Get Help with Carbon Accounting',
    description: 'Reach out for partnerships, enterprise queries, or support. Based in Gurugram, serving MSMEs across India and the EU.',
    keywords: 'contact senseible, carbon accounting support, climate finance help',
  },
  {
    path: '/carbon-credits',
    title: 'Carbon Credits for MSMEs — Monetize Your Emissions Data | Senseible',
    description: 'Learn how MSMEs can earn carbon credits from verified emission reductions. Invoice-based MRV to monetization in under 47 seconds.',
    keywords: 'carbon credits MSME, voluntary carbon market, carbon monetization India',
  },
  {
    path: '/climate-finance',
    title: 'Climate Finance for MSMEs — Green Loans & Carbon Revenue | Senseible',
    description: 'Access green loans, carbon credits, and ESG compliance tools. Senseible converts your emission data into climate finance signals.',
    keywords: 'climate finance MSME, green loans India, SIDBI green loan, ESG lending',
  },
  {
    path: '/partners',
    title: 'Partner with Senseible — Banks, Auditors & Carbon Buyers',
    description: 'Join the Senseible partner ecosystem. Access verified MSME carbon data for lending decisions, audits, and carbon credit purchases.',
    keywords: 'carbon partner program, ESG data partners, green finance partners',
  },
  {
    path: '/grants',
    title: 'Grants & Funding for Climate Startups | Senseible',
    description: 'Apply for climate grants and early-stage funding. Senseible supports climate-tech innovation in emerging markets.',
    keywords: 'climate grants, startup funding, climate tech grants India',
  },
  {
    path: '/climate-intelligence',
    title: 'Climate Intelligence — Carbon Knowledge Hub | Senseible',
    description: 'Expert guides on carbon accounting, CBAM compliance, green loans, and emission reduction for MSMEs. Trusted by Indian exporters.',
    keywords: 'climate intelligence, carbon knowledge, CBAM guide, BRSR reporting guide',
    noscriptContent: `<h1>Climate Intelligence — Carbon Knowledge Hub</h1>
      <p>Expert guides on carbon accounting, CBAM compliance, green loans, and emission reduction for MSMEs across India and emerging markets.</p>
      <h2>Popular Guides</h2>
      <ul>
        <li><a href="${SITE_URL}/climate-intelligence/cbam-compliance-indian-exporters">CBAM Compliance for Indian Exporters</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/how-to-file-eu-carbon-tax-report-msme-guide">How to File EU Carbon Tax Report</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/carbon-audit-small-business-india-complete-guide">Carbon Audit for Small Business India</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/scope-3-emissions-supply-chain-msme-calculator">Scope 3 Calculator Guide</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/brsr-reporting-msme-india-simplified-guide">BRSR Reporting Simplified</a></li>
      </ul>
      <h2>Country Guides</h2>
      <ul>
        <li><a href="${SITE_URL}/climate-intelligence/scope-3-calculator-bangladesh-textile-exporters">Bangladesh Textile Scope 3</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/indonesia-manufacturing-scope-2-electricity-emissions">Indonesia Manufacturing Scope 2</a></li>
        <li><a href="${SITE_URL}/climate-intelligence/vietnam-textile-carbon-footprint-eu-buyers">Vietnam Textile Carbon Footprint</a></li>
      </ul>`,
  },
  {
    path: '/industries',
    title: 'Industries — Carbon Accounting by Sector | Senseible',
    description: 'Sector-specific carbon MRV for textile, steel, automotive, pharmaceutical, logistics, and chemical industries. Tailored emission factors for India.',
    keywords: 'industry carbon accounting, sector emissions, manufacturing carbon footprint',
    noscriptContent: `<h1>Industries — Carbon Accounting by Sector</h1>
      <p>Sector-specific carbon MRV with tailored emission factors, compliance steps, and reduction strategies.</p>
      <ul>
        <li><a href="${SITE_URL}/industries/textile">Textile Manufacturing</a> — Scope 1-3 for garment exporters</li>
        <li><a href="${SITE_URL}/industries/steel">Steel & Metal</a> — CBAM-ready emission intensity</li>
        <li><a href="${SITE_URL}/industries/chemical">Chemical Industry</a> — Fertilizer and ammonia CBAM</li>
        <li><a href="${SITE_URL}/industries/logistics">Logistics & Transport</a> — Fleet emission measurement</li>
        <li><a href="${SITE_URL}/industries/automobile">Automotive</a> — Supply chain carbon for OEMs</li>
        <li><a href="${SITE_URL}/industries/construction">Construction</a> — Embodied carbon in materials</li>
      </ul>`,
  },
  {
    path: '/legal',
    title: 'Legal — Terms of Service & Privacy Policy | Senseible',
    description: 'Read our terms of service, privacy policy, and data handling practices. Senseible is committed to data security and transparency.',
    keywords: 'terms of service, privacy policy, data handling',
  },
  // Industry sub-pages
  ...['textile', 'steel', 'automotive', 'pharmaceutical', 'logistics', 'chemical'].map(industry => ({
    path: `/industries/${industry}`,
    title: `${industry.charAt(0).toUpperCase() + industry.slice(1)} Carbon Accounting — Senseible`,
    description: `Carbon MRV for ${industry} manufacturers. Track Scope 1, 2, 3 emissions with invoice-based verification tailored for India's ${industry} sector.`,
    keywords: `${industry} carbon accounting, ${industry} emissions India, ${industry} CBAM compliance`,
    noscriptContent: `<h1>${industry.charAt(0).toUpperCase() + industry.slice(1)} Carbon Accounting</h1>
      <p>Track Scope 1, 2, 3 emissions for ${industry} manufacturers with invoice-based verification. Country-specific emission factors for India and emerging markets.</p>
      <h2>Related Solutions</h2>
      <ul>
        <li><a href="${SITE_URL}/solutions/cbam-${industry === 'chemical' ? 'chemicals' : industry}-india">CBAM Compliance for ${industry.charAt(0).toUpperCase() + industry.slice(1)} in India</a></li>
        <li><a href="${SITE_URL}/solutions/scope3-${industry === 'chemical' ? 'chemicals' : industry}-india">Scope 3 Calculator for ${industry.charAt(0).toUpperCase() + industry.slice(1)}</a></li>
      </ul>
      <p><a href="${SITE_URL}/cbam-calculator">Use the free CBAM Calculator</a> | <a href="${SITE_URL}">Start your carbon audit</a></p>`,
  })),
  // CMS articles
  ...getCMSArticleSlugs().map(slug => ({
    path: `/climate-intelligence/${slug}`,
    title: `${slugToTitle(slug)} | Senseible Climate Intelligence`,
    description: `Expert analysis on ${slugToTitle(slug).toLowerCase()}. Trusted carbon knowledge for MSMEs and exporters.`,
    keywords: slug.replace(/-/g, ', '),
  })),
  // Competitor comparison pages
  ...getCompetitorSlugs().map(slug => ({
    path: `/vs/${slug}`,
    title: `Senseible vs ${slugToTitle(slug)} — Carbon MRV Comparison`,
    description: `Compare Senseible with ${slugToTitle(slug)} for carbon accounting, MRV, and climate finance. See which platform is best for MSMEs.`,
    keywords: `senseible vs ${slug}, carbon accounting comparison, ${slug} alternative`,
  })),
  // Solution pages with full semantic content
  ...getSolutionSlugs().map(slug => {
    const parts = slug.split('-');
    const countryRaw = parts[parts.length - 1];
    const country = countryData[countryRaw] || { grid: 'N/A', exports: 'N/A', msmes: 'N/A' };
    const countryName = countryRaw.charAt(0).toUpperCase() + countryRaw.slice(1);
    
    // Determine regulation type
    let regulation = 'carbon-audit';
    if (slug.startsWith('cbam-')) regulation = 'cbam';
    else if (slug.startsWith('scope3-')) regulation = 'scope3';
    else if (slug.startsWith('green-finance-')) regulation = 'green-finance';
    
    const content = solutionContent[regulation];
    const sectorRaw = slug.replace(/^(cbam|scope3|carbon-audit|green-finance)-/, '').replace(/-[^-]+$/, '');
    const sectorName = slugToTitle(sectorRaw);

    return {
      path: `/solutions/${slug}`,
      title: `${slugToTitle(regulation)} for ${sectorName} in ${countryName} — Senseible`,
      description: `Carbon compliance solution for ${sectorName.toLowerCase()} in ${countryName}. Free tools, compliance steps, and cost breakdown. Grid factor: ${country.grid}.`,
      keywords: `${slugToTitle(regulation)} ${countryName}, ${sectorName} carbon ${countryName}, carbon compliance ${countryName}`,
      noscriptContent: `<article>
        <h1>${slugToTitle(regulation)} for ${sectorName} in ${countryName}</h1>
        <p>${content.intro}</p>
        <p><strong>Country data:</strong> Grid factor ${country.grid} | Exports ${country.exports} | MSMEs ${country.msmes}</p>
        <p><strong>${content.urgency}</strong></p>
        <h2>Compliance Steps</h2>
        <ol>${content.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <h2>Free Tools</h2>
        <ul>
          <li><a href="${SITE_URL}/cbam-calculator">CBAM Cost Calculator</a></li>
          <li><a href="${SITE_URL}">Upload invoices for instant Scope 1+2+3 calculation</a></li>
          <li><a href="${SITE_URL}/net-zero">Net-Zero Goal Engine</a></li>
        </ul>
        <h2>Related Solutions</h2>
        <ul>
          <li><a href="${SITE_URL}/industries">Industry-specific guides</a></li>
          <li><a href="${SITE_URL}/climate-intelligence">Climate Intelligence Knowledge Hub</a></li>
          <li><a href="${SITE_URL}/climate-finance">Green Finance Eligibility</a></li>
        </ul>
      </article>`,
    };
  }),
];

function getCMSArticleSlugs() {
  return [
    'how-to-trace-emission-data-to-source',
    'maintain-historical-carbon-data-methodology-changes',
    'ghg-gases-warming-impact-beyond-co2',
    'methane-black-carbon-reductions-vs-co2',
    'emissions-data-hidden-in-semi-finished-imports',
    'reroute-supply-chains-reduce-cbam-exposure',
    'manufacturing-scope-1-emissions-india',
    'manufacturing-scope-2-emissions-india',
    'manufacturing-scope-3-emissions-india',
    'cbam-compliance-indian-exporters',
    'agriculture-scope-1-emissions-india',
    'logistics-scope-1-emissions-india',
    'carbon-credit-types-voluntary-markets',
    'brsr-reporting-requirements-india',
    'emission-factors-selection-guidance',
    'what-is-carbon-mrv-and-why-msmes-need-it-2026',
    'how-to-get-green-loans-india-carbon-data',
    'eu-cbam-explained-emerging-market-exporters',
    'scope-1-2-3-emissions-simple-guide-small-business',
    'what-is-senseible-different-from-sensibull',
    'how-to-calculate-carbon-footprint-electricity-bills',
    'brazil-cbio-india-ccts-comparing-carbon-markets',
    'green-finance-textile-exporters-step-by-step',
    'documents-needed-carbon-verification',
    'brsr-reporting-small-manufacturer-preparation',
    'carbon-credits-solar-installations-monetize',
    'steel-aluminum-exporters-cbam-compliance-checklist',
    '136-billion-india-eu-fta-msme-breakthrough',
    'survival-of-the-greenest-cbam-litmus-test',
    'trading-air-for-assets-india-carbon-markets-eu-price',
    'mother-of-all-deals-india-eu-msmes',
    'great-diversification-india-eu-strategic-shield-tariff-wars',
    'why-every-invoice-needs-trust-score',
    'proof-graph-how-carbon-value-calculated',
    'auto-validation-catches-gaps-before-submit',
    'dynamic-benchmarking-400m-msmes',
    'confidence-bands-beat-false-precision',
    'see-carbon-revenue-before-verify',
    'one-click-audit-trails-investors-need',
    'dispute-simulation-auditor-challenge',
    'manual-entry-carbon-data-error-source',
    'greenwashing-flags-explainable-not-just-high-risk',
    'trust-score-replaces-pass-fail-63m-msmes',
    'proof-graphs-black-box-ai-carbon-trust',
    'pre-submission-validation-cuts-rejection-40-percent',
    'sector-benchmarking-context-raw-data-decisions',
    'confidence-bands-honest-mrv-approach',
    'real-time-revenue-preview-mrv-to-money',
    'one-click-audit-trails-save-200-hours',
    'dispute-simulation-prepare-auditor-challenges',
    'manual-data-entry-source-carbon-fraud-risk',
    'explainable-greenwashing-flags-transparency',
    // Country-specific SEO articles
    'cbam-compliance-cost-india-steel-chemicals-2026',
    'scope-3-calculator-bangladesh-textile-exporters',
    'eu-carbon-border-tax-impact-indonesian-chemical-exports',
    'carbon-audit-philippine-manufacturing-food-processing',
    'green-finance-pakistan-textile-msme-access',
    'carbon-reporting-singapore-msme-compliance',
    'vietnam-garment-exporters-scope-3-eu-compliance',
    'thailand-food-processing-carbon-footprint-reduction',
    'msme-carbon-credits-sri-lanka-invoice-to-revenue',
    'malaysia-palm-oil-scope-1-2-3-emission-breakdown',
    'how-to-file-eu-carbon-tax-report-msme-guide',
    'export-carbon-reporting-eu-msme-emerging-markets',
    'carbon-audit-small-business-india-complete-guide',
    'scope-3-emissions-supply-chain-msme-calculator',
    'brsr-reporting-msme-india-simplified-guide',
    'indonesia-manufacturing-scope-2-electricity-emissions',
    'india-textile-exporters-cbam-eu-compliance-2026',
    'bangladesh-manufacturing-green-finance-access-guide',
    'logistics-scope-1-emissions-india-fleet-measurement',
    'philippines-food-processing-carbon-measurement-guide',
    'cbam-cost-calculator-indian-steel-msme-2026',
    'vietnam-textile-carbon-footprint-eu-buyers',
    'thailand-automotive-supply-chain-carbon-measurement',
    'pakistan-leather-industry-carbon-audit-eu-compliance',
    'singapore-supply-chain-carbon-transparency-guide',
    'malaysia-electrical-electronics-scope-2-carbon-guide',
  ];
}

function getCompetitorSlugs() {
  return [
    'sensibull', 'microsoft-sustainability-cloud', 'salesforce-net-zero-cloud',
    'ibm-envizi', 'persefoni', 'watershed', 'sweep', 'plan-a', 'normative',
    'greenly', 'sinai-technologies', 'sphera', 'sylvera', 'verra',
    'gold-standard', 'esgi-india', 'updapt-esg', 'dcarbonize', 'climes', 'zeroboard',
  ];
}

function getSolutionSlugs() {
  return [
    'cbam-steel-india','cbam-textile-india','scope3-steel-india','cbam-chemicals-india',
    'scope3-textile-india','carbon-audit-manufacturing-india','green-finance-textile-india',
    'scope3-chemicals-india','scope3-textile-bangladesh','cbam-textile-bangladesh',
    'carbon-audit-manufacturing-bangladesh','green-finance-textile-bangladesh',
    'cbam-steel-indonesia','cbam-chemicals-indonesia','carbon-audit-manufacturing-indonesia',
    'scope3-food-processing-indonesia','green-finance-manufacturing-indonesia',
    'carbon-audit-manufacturing-philippines','scope3-food-processing-philippines',
    'green-finance-manufacturing-philippines','carbon-audit-logistics-philippines',
    'scope3-textile-pakistan','green-finance-manufacturing-pakistan',
    'carbon-audit-textile-pakistan','scope3-food-processing-pakistan',
    'carbon-audit-manufacturing-singapore','scope3-chemicals-singapore',
    'carbon-audit-logistics-singapore','green-finance-manufacturing-singapore',
    'cbam-steel-vietnam','scope3-textile-vietnam','carbon-audit-manufacturing-vietnam',
    'scope3-food-processing-vietnam','scope3-food-processing-thailand',
    'carbon-audit-manufacturing-thailand','cbam-chemicals-thailand',
    'green-finance-manufacturing-thailand','scope3-food-processing-malaysia',
    'carbon-audit-manufacturing-malaysia','green-finance-manufacturing-malaysia',
    'scope3-chemicals-malaysia','scope3-textile-sri-lanka',
    'carbon-audit-manufacturing-sri-lanka','green-finance-manufacturing-sri-lanka',
    'scope3-food-processing-sri-lanka','green-finance-manufacturing-india',
    'green-finance-manufacturing-vietnam','cbam-steel-bangladesh',
    'scope3-textile-indonesia','cbam-chemicals-vietnam','scope3-textile-thailand',
    'cbam-steel-malaysia','scope3-manufacturing-philippines','cbam-steel-pakistan',
    'green-finance-textile-sri-lanka','green-finance-manufacturing-bangladesh',
    'carbon-audit-logistics-india','scope3-food-processing-india',
  ];
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateHTML(route, templateHTML) {
  const fullUrl = `${SITE_URL}${route.path}`;
  
  let html = templateHTML.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHTML(route.title)}</title>`
  );
  
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHTML(route.description)}">`
  );
  
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeHTML(route.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeHTML(route.description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${fullUrl}" />`
  );
  
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeHTML(route.title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeHTML(route.description)}" />`
  );
  
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${fullUrl}" />`
  );
  
  html = html.replace(
    /<link rel="alternate" hreflang="en-in" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="en-in" href="${fullUrl}" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="x-default" href="${fullUrl}" />`
  );
  
  // Full semantic noscript content
  const noscript = route.noscriptContent
    ? `<noscript><div style="padding:2rem;max-width:900px;margin:0 auto;font-family:system-ui,sans-serif;line-height:1.6">${route.noscriptContent}<hr/><p style="font-size:0.85em;color:#666">© Senseible | <a href="${SITE_URL}">senseible.earth</a> | <a href="${SITE_URL}/contact">Contact</a> | <a href="${SITE_URL}/pricing">Pricing</a></p></div></noscript>`
    : `<noscript><div style="padding:2rem;max-width:800px;margin:0 auto"><h1>${escapeHTML(route.title)}</h1><p>${escapeHTML(route.description)}</p><p><a href="${SITE_URL}">Visit senseible.earth</a> | <a href="${SITE_URL}/cbam-calculator">CBAM Calculator</a> | <a href="${SITE_URL}/climate-intelligence">Knowledge Hub</a></p></div></noscript>`;
  
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>${noscript}`
  );
  
  return html;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function main() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('Error: dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }
  
  const templateHTML = fs.readFileSync(indexPath, 'utf-8');
  let generated = 0;
  
  for (const route of routes) {
    if (route.path === '/') continue;
    
    const dirPath = path.join(DIST_DIR, route.path);
    const filePath = path.join(dirPath, 'index.html');
    
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, generateHTML(route, templateHTML));
    generated++;
  }
  
  const homeRoute = routes.find(r => r.path === '/');
  if (homeRoute) {
    fs.writeFileSync(indexPath, generateHTML(homeRoute, templateHTML));
  }
  
  console.log(`✅ Generated ${generated} static HTML files for SEO pre-rendering`);
  console.log(`📊 Routes: ${getCMSArticleSlugs().length} articles, ${getSolutionSlugs().length} solutions, ${getCompetitorSlugs().length} competitors, 6 industries`);
}

main();
