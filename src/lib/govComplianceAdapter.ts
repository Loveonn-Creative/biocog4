/**
 * Gov-Compliance Adapter
 * 
 * Auto-formats MRV outputs from the compliance_ledger into
 * government-required field structures for:
 * - GCP (Green Credit Programme)
 * - BRSR (Business Responsibility & Sustainability Reporting)
 * - CCTS (Carbon Credit Trading Scheme)
 */

import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface LedgerEntry {
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
  methodology_version: string;
  gstin: string | null;
  hsn_code: string | null;
  fiscal_year: string | null;
  fiscal_quarter: string | null;
  verified_at: string | null;
  created_at: string;
}

// Extract state code from GSTIN (first 2 digits)
const getStateFromGSTIN = (gstin: string | null): string => {
  if (!gstin || gstin.length < 2) return 'Unknown';
  const stateMap: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala',
    '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh',
  };
  return stateMap[gstin.substring(0, 2)] || `State-${gstin.substring(0, 2)}`;
};

export function formatForGCP(entries: LedgerEntry[]) {
  return entries.map(e => ({
    'Activity Type': e.emission_category,
    'Evidence Hash': e.document_hash,
    'State/Region': getStateFromGSTIN(e.gstin),
    'GSTIN': e.gstin || '',
    'HSN Code': e.hsn_code || '',
    'Quantity': e.activity_data || '',
    'Quantity Unit': e.activity_unit || '',
    'Verified CO₂ (kg)': e.co2_kg,
    'Green Benefit': e.is_green_benefit ? 'Yes' : 'No',
    'Green Category': e.green_category || '',
    'Methodology': e.methodology_version,
    'Verification Status': e.verification_status,
    'Verification Score': e.verification_score || '',
    'Evidence Timestamp': e.verified_at || e.created_at,
    'Fiscal Year': e.fiscal_year || '',
    'Invoice Reference': e.invoice_number || '',
  }));
}

export function formatForBRSR(entries: LedgerEntry[]) {
  return entries.map(e => ({
    'Scope': `Scope ${e.scope}`,
    'Category': e.emission_category,
    'Total Emissions (tCO₂e)': (e.co2_kg / 1000).toFixed(4),
    'Activity Data': e.activity_data || '',
    'Unit': e.activity_unit || '',
    'Emission Factor': e.emission_factor || '',
    'Data Source': e.factor_source || 'IND_EF_2025',
    'Reporting Period': `${e.fiscal_year || 'N/A'} ${e.fiscal_quarter || ''}`.trim(),
    'Verification Status': e.verification_status,
    'Green Initiative': e.is_green_benefit ? e.green_category || 'Yes' : 'No',
    'Methodology': e.methodology_version,
    'Evidence Hash': e.document_hash.substring(0, 16),
  }));
}

export function formatForCCTS(entries: LedgerEntry[]) {
  return entries.map(e => ({
    'Entity GSTIN': e.gstin || '',
    'State': getStateFromGSTIN(e.gstin),
    'Scope': e.scope,
    'Emission Source': e.emission_category,
    'CO₂ (tonnes)': (e.co2_kg / 1000).toFixed(4),
    'Activity Data': e.activity_data || '',
    'Activity Unit': e.activity_unit || '',
    'Emission Factor': e.emission_factor || '',
    'Factor Source': e.factor_source || '',
    'Verification Score': e.verification_score ? `${Math.round(e.verification_score * 100)}%` : 'Pending',
    'Verified At': e.verified_at || '',
    'Methodology': e.methodology_version,
    'Evidence Hash': e.document_hash,
    'Fiscal Year': e.fiscal_year || '',
    'Quarter': e.fiscal_quarter || '',
    'CCTS Eligible': e.verification_status === 'verified' ? 'Yes' : 'No',
  }));
}

export type GovFormat = 'GCP' | 'BRSR' | 'CCTS';

export function exportGovCompliance(entries: LedgerEntry[], format: GovFormat) {
  if (entries.length === 0) {
    toast.error('No compliance data to export');
    return;
  }

  const formatters = { GCP: formatForGCP, BRSR: formatForBRSR, CCTS: formatForCCTS };
  const sheetNames = { GCP: 'Green Credit Programme', BRSR: 'BRSR Disclosure', CCTS: 'CCTS Registry' };

  const data = formatters[format](entries);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetNames[format]);
  
  XLSX.writeFile(wb, `${format.toLowerCase()}-compliance-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast.success(`${format} compliance report exported`);
}