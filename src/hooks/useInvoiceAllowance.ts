import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { usePremiumStatus } from './usePremiumStatus';
import { monthStartIst } from '../../supabase/functions/_shared/planLimits';
import { PAGE_COUNTING_STARTS } from '../../supabase/functions/_shared/addonPurchases';
import { creditsLeft, planReadsUsed, type PackRow } from '@/lib/invoiceAllowance';

export interface ServiceOrderRow {
  id: string; kind: 'expert_audit' | 'fast_track'; quantity: number; status: string;
  paid_at: string | null; due_at: string | null; delivered_at: string | null; created_at: string;
}

/** Reads used this month, plan limit, credits left, packs and service orders, for the signed-in account. */
export function useInvoiceAllowance() {
  const { user } = useSession();
  const { invoiceLimit, expiresAt } = usePremiumStatus();
  const [used, setUsed] = useState<number | null>(null);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [orders, setOrders] = useState<ServiceOrderRow[]>([]);
  const [pageCountingFrom, setPageCountingFrom] = useState<string>(PAGE_COUNTING_STARTS);

  const refresh = useCallback(async () => {
    if (!user) { setUsed(null); setPacks([]); setOrders([]); return; }
    const since = monthStartIst();
    const docsBetween = async (from: string, to?: string) => {
      let q = supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', from);
      if (to) q = q.lt('created_at', to);
      const { count } = await q;
      return count ?? 0;
    };
    // Tables from the invoice_reads migration; before it is applied, count documents as the server does.
    const db = supabase as unknown as { from: (t: string) => any };
    const reads = await db.from('invoice_reads').select('plan_units, status, created_at').eq('user_id', user.id).gte('created_at', since);
    if (reads.error) { setUsed(await docsBetween(since)); return; }
    let n = planReadsUsed(reads.data ?? []);
    // Bound call: an unbound supabase.rpc loses its client and throws.
    const { data: ledgerStart } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: string | null }> }).rpc('invoice_ledger_started_at');
    if (ledgerStart && ledgerStart > since) n += await docsBetween(since, ledgerStart);
    setUsed(n);
    const [p, o, c] = await Promise.all([
      db.from('invoice_credit_packs').select('id, packs, credits, used, validity, status, paid_at, expires_at, created_at').eq('user_id', user.id).neq('status', 'pending').order('created_at', { ascending: false }),
      db.from('service_orders').select('id, kind, quantity, status, paid_at, due_at, delivered_at, created_at').eq('user_id', user.id).neq('status', 'pending').order('created_at', { ascending: false }),
      db.from('invoice_read_counting').select('page_counting_from').maybeSingle(),
    ]);
    setPacks(p.data ?? []);
    setOrders(o.data ?? []);
    if (c.data?.page_counting_from) setPageCountingFrom(c.data.page_counting_from);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const credits = creditsLeft(packs, expiresAt ? expiresAt.toISOString() : null);
  const planLeft = used !== null ? Math.max(0, invoiceLimit - used) : null;
  return {
    used, limit: invoiceLimit, credits, packs, orders, refresh,
    /** Reads available now: plan reads left this month plus credits. */
    available: planLeft !== null ? planLeft + credits : null,
    pageCounting: Date.now() >= Date.parse(pageCountingFrom),
  };
}

/**
 * Whether this account counts each page yet, read once at upload time (no
 * hook, so the home page does not load usage on every visit). Guests have no
 * plan allowance, so page counting (5-page parts) applies.
 */
export async function pageCountingActive(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return true;
  const db = supabase as unknown as { from: (t: string) => any };
  const { data, error } = await db.from('invoice_read_counting').select('page_counting_from').eq('user_id', userId).maybeSingle();
  const from = !error && data?.page_counting_from ? data.page_counting_from : PAGE_COUNTING_STARTS;
  return Date.now() >= Date.parse(from);
}
