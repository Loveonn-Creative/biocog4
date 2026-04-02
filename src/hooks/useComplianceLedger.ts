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
      'Proof Chain': `Invoice → ${e.emission_category} → EF:${e.emission_factor || 'N/A'} → ${e.co2_kg}kg CO₂ → ${e.verification_status}`,
      'Audit Grade': e.verification_score ? (e.verification_score >= 0.9 ? 'A' : e.verification_score >= 0.75 ? 'B' : e.verification_score >= 0.5 ? 'C' : 'D') : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Compliance Ledger');
    
    // Add proof chain summary sheet
    const summaryData = [{
      'Export Date': new Date().toISOString(),
      'Total Entries': entries.length,
      'Methodology': 'BIOCOG_MVR_INDIA_v1.0',
      'Total CO₂ (kg)': entries.reduce((sum, e) => sum + e.co2_kg, 0).toFixed(2),
      'Verified Entries': entries.filter(e => e.verification_status === 'verified').length,
      'Audit Note': 'This export is investor-ready. Every row traces from source invoice to carbon outcome.',
    }];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Audit Summary');
    
    XLSX.writeFile(wb, `audit-trail-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Investor-ready audit trail exported');
  };

  const exportGovFormat = (format: GovFormat) => {
    exportGovCompliance(entries as any, format);
  };

  return { entries, isLoading, exportComplianceXLSX, exportGovFormat };
};
