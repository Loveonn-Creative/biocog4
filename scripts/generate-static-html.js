/**
 * Build-time Static HTML Generator for SEO
 * 
 * Generates individual HTML files for each public route with correct
 * meta tags, structured data, and content previews embedded in the
 * initial HTML response. This solves the SPA indexing problem without
 * requiring SSR or puppeteer.
 * 
 * Run after `vite build`: node scripts/generate-static-html.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const SITE_URL = 'https://senseible.earth';

// All public routes with their SEO metadata
const routes = [
  {
    path: '/',
    title: 'Senseible — AI Carbon MRV & Climate Finance for MSMEs | senseible.earth',
    description: "India's first AI carbon layer. Turn invoices into verified Scope 1, 2, 3 emissions, carbon credits & green loan eligibility in under 47 seconds. Built for MSMEs, trusted by exporters.",
    keywords: 'carbon credits, carbon accounting, carbon MRV, MSME carbon, climate finance, green loans, CBAM compliance',
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
  },
  {
    path: '/industries',
    title: 'Industries — Carbon Accounting by Sector | Senseible',
    description: 'Sector-specific carbon MRV for textile, steel, automotive, pharmaceutical, logistics, and chemical industries. Tailored emission factors for India.',
    keywords: 'industry carbon accounting, sector emissions, manufacturing carbon footprint',
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

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateHTML(route, templateHTML) {
  const fullUrl = `${SITE_URL}${route.path}`;
  
  // Replace title
  let html = templateHTML.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHTML(route.title)}</title>`
  );
  
  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHTML(route.description)}">`
  );
  
  // Replace OG tags
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
  
  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeHTML(route.title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeHTML(route.description)}" />`
  );
  
  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${fullUrl}" />`
  );
  
  // Replace hreflang
  html = html.replace(
    /<link rel="alternate" hreflang="en-in" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="en-in" href="${fullUrl}" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="x-default" href="${fullUrl}" />`
  );
  
  // Add a visible SEO content block (hidden from users but visible to crawlers)
  const seoContent = `
    <noscript>
      <div style="padding:2rem;max-width:800px;margin:0 auto;">
        <h1>${escapeHTML(route.title)}</h1>
        <p>${escapeHTML(route.description)}</p>
        <p>Visit <a href="${SITE_URL}">${SITE_URL}</a> to use the full platform.</p>
      </div>
    </noscript>`;
  
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>${seoContent}`
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

// Main execution
function main() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('Error: dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }
  
  const templateHTML = fs.readFileSync(indexPath, 'utf-8');
  let generated = 0;
  
  for (const route of routes) {
    if (route.path === '/') continue; // Skip root, already has index.html
    
    const dirPath = path.join(DIST_DIR, route.path);
    const filePath = path.join(dirPath, 'index.html');
    
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, generateHTML(route, templateHTML));
    generated++;
  }
  
  // Also update the root index.html with the homepage route
  const homeRoute = routes.find(r => r.path === '/');
  if (homeRoute) {
    fs.writeFileSync(indexPath, generateHTML(homeRoute, templateHTML));
  }
  
  console.log(`✅ Generated ${generated} static HTML files for SEO pre-rendering`);
  console.log(`📊 Routes covered: ${routes.length} (${getCMSArticleSlugs().length} articles, ${getCompetitorSlugs().length} competitor pages, 6 industries)`);
}

main();
