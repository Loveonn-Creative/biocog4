// Bulk verification planning. Verification is applied per invoice, and only
// to an invoice whose every emission line has its evidence. Pure functions,
// unit-tested; the Verify page performs the network calls.

export interface PendingRow { id: string; document_id: string | null; category?: string; scope?: number }
export interface MissingInput { emissionId: string; fields: string[] }

export interface InvoiceGroup {
  key: string;               // document id, or "row:<emission id>" for rows without one
  documentId: string | null;
  emissionIds: string[];      // sorted, so the same invoice always sends the same set
}

export interface BulkPlan {
  ready: InvoiceGroup[];
  blocked: (InvoiceGroup & { missing: MissingInput[] })[];
}

export function groupByInvoice(rows: PendingRow[]): InvoiceGroup[] {
  const map = new Map<string, InvoiceGroup>();
  for (const r of rows) {
    const key = r.document_id ?? `row:${r.id}`;
    const g = map.get(key) ?? { key, documentId: r.document_id, emissionIds: [] };
    g.emissionIds.push(r.id);
    map.set(key, g);
  }
  return [...map.values()]
    .map(g => ({ ...g, emissionIds: [...g.emissionIds].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** An invoice is ready only if none of its lines is missing an input. */
export function planBulk(groups: InvoiceGroup[], missing: MissingInput[]): BulkPlan {
  const byId = new Map(missing.filter(m => m.fields.length).map(m => [m.emissionId, m]));
  const plan: BulkPlan = { ready: [], blocked: [] };
  for (const g of groups) {
    const m = g.emissionIds.map(id => byId.get(id)).filter((x): x is MissingInput => !!x);
    if (m.length) plan.blocked.push({ ...g, missing: m });
    else plan.ready.push(g);
  }
  return plan;
}

/** Split into chunks the verify endpoint accepts (max 100 ids per call). */
export function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
