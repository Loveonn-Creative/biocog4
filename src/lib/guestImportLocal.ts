// Adding a guest's browser-held results to the account that just signed in.
// Figures from the browser are never trusted: each kept file is read again by
// extract-document as the signed-in user (plan allowance and duplicate rules
// apply), which saves the document and its records on the server, exactly as
// an upload. The browser only looks them up; it never writes them.

import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { functionErrorStatus, getFunctionErrorMessage } from '@/lib/functionErrors';
import { clearGuestSources, getGuestSource } from '@/lib/guestSourceCache';
import { clearGuestResults, listGuestResults } from '@/lib/guestResults';
import { buildEmissionRows, type PersistableExtraction } from '@/lib/mrvPersistence';

export interface LocalImportOutcome { added: number; alreadyThere: number; skipped: string[]; stoppedAt?: string }

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export async function importLocalGuestResults(userId: string): Promise<LocalImportOutcome> {
  const supabase = await loadSupabase();
  const results = await listGuestResults();
  const out: LocalImportOutcome = { added: 0, alreadyThere: 0, skipped: [] };
  for (const r of results) {
    const name = r.fileName || 'invoice';
    const file = await getGuestSource(r.hash);
    if (!file) { out.skipped.push(`${name}: the file is no longer in this browser`); continue; }
    const { data, error } = await supabase.functions.invoke('extract-document', {
      body: { imageBase64: await toBase64(file.blob), mimeType: file.type || 'application/pdf' },
    });
    if (error) {
      const msg = await getFunctionErrorMessage(error, 'could not be read');
      // The monthly allowance or our AI being unavailable stops the rest too.
      const status = functionErrorStatus(error);
      if (status === 402 || status === 429 || /month|paused|unavailable|limit/i.test(msg)) { out.stoppedAt = `${name}: ${msg}`; break; }
      out.skipped.push(`${name}: ${msg}`); continue;
    }
    if (!data?.success || !data?.data) { out.skipped.push(`${name}: ${data?.error || 'could not be read'}`); continue; }
    // Saved by the server on this read (document and records).
    if (data.serverSaved && data.documentId && Array.isArray(data.emissionIds)) { out.added += 1; continue; }
    // Every document this account holds for the same file: the invoice may
    // already be there (uploaded earlier, or moved from an older guest row).
    const { data: docs } = await supabase.from('documents').select('id, created_at').eq('document_hash', data.documentHash).eq('user_id', userId)
      .order('created_at', { ascending: false });
    const doc = docs?.[0];
    if (!doc?.id) { out.skipped.push(`${name}: could not be saved`); continue; }
    const { data: existing } = await supabase.from('emissions').select('id').in('document_id', (docs ?? []).map((d: { id: string }) => d.id)).limit(1);
    if (existing?.length) { out.alreadyThere += 1; continue; }
    // Nothing to calculate: the document alone is the result. Otherwise the
    // server kept the document without its records, so it was not saved.
    const rows = buildEmissionRows(data.data as PersistableExtraction, { documentId: doc.id, sessionId: null, userId });
    if (rows.length) { out.skipped.push(`${name}: could not be saved`); continue; }
    out.added += 1;
  }
  return out;
}

/** After the person answers (either way), nothing from the guest visit stays in this browser. */
export async function forgetLocalGuestResults(): Promise<void> {
  await Promise.all([clearGuestResults(), clearGuestSources()]);
}
