// Footer grouping for the service pages: three jobs a visitor arrives with.
// Every service keeps its own crawlable link and anchor text (from ./nav);
// tests/footer-groups.test.ts checks each service appears exactly once.
export const serviceFooterGroups: { label: string; tone: 'primary' | 'accent' | 'warning'; slugs: string[] }[] = [
  { label: 'Measure', tone: 'primary', slugs: ['carbon-accounting', 'esg-reporting', 'esg-data-management', 'esg-ratings'] },
  { label: 'Supply chain', tone: 'accent', slugs: ['supplier-due-diligence', 'product-compliance', 'circular-economy', 'ehs-social'] },
  { label: 'Plan and fund', tone: 'warning', slugs: ['decarbonization', 'climate-risk', 'green-finance'] },
];
