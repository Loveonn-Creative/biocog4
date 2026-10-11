// Retired Climate Intelligence URLs and where they now live. Lovable hosting
// cannot send HTTP 301s, so each old URL gets a prerendered page with an
// instant meta refresh and a canonical to the target (treated by search
// engines as a permanent redirect), and the app redirects client-side.
// Never delete an entry: old links and bookmarks keep working through it.
import { trustSafeguards } from './trustSafeguards';

export const articleRedirects: Record<string, string> = {
  // Near-duplicate guides merged into the stronger URL.
  'logistics-scope-1-emissions-india-fleet-measurement': '/climate-intelligence/logistics-scope-1-emissions-india',
  'cbam-cost-calculator-indian-steel-msme-2026': '/climate-intelligence/cbam-compliance-cost-indian-steel-exporters-2026-2034',
  'brsr-reporting-small-manufacturer-preparation': '/climate-intelligence/brsr-reporting-requirements-india',
  'brsr-reporting-msme-india-simplified-guide': '/climate-intelligence/brsr-reporting-requirements-india',
  'export-carbon-reporting-eu-msme-emerging-markets': '/climate-intelligence/eu-cbam-explained-emerging-market-exporters',
  // Product-feature pieces folded into /trust.
  ...Object.fromEntries(trustSafeguards.flatMap(s => s.replaces.map(slug => [slug, `/trust#${s.id}`]))),
};
