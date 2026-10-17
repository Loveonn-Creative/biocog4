// Pages that carry verified figures, regulatory statements, prices or legal
// terms. Per AGENTS.md they serve only reviewed static language bundles and
// fall back to English; runtime machine translation never runs here.
export const SENSITIVE_PREFIXES = [
  '/verify', '/reports', '/mrv-dashboard', '/dashboard', '/history', '/monetize',
  '/cbam-calculator', '/calculators', '/net-zero', '/trust', '/legal', '/pricing',
  '/billing', '/subscription', '/climate-intelligence', '/solutions', '/intelligence',
  '/carbon-credits', '/climate-finance', '/marketplace', '/partner-marketplace', '/enterprise',
  // Service lead pages carry regulatory statements and prices.
  '/carbon-accounting', '/esg-reporting', '/supplier-due-diligence', '/decarbonization', '/circular-economy',
  '/climate-risk', '/esg-data-management', '/ehs-social', '/product-compliance', '/esg-ratings', '/green-finance',
];

export function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}
