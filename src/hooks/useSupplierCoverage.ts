import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import {
  buildSupplierLedger,
  summariseCoverage,
  type SupplierCoverage,
  type SupplierSourceRecord,
} from '@/lib/supplierLedger';

const EMPTY: SupplierCoverage = {
  suppliers: [],
  supplierCount: 0,
  evidencedCount: 0,
  spendCoveragePct: 0,
  emissionsCoveragePct: 0,
  totalSpend: 0,
  totalCo2Kg: 0,
  verifiedCo2Kg: 0,
  gapSuppliers: [],
  currency: 'INR',
};

/**
 * Supplier-level Scope 3 visibility, derived from the user's own verified
 * ledger entries plus any captured document that has not produced a ledger
 * entry yet (those surface as explicit gaps).
 */
export function useSupplierCoverage() {
  const { user } = useSession();
  const [records, setRecords] = useState<SupplierSourceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) {
        if (!cancelled) { setRecords([]); setIsLoading(false); }
        return;
      }
      setIsLoading(true);

      const [ledgerRes, docRes] = await Promise.all([
        supabase
          .from('compliance_ledger')
          .select('vendor, invoice_date, amount, currency, co2_kg, scope, emission_category, hsn_code, factor_source, verification_status, document_hash, document_id')
          .eq('user_id', user.id),
        supabase
          .from('documents')
          .select('id, vendor, invoice_date, amount, currency, document_hash')
          .eq('user_id', user.id),
      ]);

      if (cancelled) return;

      const ledger = ledgerRes.data ?? [];
      const ledgerDocIds = new Set(ledger.map((l) => l.document_id).filter(Boolean) as string[]);

      const fromLedger: SupplierSourceRecord[] = ledger.map((l) => ({
        vendor: l.vendor,
        invoiceDate: l.invoice_date,
        amount: l.amount === null ? null : Number(l.amount),
        currency: l.currency,
        co2Kg: l.co2_kg === null ? null : Number(l.co2_kg),
        scope: l.scope,
        category: l.emission_category,
        hsnCode: l.hsn_code,
        factorSource: l.factor_source,
        verificationStatus: l.verification_status,
        documentHash: l.document_hash,
      }));

      // Documents that never reached the ledger are real coverage gaps.
      const fromDocs: SupplierSourceRecord[] = (docRes.data ?? [])
        .filter((d) => !ledgerDocIds.has(d.id))
        .map((d) => ({
          vendor: d.vendor,
          invoiceDate: d.invoice_date,
          amount: d.amount === null ? null : Number(d.amount),
          currency: d.currency,
          co2Kg: null,
          scope: null,
          category: null,
          hsnCode: null,
          factorSource: null,
          verificationStatus: null,
          documentHash: d.document_hash,
        }));

      setRecords([...fromLedger, ...fromDocs]);
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const coverage = useMemo(
    () => (records.length ? summariseCoverage(buildSupplierLedger(records)) : EMPTY),
    [records],
  );

  return { coverage, isLoading };
}
