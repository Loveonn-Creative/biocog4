import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { applyScope, scopeKey } from '@/lib/workspaceScope';
import { useRecordsChanged } from '@/lib/recordsEvents';
import { computeCredibilityScore, type CredibilityLedgerInput, type CredibilityResult, type CredibilityVerificationInput } from '@/lib/credibilityScore';

/**
 * The one credibility score Dashboard and Monetize show: every verification
 * attempt in the current workspace plus the audit ledger, read the same way
 * on both pages. Signed-in only (guests have no ledger); null until there is
 * something to score.
 */
export function useCredibility(): { credibility: CredibilityResult | null; isLoading: boolean } {
  const { user } = useSession();
  const { scope, ready } = useWorkspace();
  const key = scopeKey(scope);
  const { entries, isLoading: ledgerLoading } = useComplianceLedger();
  const [attempts, setAttempts] = useState<CredibilityVerificationInput[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttempts = useCallback(async () => {
    if (!ready) return;
    const query = user?.id
      ? applyScope(supabase.from('carbon_verifications').select('verification_score, verification_status'), scope)
      : null;
    if (!query) { setAttempts([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await query;
    if (error) console.error('Error fetching verification attempts:', error);
    setAttempts(error ? [] : ((data ?? []) as CredibilityVerificationInput[]));
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures scope
  }, [user?.id, key, ready]);

  useEffect(() => { void fetchAttempts(); }, [fetchAttempts]);
  useRecordsChanged(() => { void fetchAttempts(); });

  const credibility = useMemo(
    () => (attempts.length > 0 || entries.length > 0
      ? computeCredibilityScore(attempts, entries as unknown as CredibilityLedgerInput[])
      : null),
    [attempts, entries],
  );
  return { credibility, isLoading: loading || ledgerLoading };
}
