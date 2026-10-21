// "Download my data": the account's own records as plain rows for a
// spreadsheet. Pure, so it is tested. Only fields the owner would recognise
// are kept: no internal ids, file paths, document fingerprints, raw reads,
// session or payment ids, and never bank statements or tax returns. Documents
// are numbered so emissions point to "Doc 3" instead of a database id.

type Row = Record<string, unknown>;
export interface ExportInput {
  profile: Row | null;
  documents: Row[];
  emissions: Row[];
  verifications: Row[];
  ledger: Row[];
}
export type Sheet = { name: string; rows: Array<Record<string, string | number | boolean | null>> };

/** Text a spreadsheet could run as a formula (=, +, -, @, tab, CR) is prefixed with an apostrophe. */
export function safeCell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  const s = String(v).slice(0, 500);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const pick = (r: Row, map: Record<string, (r: Row) => unknown>) =>
  Object.fromEntries(Object.entries(map).map(([k, f]) => [k, safeCell(f(r))]));

export function buildAccountExport(input: ExportInput, exportedOn: string): Sheet[] {
  const docs = [...input.documents].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
  const docRef = new Map(docs.map((d, i) => [d.id as string, `Doc ${i + 1}`]));
  const p = input.profile ?? {};
  return [
    { name: 'About', rows: [
      { Item: 'Exported on', Value: exportedOn },
      { Item: 'What this is', Value: 'Your records in Senseible: documents read, emissions, verifications and the audit ledger.' },
      { Item: 'Not included', Value: 'Original files, bank statements and tax returns, and internal identifiers.' },
    ] },
    { name: 'Profile', rows: [pick(p, {
      'Business name': (r) => r.business_name, 'Tax ID': (r) => r.gstin, Sector: (r) => r.sector, Size: (r) => r.size, Location: (r) => r.location,
    })] },
    { name: 'Documents', rows: docs.map((d) => pick(d, {
      Ref: (r) => docRef.get(r.id as string), 'Uploaded on': (r) => day(r.created_at), 'Invoice date': (r) => day(r.invoice_date),
      Supplier: (r) => r.vendor, Type: (r) => r.document_type, 'Invoice number': (r) => r.invoice_number, Amount: (r) => r.amount, Currency: (r) => r.currency,
    })) },
    { name: 'Emissions', rows: input.emissions.map((e) => pick(e, {
      Document: (r) => (r.document_id ? docRef.get(r.document_id as string) ?? null : null), Date: (r) => day(r.activity_date ?? r.created_at),
      Scope: (r) => r.scope, Category: (r) => r.category, Quantity: (r) => r.activity_data, Unit: (r) => r.activity_unit,
      'Factor (kg CO2e per unit)': (r) => r.emission_factor, 'kg CO2e': (r) => r.co2_kg, Verified: (r) => r.verified === true, 'Data quality': (r) => r.data_quality,
    })) },
    { name: 'Verifications', rows: input.verifications.map((v) => pick(v, {
      Date: (r) => day(r.created_at), Status: (r) => r.verification_status,
      'Evidence score (%)': (r) => (typeof r.verification_score === 'number' ? Math.round(r.verification_score * 100) : null), 'kg CO2e': (r) => r.total_co2_kg,
    })) },
    { name: 'Audit ledger', rows: input.ledger.map((l) => pick(l, {
      Document: (r) => (r.document_id ? docRef.get(r.document_id as string) ?? null : null), 'Invoice date': (r) => day(r.invoice_date), Supplier: (r) => r.vendor,
      Scope: (r) => r.scope, Quantity: (r) => r.activity_data, Unit: (r) => r.activity_unit, 'Factor (kg CO2e per unit)': (r) => r.emission_factor,
      'Factor source': (r) => r.factor_source, Method: (r) => r.methodology_version, 'kg CO2e': (r) => r.co2_kg, Status: (r) => r.verification_status,
    })) },
  ];
}
