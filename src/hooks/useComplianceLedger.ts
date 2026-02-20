import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { exportGovCompliance, type GovFormat } from '@/lib/govComplianceAdapter';

interface ComplianceLedgerEntry {
  id: string;
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
  verification_status: string;
  validation_result: string;
  validation_failure_reason: string | null;
  greenwashing_risk: string | null;
  methodology_version: string;
  classification_method: string | null;
  gstin: string | null;
  hsn_code: string | null;
  created_at: string;
  verified_at: string | null;
  fiscal_year: string | null;
  fiscal_quarter: string | null;
}

export const useComplianceLedger = () => {
  const { user } = useSession();
  const [entries, setEntries] = useState<ComplianceLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('compliance_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEntries(data as unknown as ComplianceLedgerEntry[]);
      }
      setIsLoading(false);
    };

    fetchEntries();
  }, [user?.id]);

  const exportComplianceXLSX = () => {
    if (entries.length === 0) {
      toast.error('No compliance data to export');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = entries.map(e => ({
      'Document Hash': e.document_hash.substring(0, 16) + '...',
      'Invoice #': e.invoice_number || '',
      'Vendor': e.vendor || '',
      'Date': e.invoice_date || '',
      'Amount': e.amount || '',
      'Currency': e.currency,
      'Green Category': e.green_category || '',
      'Scope': e.scope,
      'Emission Category': e.emission_category,
      'Activity Data': e.activity_data || '',
      'Activity Unit': e.activity_unit || '',
      'Emission Factor': e.emission_factor || '',
      'Factor Source': e.factor_source || '',
      'CO₂ (kg)': e.co2_kg,
      'Green Benefit': e.is_green_benefit ? 'Yes' : 'No',
      'Confidence': e.confidence_score || '',
      'Verification Score': e.verification_score || '',
      'Status': e.verification_status,
      'Validation': e.validation_result,
      'Failure Reason': e.validation_failure_reason || '',
      'Greenwashing Risk': e.greenwashing_risk || '',
      'Methodology': e.methodology_version,
      'Classification': e.classification_method || '',
      'GSTIN': e.gstin || '',
      'HSN': e.hsn_code || '',
      'Verified At': e.verified_at || '',
      'Fiscal Year': e.fiscal_year || '',
      'Fiscal Quarter': e.fiscal_quarter || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Compliance Ledger');
    XLSX.writeFile(wb, `compliance-ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Compliance ledger exported');
  };

  const exportGovFormat = (format: GovFormat) => {
    exportGovCompliance(entries as any, format);
  };

  return { entries, isLoading, exportComplianceXLSX, exportGovFormat };
};
