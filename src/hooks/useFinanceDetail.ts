import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

// "Finance detail": deeper finance evidence (energy, spend intensity,
// supplier concentration, evidence trail) for Pro and Scale. Off by default so
// regular MSMEs keep the simple view. A display preference only, kept per user
// on this device; it changes no record and no calculation.

const EVENT = 'senseible:finance-detail';
const keyFor = (userId: string | undefined) => `senseible_finance_detail:${userId ?? 'guest'}`;

const read = (key: string) => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};

export function useFinanceDetail() {
  const { user } = useSession();
  const { tier } = usePremiumStatus();
  const available = tier === 'pro' || tier === 'scale';
  const key = keyFor(user?.id);
  const [on, setOn] = useState(() => read(key));

  useEffect(() => {
    setOn(read(key));
    const sync = () => setOn(read(key));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, [key]);

  const setEnabled = useCallback((next: boolean) => {
    try { localStorage.setItem(key, next ? '1' : '0'); } catch { /* private mode: keep in memory */ }
    setOn(next);
    window.dispatchEvent(new Event(EVENT));
  }, [key]);

  return { available, enabled: available && on, setEnabled };
}
