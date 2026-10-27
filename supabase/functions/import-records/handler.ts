// import-records: saves checked spreadsheet bill rows for a signed-in user as
// records, the same way an uploaded bill is saved (extract-document):
//  - every row is checked again here with the shared rules (importRows.ts);
//    only ready rows are saved, and nothing the browser sends is trusted;
//  - each saved row is one document (documents row + cached_result) and its
//    emission row comes from the shared writer (uploadRecords.ts), unverified;
//  - a row already stored (same fingerprint) or the same bill already counted
//    (same invoiceKey, as extract-document checks) is skipped;
//  - each saved row counts as one read against the plan allowance, through
//    the same reservation extract-document uses.
// Supplier lists are not saved by this function.
// The database client is passed in, so the tests run this handler directly.
import { UUID_RE, orgCan } from '../_shared/workspaceAccess.ts';
import { canonicalPlan, invoiceScanLimit, monthStartIst, monthlyLimitMessage, strongestRow } from '../_shared/planLimits.ts';
import { pageCountingFrom } from '../_shared/addonPurchases.ts';
import { gridCountryFor } from '../_shared/electricity.ts';
import { invoiceIdentity } from '../_shared/extractionRead.ts';
import { parseInvoiceDate } from '../_shared/invoiceDate.ts';
import { checkRecords, SAVE_BATCH_MAX, type RowRecord } from '../_shared/importRows.ts';
import { buildImportedRecord, importDocumentHash } from '../_shared/importRecord.ts';
import { createEmissionRows, reserveInvoiceRead, settleInvoiceRead } from '../_shared/uploadRecords.ts';
import { buildEmissionRows } from '../_shared/emissionRows.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * One outcome per row sent. 'saved' only when the document and all its
 * emission rows are stored and its read is committed; anything else leaves
 * nothing behind.
 */
export type RowOutcome =
  | { line: number; status: 'saved'; documentId: string; emissions: number }
  | { line: number; status: 'duplicate'; reason: string }
  | { line: number; status: 'invalid'; reason: string }
  | { line: number; status: 'failed'; reason: string; code: 'monthly_limit' | 'save_failed' };

export interface ImportDeps {
  env: (key: string) => string | undefined;
  // deno-lint-ignore no-explicit-any
  makeClient: (url: string, key: string) => any;
  now?: () => Date;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function jwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=')));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export const MESSAGES = {
  signIn: 'Sign in to import your bills.',
  expired: 'Your session has expired. Please sign in again.',
  role: 'Your team role cannot add invoices to this organisation. Ask an admin for analyst or data manager access.',
  suppliers: 'Supplier lists cannot be saved yet.',
  tooMany: `Send up to ${SAVE_BATCH_MAX} rows at a time.`,
  stored: 'Already in your records.',
  sameBill: 'This bill is already in your records.',
  saveFailed: 'Not saved. Try again.',
};

export async function handleImportRecords(req: Request, deps: ImportDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let body: { kind?: unknown; rows?: unknown; organizationId?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Send rows as JSON.' }, 400); }

  if (body.kind === 'suppliers') return json({ error: MESSAGES.suppliers, code: 'suppliers_not_saved' }, 400);
  if (body.kind !== 'bills') return json({ error: 'Unknown import kind.' }, 400);
  if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ error: 'No rows to import.' }, 400);
  if (body.rows.length > SAVE_BATCH_MAX) return json({ error: MESSAGES.tooMany, code: 'too_many_rows' }, 413);

  const rawOrg = body.organizationId;
  const organizationId = typeof rawOrg === 'string' && UUID_RE.test(rawOrg) ? rawOrg : null;
  if (rawOrg != null && !organizationId) return json({ error: 'Invalid workspace' }, 400);

  // Signed-in only. A guest or anon key is refused; a user token that fails
  // validation is refused rather than downgraded.
  const url = deps.env('SUPABASE_URL');
  const key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = deps.env('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer || bearer === anonKey || bearer === req.headers.get('apikey') || jwtRole(bearer) === 'anon') {
    return json({ error: MESSAGES.signIn, code: 'sign_in' }, 401);
  }
  if (!url || !key) return json({ error: 'Authentication service not configured' }, 500);
  const db = deps.makeClient(url, key);
  const { data: authData, error: authError } = await db.auth.getUser(bearer);
  if (authError || !authData?.user) return json({ error: MESSAGES.expired, code: 'sign_in' }, 401);
  const userId: string = authData.user.id;

  if (organizationId && !(await orgCan(db, userId, organizationId, 'records.upload'))) {
    return json({ error: MESSAGES.role, code: 'role' }, 403);
  }

  const now = deps.now?.() ?? new Date();
  // Checked again here: the browser's result is never trusted.
  const records: RowRecord[] = body.rows.map((r: unknown, i: number) => {
    const o = (r && typeof r === 'object' ? r : {}) as { line?: unknown; values?: unknown };
    const line = typeof o.line === 'number' && Number.isInteger(o.line) && o.line > 0 && o.line < 1_000_000 ? o.line : i + 2;
    return { line, values: (o.values && typeof o.values === 'object' ? o.values : {}) as Record<string, string> };
  });
  const checked = checkRecords('activity', records, now);

  // Plan in force, as extract-document reads it.
  let scanLimit: number | null = null;
  let planCycle: 'monthly' | 'yearly' | null = null;
  let planExpiresAt: string | null = null;
  let profileLocation: string | null = null;
  try {
    const { data: profile } = await db.from('profiles').select('subscription_tier, subscription_expires_at, location').eq('id', userId).single();
    profileLocation = typeof profile?.location === 'string' ? profile.location : null;
    const { data: activeRows } = await db.from('subscriptions').select('tier, expires_at, billing_cycle').eq('user_id', userId).eq('status', 'active');
    const activeSub = strongestRow(activeRows ?? []);
    planCycle = activeSub ? (activeSub.billing_cycle === 'monthly' ? 'monthly' : 'yearly') : null;
    planExpiresAt = activeSub?.expires_at ?? null;
    const plan = canonicalPlan({ tier: profile?.subscription_tier, expiresAt: profile?.subscription_expires_at }, activeRows ?? []);
    scanLimit = invoiceScanLimit(plan.tier, plan.expiresAt);
  } catch (e) {
    console.error('Plan lookup failed:', (e as { code?: string })?.code ?? 'error');
  }

  // deno-lint-ignore no-explicit-any
  const owned = (q: any) => (organizationId ? q.eq('organization_id', organizationId) : q.eq('user_id', userId));
  const results: RowOutcome[] = [];
  const batchHashes = new Map<string, number>();
  const batchKeys = new Map<string, number>();
  let limitReached = false;

  for (const row of checked.rows) {
    const line = row.line;
    if (row.status === 'fix') { results.push({ line, status: 'invalid', reason: row.issues[0]?.message ?? 'Check this row.' }); continue; }
    if (row.status === 'duplicate') { results.push({ line, status: 'duplicate', reason: `Same bill as row ${row.duplicateOf}.` }); continue; }

    const supply = gridCountryFor({ vendor: row.values.supplier, currency: 'INR' }, profileLocation);
    const built = buildImportedRecord(row.values, { gridCountry: supply.country ?? 'IN', gridSource: supply.source, line });
    if (!built) { results.push({ line, status: 'invalid', reason: 'Check this row.' }); continue; }
    const documentHash = await importDocumentHash(row.values);
    const invoiceKey = built.cachedResult.invoiceKey;

    const firstHash = batchHashes.get(documentHash);
    if (firstHash !== undefined) { results.push({ line, status: 'duplicate', reason: `Same bill as row ${firstHash}.` }); continue; }
    batchHashes.set(documentHash, line);
    const firstKey = invoiceKey ? batchKeys.get(invoiceKey) : undefined;
    if (firstKey !== undefined) { results.push({ line, status: 'duplicate', reason: `Same bill as row ${firstKey}.` }); continue; }
    if (invoiceKey) batchKeys.set(invoiceKey, line);

    // Same fingerprint already stored for this owner: skip, and create its
    // emission rows if an earlier save stopped before them (as an upload does).
    const { data: existing } = await owned(db.from('documents').select('id, cached_result').eq('document_hash', documentHash))
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing) {
      if (existing.cached_result) await createEmissionRows(db, existing.cached_result, { documentId: existing.id, userId, organizationId });
      results.push({ line, status: 'duplicate', reason: MESSAGES.stored });
      continue;
    }

    // The same bill stored from another file or row, and already counted.
    if (invoiceKey && (await countedTwin(db, owned, { invoiceKey, documentHash, invoiceNumber: built.document.invoice_number, date: built.document.invoice_date }))) {
      results.push({ line, status: 'duplicate', reason: MESSAGES.sameBill });
      continue;
    }

    if (limitReached) { results.push({ line, status: 'failed', reason: monthlyLimitMessage(scanLimit ?? 0), code: 'monthly_limit' }); continue; }

    // One read per saved row, reserved before saving.
    const read = { id: null as string | null, commit: false, documentId: null as string | null };
    if (scanLimit !== null) {
      const res = await reserveInvoiceRead(db, {
        userId, organizationId, documentHash, pages: 1, planLimit: scanLimit, periodStart: monthStartIst(now),
        pageCountingFrom: pageCountingFrom({ cycle: planCycle, expiresAt: planExpiresAt }, now),
      });
      if (res.status === 'legacy') {
        // Ledger not migrated yet: count stored documents, as extract-document does.
        const { count, error } = await db.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', monthStartIst(now));
        if (!error && (count ?? 0) >= scanLimit) limitReached = true;
      } else if (res.status === 'limit') {
        limitReached = true;
      } else if (res.status === 'error') {
        console.error('Read reservation failed:', res.code);
      } else {
        read.id = res.id;
      }
      if (limitReached) { results.push({ line, status: 'failed', reason: monthlyLimitMessage(scanLimit), code: 'monthly_limit' }); continue; }
    }

    const { data: saved, error: saveError } = await db.from('documents').insert({
      document_hash: documentHash,
      ...built.document,
      cached_result: built.cachedResult,
      cache_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: userId,
      file_url: null,
      session_id: null,
      ...(organizationId ? { organization_id: organizationId } : {}),
    }).select('id').single();
    if (saveError || !saved?.id) {
      console.error('Import save failed:', saveError?.code ?? 'no id');
      await settleInvoiceRead(db, read);
      results.push({ line, status: 'failed', reason: MESSAGES.saveFailed, code: 'save_failed' });
      continue;
    }
    // Takes the stored document back out (with any emission rows), releases
    // the read, and leaves nothing half-saved.
    const undo = async () => {
      await db.from('emissions').delete().eq('document_id', saved.id);
      const { error: delError } = await db.from('documents').delete().eq('id', saved.id);
      if (delError) console.error('Import undo failed:', delError.code);
      await settleInvoiceRead(db, read);
    };

    // Two tabs importing the same file at once can both pass the check
    // above (documents has no unique key on owner + hash). The earliest
    // stored copy wins; a later one is taken back out.
    const { data: twins, error: twinError } = await owned(db.from('documents').select('id, created_at').eq('document_hash', documentHash))
      .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1);
    if (twinError) { await undo(); results.push({ line, status: 'failed', reason: MESSAGES.saveFailed, code: 'save_failed' }); continue; }
    if (twins?.[0] && twins[0].id !== saved.id) { await undo(); results.push({ line, status: 'duplicate', reason: MESSAGES.stored }); continue; }

    // Emission rows through the shared writer. A row with a factor must get
    // its emission row; a row with none (freight) correctly gets zero.
    const expected = buildEmissionRows(built.cachedResult as never, { documentId: saved.id, sessionId: null, userId, organizationId }).length;
    const ids = await createEmissionRows(db, built.cachedResult, { documentId: saved.id, userId, organizationId });
    if (ids === null || ids.length !== expected) {
      await undo();
      results.push({ line, status: 'failed', reason: MESSAGES.saveFailed, code: 'save_failed' });
      continue;
    }
    read.commit = true;
    read.documentId = saved.id;
    await settleInvoiceRead(db, read);
    results.push({ line, status: 'saved', documentId: saved.id, emissions: ids.length });
  }

  const counts = { saved: 0, duplicate: 0, invalid: 0, failed: 0 };
  for (const r of results) counts[r.status]++;
  return json({ success: true, results, counts, limitReached });
}

/**
 * A stored copy of the same bill that already has emissions, matched as
 * extract-document matches a second file of an invoice: by invoiceKey, then
 * (records stored before invoiceKey existed) by number and date with the
 * identity compared.
 */
async function countedTwin(
  // deno-lint-ignore no-explicit-any
  db: any, owned: (q: any) => any,
  k: { invoiceKey: string; documentHash: string; invoiceNumber: string | null; date: string },
): Promise<boolean> {
  try {
    const cols = 'id, document_hash, created_at, cached_result';
    const byKey = await owned(db.from('documents').select(cols).eq('cached_result->>invoiceKey', k.invoiceKey).neq('document_hash', k.documentHash)).limit(1);
    // deno-lint-ignore no-explicit-any
    let twin: any = (byKey.data ?? [])[0] ?? null;
    if (!twin && k.invoiceNumber) {
      const byNumber = await owned(db.from('documents').select(cols).eq('invoice_number', k.invoiceNumber).eq('invoice_date', k.date).neq('document_hash', k.documentHash)).limit(5);
      // deno-lint-ignore no-explicit-any
      twin = (byNumber.data ?? []).find((d: any) => d.cached_result && invoiceIdentity({
        supplierGstin: d.cached_result.supplierGstin, vendor: d.cached_result.vendor, invoiceNumber: d.cached_result.invoiceNumber,
        date: parseInvoiceDate(d.cached_result.date) ?? undefined,
      }) === k.invoiceKey) ?? null;
    }
    if (!twin) return false;
    const { count } = await db.from('emissions').select('id', { count: 'exact', head: true }).eq('document_id', twin.id);
    return (count ?? 0) > 0;
  } catch (e) {
    console.error('Same-bill check failed:', (e as Error)?.name ?? 'error');
    return false;
  }
}

