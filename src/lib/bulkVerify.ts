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

/** Outcome per invoice in a bulk run. */
export interface InvoiceOutcome {
  key: string;
  emissionIds: string[];
  status: 'verified' | 'needs_review' | 'rejected' | 'needs_inputs' | 'error';
  score?: number;
  totalCO2Kg?: number;
  message?: string;
}

/** One verify-carbon call: returns the function's data, or throws with a readable message. */
export type VerifyInvoke = (body: Record<string, unknown>) => Promise<{ data: unknown; errorMessage: string | null }>;

export interface BulkRun {
  results: InvoiceOutcome[];
  missing: MissingInput[];
  /** Detailed result of the last verified call (the Verify page shows it for a single invoice). */
  last: unknown;
}

/**
 * The bulk verification run shared by the Verify page and the background
 * auto-verifier: one evidence preflight for every row, then each invoice whose
 * lines all have evidence is verified on its own; invoices with gaps are left
 * untouched. Re-running sends the same id set per invoice, so verify-carbon
 * replays the same result (verification is idempotent).
 */
export async function runBulkVerify(pending: PendingRow[], invoke: VerifyInvoke, ctx: Record<string, unknown> = {}): Promise<BulkRun> {
  const missing: MissingInput[] = [];
  for (const ids of chunk(pending.map(e => e.id))) {
    const { data, errorMessage } = await invoke({ emissionIds: ids, ...ctx, inspectOnly: true });
    if (errorMessage) throw new Error(errorMessage);
    const m = (data as { missingInputs?: MissingInput[] } | null)?.missingInputs;
    if (Array.isArray(m)) missing.push(...m);
  }
  const plan = planBulk(groupByInvoice(pending), missing);
  const results: InvoiceOutcome[] = plan.blocked.map(g => ({ key: g.key, emissionIds: g.emissionIds, status: 'needs_inputs' as const }));
  let last: unknown = null;
  for (const g of plan.ready) {
    for (const ids of chunk(g.emissionIds)) {
      const { data, errorMessage } = await invoke({ emissionIds: ids, ...ctx });
      const d = data as { ready?: boolean; missingInputs?: MissingInput[]; success?: boolean; data?: { status: InvoiceOutcome['status']; score?: number; totalCO2Kg?: number }; error?: string } | null;
      if (errorMessage) {
        results.push({ key: g.key, emissionIds: ids, status: 'error', message: errorMessage });
      } else if (d?.ready === false) {
        if (Array.isArray(d.missingInputs)) missing.push(...d.missingInputs);
        results.push({ key: g.key, emissionIds: ids, status: 'needs_inputs' });
      } else if (d?.success && d.data) {
        last = d.data;
        results.push({ key: g.key, emissionIds: ids, status: d.data.status, score: d.data.score, totalCO2Kg: d.data.totalCO2Kg });
      } else {
        results.push({ key: g.key, emissionIds: ids, status: 'error', message: d?.error || 'Verification returned no outcome.' });
      }
    }
  }
  return { results, missing, last };
}
