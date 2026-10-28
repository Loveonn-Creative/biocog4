import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useEmissions } from '@/hooks/useEmissions';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { chunk, runBulkVerify } from '@/lib/bulkVerify';
import { verifyBuckets } from '@/lib/emissionLedger';
import { isImportedEmission } from '@/lib/import/imported';
import { emitRecordsChanged } from '@/lib/recordsEvents';
import { getFunctionErrorMessage } from '@/lib/functionErrors';

// Ids already sent this browser session, so a record is checked once and a
// record that needs a detail is not re-sent on every refresh.
const attemptedKey = (userId: string) => `autoVerify:attempted:${userId}`;
const readAttempted = (userId: string): Set<string> => {
  try { return new Set(JSON.parse(sessionStorage.getItem(attemptedKey(userId)) ?? '[]') as string[]); } catch { return new Set(); }
};
const saveAttempted = (userId: string, ids: Set<string>) => {
  try { sessionStorage.setItem(attemptedKey(userId), JSON.stringify([...ids].slice(-2000))); } catch { /* storage unavailable */ }
};

/**
 * Verifies every invoice without a click. When signed-in records are saved or
 * change, each pending Scope 1 and 2 record is sent once through the same
 * per-invoice evidence check the Verify page runs (verify-carbon, idempotent).
 * Records that pass become verified everywhere (History, Reports, Dashboard,
 * Monetize) through the records-changed event; records with gaps are left
 * pending and the owner is pointed to Verify. Guests are never verified here:
 * their results stay a local preview. Scope 3 records follow the supplier
 * evidence trail, as before.
 */
export default function AutoVerifier() {
  const { user, sessionId } = useSession();
  const { can } = useWorkspace();
  const canVerify = can('records.verify');
  const { emissions, isLoading } = useEmissions();
  const navigate = useNavigate();
  const running = useRef(false);

  useEffect(() => {
    if (!user || !canVerify || isLoading || running.current) return;
    const attempted = readAttempted(user.id);
    // Typed spreadsheet rows wait for their bill (owner rule); they are not sent.
    const { toVerify } = verifyBuckets(emissions.filter((e) => !isImportedEmission(e)), new Set<string>());
    const fresh = toVerify.filter((e) => !attempted.has(e.id));
    if (fresh.length === 0) return;

    const timer = window.setTimeout(async () => {
      running.current = true;
      try {
        // Records already checked that did not pass would replay the same
        // result; leave them for the Verify page, where the next step is shown.
        const checked = new Set<string>();
        for (const ids of chunk(fresh.map((e) => e.id))) {
          const { data } = await supabase.from('compliance_ledger').select('emission_id, verification_status')
            .in('emission_id', ids).in('verification_status', ['needs_review', 'rejected']);
          for (const r of data ?? []) if (r.emission_id) checked.add(r.emission_id);
        }
        const rows = fresh.filter((e) => !checked.has(e.id));
        fresh.forEach((e) => attempted.add(e.id));
        saveAttempted(user.id, attempted);
        if (rows.length === 0) return;

        const { results } = await runBulkVerify(rows, async (body) => {
          const { data, error } = await supabase.functions.invoke('verify-carbon', { body });
          return { data, errorMessage: error ? await getFunctionErrorMessage(error, 'Verification could not complete.') : null };
        }, { sessionId, userId: user.id });

        const verified = results.filter((r) => r.status === 'verified').length;
        const needsDetail = results.filter((r) => r.status === 'needs_inputs' || r.status === 'needs_review').length;
        if (results.some((r) => r.status !== 'needs_inputs' && r.status !== 'error')) emitRecordsChanged('verify');
        if (verified) {
          toast.success(`${verified} invoice${verified === 1 ? '' : 's'} verified. History, Reports, Dashboard and Monetize are updated.`);
        }
        if (needsDetail) {
          toast.info(`${needsDetail} invoice${needsDetail === 1 ? ' needs' : 's need'} one more detail before verification.`, {
            action: { label: 'See what’s missing', onClick: () => navigate('/verify') },
          });
        }
      } catch (err) {
        // Background check: stay quiet; the Verify page shows the full error.
        console.error('Auto-verify failed:', err);
      } finally {
        running.current = false;
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [user, canVerify, isLoading, emissions, sessionId, navigate]);

  return null;
}
