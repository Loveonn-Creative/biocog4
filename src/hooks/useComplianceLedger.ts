import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';
import type { GovFormat } from '@/lib/govComplianceAdapter';
import { latestLedgerRowPerEmission, verifiedLedgerTotalKg } from '@/lib/emissionLedger';

import { useRecordsChanged } from '@/lib/recordsEvents';
export interface ComplianceLedgerEntry {
  id: string;
  emission_id: string | null;
  verification_id: string | null;
  document_hash: string;
  invoice_number: string | null;
  vendor: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string;
  green_category: string | null;
  scope: number;
  emission_category: string;
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  factor_source: string | null;
  co2_kg: number;
  is_green_benefit: boolean;
  confidence_score: number | null;
  verification_score: number | null;
  verification_status: string | null;
  validation_result: string | null;
  validation_failure_reason: string | null;
  greenwashing_risk: string | null;
  methodology_version: string;
  classification_method: string | null;
  gstin: string | null;
  hsn_code: string | null;
  created_at: string | null;
  verified_at: string | null;
  fiscal_year: string | null;
  fiscal_quarter: string | null;
}

export const useComplianceLedger = () => {
  const { user } = useSession();
  const [rawEntries, setRawEntries] = useState<ComplianceLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;

  const fetchEntries = useCallback(async () => {
    // The ledger is only ever read for the signed-in user. Guests have no ledger.
    if (!userId) {
      setRawEntries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('compliance_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit ledger:', error);
    } else {
      setRawEntries((data || []) as unknown as ComplianceLedgerEntry[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  // A re-verification writes a new ledger row for the same emission. Show and
  // export only the latest row per emission so nothing is counted twice.
  const entries = useMemo(() => latestLedgerRowPerEmission(rawEntries), [rawEntries]);
  const verifiedTotalKg = useMemo(() => verifiedLedgerTotalKg(rawEntries), [rawEntries]);

  const exportComplianceXLSX = async () => {
    if (entries.length === 0) {
      toast.error('No audit ledger rows to export');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const data = entries.map(e => ({
        'Emission ID': e.emission_id || '',
        'Document Hash': (e.document_hash || '').substring(0, 16) + '...',
        'Invoice #': e.invoice_number || '',
        'Vendor': e.vendor || '',
        'Date': e.invoice_date || '',
        'Amount': e.amount ?? '',
        'Currency': e.currency,
        'Green Category': e.green_category || '',
        'Scope': e.scope,
        'Emission Category': e.emission_category,
        'Activity Data': e.activity_data ?? '',
        'Activity Unit': e.activity_unit || '',
        'Emission Factor': e.emission_factor ?? '',
        'Factor Source': e.factor_source || '',
        'CO₂ (kg)': e.co2_kg,
        'Green Benefit': e.is_green_benefit ? 'Yes' : 'No',
        'Confidence': e.confidence_score ?? '',
        'Verification Score': e.verification_score ?? '',
        'Status': e.verification_status || '',
        'Validation': e.validation_result || '',
        'Failure Reason': e.validation_failure_reason || '',
        'Greenwashing Risk': e.greenwashing_risk || '',
        'Methodology': e.methodology_version,
        'Classification': e.classification_method || '',
        'GSTIN': e.gstin || '',
        'HSN': e.hsn_code || '',
        'Verified At': e.verified_at || '',
        'Fiscal Year': e.fiscal_year || '',
        'Fiscal Quarter': e.fiscal_quarter || '',
        'Proof Chain': `Invoice → ${e.emission_category} → EF:${e.emission_factor ?? 'N/A'} → ${e.co2_kg}kg CO₂ → ${e.verification_status || 'unknown'}`,
        'Audit Grade': e.verification_score ? (e.verification_score >= 0.9 ? 'A' : e.verification_score >= 0.75 ? 'B' : e.verification_score >= 0.5 ? 'C' : 'D') : 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Ledger');

      const summaryData = [{
        'Export Date': new Date().toISOString(),
        'Total Entries': entries.length,
        'Methodology': 'BIOCOG_MVR_INDIA_v1.0',
        'Verified CO₂ (kg)': verifiedTotalKg.toFixed(2),
        'Verified Entries': entries.filter(e => e.verification_status === 'verified').length,
        'Audit Note': 'Audit ledger export. One row per emission (latest verification). Verified CO₂ counts verified rows only. Each row traces from source invoice to the stored calculation.',
      }];
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Audit Summary');

      XLSX.writeFile(wb, `audit-ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Audit ledger exported');
    } catch (err) {
      console.error('Audit ledger export failed:', err);
      toast.error('Audit ledger export failed. Please try again.');
    }
  };

  const exportGovFormat = async (format: GovFormat) => {
    try {
      const { exportGovCompliance } = await import('@/lib/govComplianceAdapter');
      await exportGovCompliance(
        entries.map(e => ({
          ...e,
          verification_status: e.verification_status ?? '',
          is_green_benefit: Boolean(e.is_green_benefit),
          created_at: e.created_at ?? '',
        })),
        format,
      );
    } catch (err) {
      console.error(`${format} export failed:`, err);
      toast.error(`${format} export failed. Please try again.`);
    }
  };

  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { void fetchEntries(); });

  return { entries, verifiedTotalKg, isLoading, refetch: fetchEntries, exportComplianceXLSX, exportGovFormat };
};
