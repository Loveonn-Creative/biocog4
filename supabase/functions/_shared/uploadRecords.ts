// Writing a signed-in user's records for import-records: the emission writer
// (built on the shared buildEmissionRows, as extract-document's own writer
// is), the methodology stamp and the reads-ledger calls (reserve, enterprise
// cover, commit, release) with the same RPCs and arguments extract-document
// uses. extract-document keeps its own copies for now and is unchanged; a
// later change can switch it to this module. No Deno or esm imports: the
// database client is passed in.
import { buildEmissionRows } from './emissionRows.ts';
import { FACTOR_SET_VERSION, METHODOLOGY_NAME, METHODOLOGY_VERSION_TAG } from './emissionFactors.ts';

// ============= METHODOLOGY VERSION (APPEND-ONLY VERSIONING) =============
// Same values as METHODOLOGY_VERSION in extract-document (a test compares them).
export const METHODOLOGY_VERSION = {
  name: METHODOLOGY_NAME,
  // v1.1.0: corrected LPG, PNG, furnace oil, naphtha, kerosene and grid
  // factors; unit aliases; avoided emissions reported separately; full-file hash.
  version: `${METHODOLOGY_VERSION_TAG}.0`,
  country: 'IN',
  factorVersion: FACTOR_SET_VERSION,
  confidenceVersion: 'CONF_v1.0',
};

// Emission rows are created here, on the server, from the server's own
// result, so a browser cannot change the activity, factor or result. Only when
// the document has no rows yet. Returns the new ids, or null when nothing was
// written (the browser then falls back to its own copy of the same rows).
export async function createEmissionRows(
  // deno-lint-ignore no-explicit-any
  db: any,
  extracted: unknown,
  owner: { documentId: string; userId: string; organizationId: string | null },
): Promise<string[] | null> {
  try {
    const { count, error: countError } = await db.from('emissions').select('id', { count: 'exact', head: true }).eq('document_id', owner.documentId);
    if (countError || (count ?? 0) > 0) return null;
    const rows = buildEmissionRows(extracted as Parameters<typeof buildEmissionRows>[0], {
      documentId: owner.documentId, sessionId: null, userId: owner.userId, organizationId: owner.organizationId,
    });
    if (rows.length === 0) return [];
    const { data, error } = await db.from('emissions').insert(rows).select('id');
    if (error) { console.error('Server emission insert failed:', error.code); return null; }
    return (data ?? []).map((r: { id: string }) => r.id);
  } catch (e) {
    console.error('Server emission insert failed:', (e as Error)?.name ?? 'error');
    return null;
  }
}

export interface ReserveArgs {
  userId: string;
  organizationId: string | null;
  documentHash: string;
  pages: number;
  planLimit: number;
  periodStart: string;
  pageCountingFrom: string;
}

/** What the reads ledger answered (see the invoice_reads migration). */
export type Reservation =
  /** Reserved; id is null only if the ledger answered without one. */
  | { status: 'reserved'; id: string | null }
  /** The plan's reads and purchased credits are used up. r is the ledger's answer. */
  | { status: 'limit'; r: { used?: number; credits?: number; units?: number } }
  /** Ledger not migrated yet: the caller counts stored documents instead. */
  | { status: 'legacy' }
  /** The check itself failed; a failed check does not block (quota, not access control). */
  | { status: 'error'; code: string | undefined };

/**
 * Reserve one read before reading or saving. A supplier invited by an
 * enterprise is never stopped here: once their own reads and top-ups run out,
 * the enterprise covers the rest (and is billed).
 */
// deno-lint-ignore no-explicit-any
export async function reserveInvoiceRead(client: any, a: ReserveArgs): Promise<Reservation> {
  const reserve = () => client.rpc('reserve_invoice_read', {
    p_user: a.userId, p_org: a.organizationId || null, p_hash: a.documentHash, p_pages: a.pages,
    p_plan_limit: a.planLimit, p_period_start: a.periodStart,
    p_page_counting_from: a.pageCountingFrom,
  });
  let { data: r, error: rErr } = await reserve();
  if (!rErr && r && r.ok === false) {
    const { data: cover } = await client.rpc('service_enterprise_cover_reads', { p_user: a.userId, p_units: r.units ?? 1 });
    if (cover?.covered) ({ data: r, error: rErr } = await reserve());
  }
  if (rErr && (rErr.code === 'PGRST202' || rErr.code === '42883')) return { status: 'legacy' };
  if (rErr) return { status: 'error', code: rErr.code };
  if (r && r.ok === false) return { status: 'limit', r };
  return { status: 'reserved', id: r?.id ?? null };
}

/**
 * Settle a reserved read: committed when it produced a record, released
 * (nothing counted, credits back) when it failed, was empty or was a duplicate.
 */
// deno-lint-ignore no-explicit-any
export async function settleInvoiceRead(db: any, read: { id: string | null; commit: boolean; documentId: string | null }): Promise<void> {
  if (!read.id) return;
  try {
    const { error } = read.commit
      ? await db.rpc('commit_invoice_read', { p_id: read.id, p_document_id: read.documentId })
      : await db.rpc('release_invoice_read', { p_id: read.id });
    if (error) console.error('Read settle failed:', error.code);
  } catch (e) {
    console.error('Read settle failed:', (e as Error)?.name ?? 'error');
  }
}
