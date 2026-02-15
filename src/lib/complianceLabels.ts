export interface ComplianceLabel {
  framework: string;
  label: string;
  region: 'india' | 'global';
}

const INDIA_LABELS: Record<string, ComplianceLabel[]> = {
  fuel: [
    { framework: 'CPCB', label: 'Scope 1 — Direct Combustion', region: 'india' },
    { framework: 'BRSR', label: 'Principle 6 — GHG Emissions', region: 'india' },
  ],
  electricity: [
    { framework: 'CPCB', label: 'Scope 2 — Grid Electricity', region: 'india' },
    { framework: 'BRSR', label: 'Principle 6 — Energy Indirect', region: 'india' },
  ],
  transport: [
    { framework: 'BRSR', label: 'Scope 3 — Upstream Transport', region: 'india' },
  ],
  materials: [
    { framework: 'BRSR', label: 'Scope 3 — Purchased Goods', region: 'india' },
    { framework: 'GSTIN-HSN', label: 'HSN-Classified Material', region: 'india' },
  ],
  waste: [
    { framework: 'CPCB', label: 'Scope 3 — Waste Disposal', region: 'india' },
  ],
  cloud: [
    { framework: 'BRSR', label: 'Scope 3 — Purchased Services', region: 'india' },
  ],
  software: [
    { framework: 'BRSR', label: 'Scope 3 — Purchased Services', region: 'india' },
  ],
  it_hardware: [
    { framework: 'BRSR', label: 'Scope 3 — Capital Goods', region: 'india' },
    { framework: 'GSTIN-HSN', label: 'HSN 84/85 — IT Equipment', region: 'india' },
  ],
  services: [
    { framework: 'BRSR', label: 'Scope 3 — Professional Services', region: 'india' },
    { framework: 'GSTIN-HSN', label: 'HSN 99 — Services', region: 'india' },
  ],
  travel: [
    { framework: 'BRSR', label: 'Scope 3 — Business Travel', region: 'india' },
  ],
};

const GLOBAL_LABELS: Record<string, ComplianceLabel[]> = {
  fuel: [
    { framework: 'GHG Protocol', label: 'Category — Direct Emissions (Scope 1)', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 1 — Direct GHG Emissions', region: 'global' },
  ],
  electricity: [
    { framework: 'GHG Protocol', label: 'Category — Energy Indirect (Scope 2)', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 2 — Indirect from Energy', region: 'global' },
  ],
  transport: [
    { framework: 'GHG Protocol', label: 'Category 4 — Upstream Transport', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 4 — Transport Emissions', region: 'global' },
  ],
  materials: [
    { framework: 'GHG Protocol', label: 'Category 1 — Purchased Goods', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 3 — Indirect from Transport', region: 'global' },
  ],
  waste: [
    { framework: 'GHG Protocol', label: 'Category 5 — Waste in Operations', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 5 — Waste Disposal', region: 'global' },
  ],
  cloud: [
    { framework: 'GHG Protocol', label: 'Category 1 — Purchased Services', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 3 — Other Indirect', region: 'global' },
  ],
  software: [
    { framework: 'GHG Protocol', label: 'Category 1 — Purchased Services', region: 'global' },
  ],
  it_hardware: [
    { framework: 'GHG Protocol', label: 'Category 2 — Capital Goods', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 3 — Capital Goods', region: 'global' },
  ],
  services: [
    { framework: 'GHG Protocol', label: 'Category 1 — Purchased Services', region: 'global' },
  ],
  travel: [
    { framework: 'GHG Protocol', label: 'Category 6 — Business Travel', region: 'global' },
    { framework: 'ISO 14064-1', label: 'Category 4 — Business Travel', region: 'global' },
  ],
};

export function getComplianceLabels(scope: number, category: string): ComplianceLabel[] {
  const key = category.toLowerCase();
  const india = INDIA_LABELS[key] || [];
  const global = GLOBAL_LABELS[key] || [];
  return [...india, ...global];
}

export function getScopeComplianceLabels(scope: number): ComplianceLabel[] {
  const scopeMap: Record<number, ComplianceLabel[]> = {
    1: [
      { framework: 'GHG Protocol', label: 'Scope 1 — Direct Emissions', region: 'global' },
      { framework: 'CPCB', label: 'Direct Combustion', region: 'india' },
    ],
    2: [
      { framework: 'GHG Protocol', label: 'Scope 2 — Indirect from Energy', region: 'global' },
      { framework: 'CPCB', label: 'Grid Electricity', region: 'india' },
    ],
    3: [
      { framework: 'GHG Protocol', label: 'Scope 3 — Other Indirect', region: 'global' },
      { framework: 'BRSR', label: 'Value Chain Emissions', region: 'india' },
    ],
  };
  return scopeMap[scope] || [];
}
