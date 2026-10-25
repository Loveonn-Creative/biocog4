// What /enterprise may say, and how sure we are. Every capability shown on the
// page comes from this list with its status, so the page cannot claim more
// than the code does. Statuses follow the October 2026 code audit:
//   live    = works end to end today
//   pilot   = partly built (UI or backend exists, not complete)
//   custom = built to an enterprise's requirements on demand, outside the standard service
// Change a status only when the code changes.

export type CapabilityStatus = 'live' | 'pilot' | 'custom';

export interface Capability {
  key: string;
  label: string;
  status: CapabilityStatus;
  note?: string;
}

export const ingestionChannels: Capability[] = [
  { key: 'docs', label: 'Invoices, bills and PDFs read by AI', status: 'live', note: 'Images and PDFs, one record per document' },
  { key: 'bulk', label: 'Bulk document upload', status: 'live', note: 'Up to 10 files per batch today' },
  { key: 'csv', label: 'CSV or spreadsheet import', status: 'custom' },
  { key: 'erp', label: 'ERP feeds (Tally, SAP, Oracle, Zoho)', status: 'custom' },
  { key: 'sftp', label: 'SFTP drop', status: 'custom' },
  { key: 'messaging', label: 'Documents by email or WhatsApp', status: 'custom' },
  { key: 'iot', label: 'Meters and sensors, where a supplier has them', status: 'custom' },
  { key: 'satellite', label: 'Satellite mapping of supplier sites and plots', status: 'custom', note: 'Site boundaries and change over time, where applicable' },
  { key: 'livefeed', label: 'Live feed from connected meters and systems', status: 'custom' },
  { key: 'api', label: 'API and webhooks', status: 'custom' },
];

/**
 * The full suite on /enterprise. Live = self-serve in the product today;
 * custom = delivered with Senseible analysts or built to the enterprise's
 * requirements. `to` is the service page that explains each in depth.
 */
export interface SuiteModule extends Capability {
  to: string;
  input: string;
  output: string;
}

export const suiteModules: SuiteModule[] = [
  { key: 'scope3', label: 'Scope 3 and supplier emissions', status: 'live', note: 'Documents to verified records today; supplier portal and roll-up are custom', to: '/scope-3-supplier-evidence', input: 'Supplier invoices, bills and spend', output: 'Verified Scope 3 records, tiered by data quality' },
  { key: 'pcf', label: 'Product carbon footprint (PCF)', status: 'live', note: 'Calculator per product; an ISO 14067 report needs HSN/CN coded evidence', to: '/calculators/product-carbon-footprint', input: 'Bill of materials, energy and freight per product', output: 'Cradle-to-gate kgCO2e per unit, by stage' },
  { key: 'lca', label: 'Life cycle assessment (LCA)', status: 'custom', note: 'Analyst-led study following the ISO 14040 and 14044 phases', to: '/carbon-accounting#tool', input: 'Product system, suppliers and use phase', output: 'Impact by life-cycle stage, with the study report' },
  { key: 'decarb', label: 'Decarbonisation strategy to net zero', status: 'live', note: 'Net-zero engine self-serve; science-based target setting with analysts is custom', to: '/net-zero', input: 'Your verified baseline and sector', output: 'Target, costed roadmap and tracked progress' },
  { key: 'dma', label: 'Double materiality assessment', status: 'custom', note: 'Analyst-led, structured on the ESRS topics for CSRD', to: '/esg-reporting#tool', input: 'Stakeholder input and your verified data', output: 'Impact and financial materiality matrix' },
  { key: 'reporting', label: 'Evidence-linked reporting', status: 'live', note: 'For one entity, labelled self-reported; portfolio roll-up is custom', to: '/esg-data-management#tool', input: 'The same verified records', output: 'Framework reports with the evidence trail' },
];

export const pipelineStages: Capability[] = [
  { key: 'invite', label: 'Invite', status: 'live', note: 'Supplier requests by email or GSTIN' },
  { key: 'collect', label: 'Collect', status: 'pilot', note: 'Documents today; other channels later' },
  { key: 'clean', label: 'Clean', status: 'live', note: 'Line items extracted and classified to Scope 1, 2 or 3' },
  { key: 'verify', label: 'Verify', status: 'live', note: 'Hash, factor, confidence score' },
  { key: 'report', label: 'Report', status: 'live', note: 'For one entity today; supplier roll-up later' },
];

export const scaleControls: Capability[] = [
  { key: 'tiering', label: 'Supplier tiering from your invoices', status: 'live', note: 'Primary, factor-derived or spend-only' },
  { key: 'quality', label: 'Data-quality view per supplier', status: 'pilot', note: 'Tier and named gaps; numeric score per document' },
  { key: 'exceptions', label: 'Exception queue for flagged records', status: 'pilot', note: 'Needs-review status today; queue and assignment later' },
  { key: 'waves', label: 'Onboarding in waves', status: 'custom' },
  { key: 'reminders', label: 'Supplier reminders', status: 'live', note: 'One click per supplier or all overdue' },
  { key: 'dedupe', label: 'Duplicate documents caught by hash', status: 'live' },
  { key: 'idempotent', label: 'Idempotent verification (no double counting)', status: 'live' },
  { key: 'queues', label: 'Large uploads queued and processed in order', status: 'custom' },
];

export const controlAndSecurity: Capability[] = [
  { key: 'isolation', label: 'Row-level isolation of every record', status: 'live', note: 'Per account today' },
  { key: 'consent', label: 'Supplier owns its record and consents per buyer', status: 'live' },
  { key: 'proofs', label: 'Buyers receive figures and proof hashes, not invoices', status: 'live' },
  { key: 'rbac', label: 'Team roles with set permissions (admin, data manager, analyst, carbon auditor, viewer)', status: 'live' },
  { key: 'audit', label: 'Audit log', status: 'pilot' },
  { key: 'sso', label: 'Single sign-on (SAML, OIDC)', status: 'custom' },
];

export const outputs: Capability[] = [
  { key: 'lineage', label: 'Each figure links to its document hash, factor and method version', status: 'live' },
  { key: 'confidence', label: 'Confidence score on every record', status: 'live' },
  { key: 'frameworks', label: 'GHG Protocol, BRSR and BRSR Core, CBAM, ISO 14064, GRI 305, CDP (C6), ESRS (E1-5, E1-6) reports', status: 'live', note: 'For one entity, labelled self-reported' },
  { key: 'audittrail', label: 'Audit-trail export (XLSX)', status: 'live' },
  { key: 'cbam', label: 'CBAM product emissions and EU report (CBAM suite)', status: 'live' },
  { key: 'reviewer', label: 'Named reviewer sign-off on records', status: 'custom' },
  { key: 'portfolio', label: 'Roll-up across hundreds of suppliers', status: 'live', note: 'Supplier dashboard with coverage and grades' },
];

export const supplierCountOptions = ['Under 100', '100 to 250', '250 to 500', '500 to 1,000', 'Over 1,000'];
