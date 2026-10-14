import type { DataClass, LineStatus } from '../../../supabase/functions/_shared/scope3';

export const fmtKg = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t` : `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;

export const DATA_CLASS_LABEL: Record<DataClass, string> = {
  primary_supplier: 'Primary supplier data',
  supplier_specific_factor: 'Supplier-specific factor',
  secondary_factor: 'Secondary factor',
  spend_based: 'Spend-based estimate',
  unverified: 'Unverified',
};

export const STATUS_LABEL: Record<LineStatus, string> = {
  verified: 'Verified',
  needs_data: 'Needs data',
  needs_review: 'Needs review',
  duplicate: 'Counted elsewhere',
  not_scope3: 'Not Scope 3',
};

/** Token classes per status: dot and text. */
export const STATUS_TONE: Record<LineStatus, string> = {
  verified: 'bg-primary text-primary',
  needs_review: 'bg-warning text-warning',
  needs_data: 'bg-muted-foreground text-muted-foreground',
  duplicate: 'bg-border text-muted-foreground',
  not_scope3: 'bg-border text-muted-foreground',
};
