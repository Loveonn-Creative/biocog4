// What /enterprise may say, and how sure we are. Every capability shown on the
// page comes from this list with its status, so the page cannot claim more
// than the code does. Statuses follow the October 2026 code audit:
//   live    = works end to end today
//   pilot   = partly built (UI or backend exists, not complete)
//   roadmap = not built yet
// Change a status only when the code changes.

export type CapabilityStatus = 'live' | 'pilot' | 'roadmap';

export interface Capability {
  key: string;
  label: string;
  status: CapabilityStatus;
  note?: string;
}

export const ingestionChannels: Capability[] = [
  { key: 'docs', label: 'Invoices, bills and PDFs read by AI', status: 'live', note: 'Images and PDFs, one record per document' },
  { key: 'bulk', label: 'Bulk document upload', status: 'live', note: 'Up to 10 files per batch today' },
  { key: 'csv', label: 'CSV or spreadsheet import', status: 'roadmap' },
  { key: 'erp', label: 'ERP feeds (Tally, SAP, Oracle, Zoho)', status: 'roadmap' },
  { key: 'sftp', label: 'SFTP drop', status: 'roadmap' },
  { key: 'messaging', label: 'Documents by email or WhatsApp', status: 'roadmap' },
  { key: 'iot', label: 'Meters and sensors, where a supplier has them', status: 'roadmap' },
  { key: 'api', label: 'API and webhooks', status: 'roadmap' },
];

export const pipelineStages: Capability[] = [
  { key: 'invite', label: 'Invite', status: 'roadmap', note: 'Supplier invitations and portal' },
  { key: 'collect', label: 'Collect', status: 'pilot', note: 'Documents today; other channels later' },
  { key: 'clean', label: 'Clean', status: 'live', note: 'Line items extracted and classified to Scope 1, 2 or 3' },
  { key: 'verify', label: 'Verify', status: 'live', note: 'Hash, factor, confidence score' },
  { key: 'report', label: 'Report', status: 'live', note: 'For one entity today; supplier roll-up later' },
];

export const scaleControls: Capability[] = [
  { key: 'tiering', label: 'Supplier tiering from your invoices', status: 'live', note: 'Primary, factor-derived or spend-only' },
  { key: 'quality', label: 'Data-quality view per supplier', status: 'pilot', note: 'Tier and named gaps; numeric score per document' },
  { key: 'exceptions', label: 'Exception queue for flagged records', status: 'pilot', note: 'Needs-review status today; queue and assignment later' },
  { key: 'waves', label: 'Onboarding in waves', status: 'roadmap' },
  { key: 'reminders', label: 'Automatic supplier reminders', status: 'roadmap' },
  { key: 'dedupe', label: 'Duplicate documents caught by hash', status: 'live' },
  { key: 'idempotent', label: 'Idempotent verification (no double counting)', status: 'live' },
  { key: 'queues', label: 'Queued, rate-limited ingestion for large uploads', status: 'roadmap' },
];

export const controlAndSecurity: Capability[] = [
  { key: 'isolation', label: 'Row-level isolation of every record', status: 'live', note: 'Per account today' },
  { key: 'consent', label: 'Supplier owns its record and consents per buyer', status: 'roadmap' },
  { key: 'proofs', label: 'Buyers receive figures and proof hashes, not invoices', status: 'roadmap' },
  { key: 'rbac', label: 'Team roles (owner, admin, analyst, viewer)', status: 'pilot', note: 'Team management today' },
  { key: 'audit', label: 'Audit log', status: 'pilot' },
  { key: 'sso', label: 'Single sign-on (SAML, OIDC)', status: 'roadmap' },
];

export const outputs: Capability[] = [
  { key: 'lineage', label: 'Each figure links to its document hash, factor and method version', status: 'live' },
  { key: 'confidence', label: 'Confidence score on every record', status: 'live' },
  { key: 'frameworks', label: 'GHG Protocol, BRSR and BRSR Core, CBAM, ISO 14064, GRI 305, CDP (C6), ESRS (E1-5, E1-6) reports', status: 'live', note: 'For one entity, labelled self-reported' },
  { key: 'audittrail', label: 'Audit-trail export (XLSX)', status: 'live' },
  { key: 'reviewer', label: 'Named reviewer sign-off on records', status: 'roadmap' },
  { key: 'portfolio', label: 'Roll-up across hundreds of suppliers', status: 'roadmap' },
];

export const supplierCountOptions = ['Under 100', '100 to 250', '250 to 500', '500 to 1,000', 'Over 1,000'];
