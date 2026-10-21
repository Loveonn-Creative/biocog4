/**
 * Dashboard presentation helpers. Pure functions over figures already loaded;
 * nothing here applies a factor or changes a record.
 */

export type ScopeId = 1 | 2 | 3;

/** Scope colours are CSS tokens (index.css), validated for colour-blind separation. */
export const SCOPES: { id: ScopeId; label: string; plain: string; color: string }[] = [
  { id: 1, label: 'Scope 1', plain: 'Fuel you burn', color: 'var(--scope-1)' },
  { id: 2, label: 'Scope 2', plain: 'Electricity you buy', color: 'var(--scope-2)' },
  { id: 3, label: 'Scope 3', plain: 'Goods, freight and services', color: 'var(--scope-3)' },
];

const nf = (n: number, dp: number) => n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** kg CO2e as a display value and unit: kg below one tonne, tonnes above, en-IN grouping. */
export function formatCo2(kg: number): { value: string; unit: string } {
  const v = Number.isFinite(kg) && kg > 0 ? kg : 0;
  if (v < 1000) return { value: nf(v, v < 10 && v > 0 ? 1 : 0), unit: 'kg CO₂e' };
  const t = v / 1000;
  return { value: nf(t, t < 10 ? 2 : t < 100 ? 1 : 0), unit: 't CO₂e' };
}

export const co2Text = (kg: number) => { const f = formatCo2(kg); return `${f.value} ${f.unit}`; };

/** Compact axis label: 0, 500 kg, 1.2 t, 15 t. */
export function axisCo2(kg: number): string {
  if (kg <= 0) return '0';
  if (kg < 1000) return `${nf(kg, 0)} kg`;
  const t = kg / 1000;
  return `${nf(t, t < 10 && !Number.isInteger(t) ? 1 : 0)} t`;
}

/** A round ceiling for a chart axis (1, 2, 2.5, 5 x 10^n). */
export function niceMax(n: number): number {
  if (!(n > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (n <= m * p) return m * p;
  return 10 * p;
}

const CATEGORY_NAMES: Record<string, string> = {
  it_hardware: 'IT hardware', ev: 'EV transport', cloud: 'Cloud services', solar: 'Solar energy',
};

/** "purchased_goods" -> "Purchased goods". */
export function categoryLabel(c: string | null | undefined): string {
  const k = (c ?? '').trim();
  if (!k) return 'Other';
  if (CATEGORY_NAMES[k]) return CATEGORY_NAMES[k];
  const s = k.replace(/[_-]+/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface NextStepInput {
  totalRecords: number;
  unverified: number;
  /** Unverified records with no quantity or no factor: they cannot be verified as they are. */
  needsDetail: number;
  verifiedInvoices: number;
  monthsCovered: number;
}

export interface NextStep {
  kind: 'start' | 'detail' | 'verify' | 'ready';
  title: string;
  detail: string;
  cta: { label: string; to: string };
  secondary?: { label: string; to: string };
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/** The one action that moves the account forward most, in order of what blocks the next. */
export function nextStep(i: NextStepInput): NextStep {
  if (i.totalRecords === 0) {
    return {
      kind: 'start',
      title: 'Upload your first bill',
      detail: 'Electricity, fuel or freight. We read the quantities and count the emissions.',
      cta: { label: 'Upload a bill', to: '/' },
    };
  }
  if (i.needsDetail > 0) {
    return {
      kind: 'detail',
      title: `${plural(i.needsDetail, 'record needs', 'records need')} a missing figure`,
      detail: 'Without a quantity or factor they cannot be verified or counted.',
      cta: { label: 'See what is missing', to: '/verify' },
    };
  }
  if (i.unverified > 0) {
    return {
      kind: 'verify',
      title: `${plural(i.unverified, 'record is', 'records are')} ready to verify`,
      detail: 'Only verified records count in reports and lender evidence.',
      cta: { label: 'Verify now', to: '/verify' },
    };
  }
  return {
    kind: 'ready',
    title: 'Everything on record is verified',
    detail: i.verifiedInvoices > 0
      ? `${plural(i.verifiedInvoices, 'invoice', 'invoices')} across ${plural(i.monthsCovered, 'month', 'months')}, ready to share.`
      : 'Your verified records are ready to share.',
    cta: { label: 'Create report', to: '/reports' },
    secondary: { label: 'Share with lenders', to: '/monetize' },
  };
}

/** "2026-04-03" -> "3 Apr 2026"; invalid input returns ''. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return '';
  const cur = (currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${nf(amount, 0)}`;
  }
}
