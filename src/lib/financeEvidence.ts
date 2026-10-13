/**
 * Finance evidence: what a lender or buyer can check in a business's
 * verified carbon records. Pure; reads the audit ledger the way every other
 * total does (latest row per emission, gross kg) and counts verified rows only.
 *
 * Nothing here is a credit, loan or eligibility decision, and nothing is
 * estimated: a figure is null when the records do not support it.
 */
import { grossKg, latestLedgerRowPerEmission } from '@/lib/emissionLedger';

export interface FinanceLedgerRow {
  id: string;
  emission_id: string | null;
  document_id?: string | null;
  document_hash: string | null;
  vendor: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string | null;
  scope: number;
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  factor_source: string | null;
  methodology_version: string | null;
  co2_kg: number;
  verification_status: string | null;
  created_at: string | null;
  verified_at?: string | null;
}

export interface FinanceEvidence {
  /** Every plan sees these. */
  summary: {
    verifiedTonnes: number;
    invoices: number;
    monthsCovered: number;
    periodStart: string | null;
    periodEnd: string | null;
  };
  /** Pro and Scale, with Finance detail switched on. */
  detail: {
    scopeTonnes: { 1: number; 2: number; 3: number };
    electricity: {
      kwh: number;
      tonnes: number;
      /** kg CO2e per kWh implied by the records; null without kWh. */
      impliedFactor: number | null;
      months: number;
      /** Months between the first and last electricity bill that no bill covers (billing period when printed, else invoice month). */
      missingMonths: string[];
    };
    /** kg CO2e per ₹1,000 of invoice spend (INR invoices with an amount only); null without spend. */
    kgPerThousandInr: number | null;
    spendInr: number;
    /** Largest supplier's share of verified tonnes (0 to 1); null with fewer than two suppliers. */
    topSupplier: { name: string; share: number } | null;
    trail: {
      /** Share of verified rows (0 to 1) carrying each piece of evidence. */
      fingerprinted: number;
      factorSourced: number;
      methodPinned: number;
      methodVersions: string[];
      factorSources: string[];
    };
  };
}

const monthOf = (d: string | null | undefined): string | null => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null);
const isKwh = (u: string | null) => !!u && /^(kwh|units?)$/i.test(u.trim());
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const text = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

/** Every month from first to last (inclusive), as YYYY-MM. */
function monthRange(first: string, last: string): string[] {
  const out: string[] = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
    if (out.length > 240) break;
  }
  return out;
}

/** Billing periods printed on electricity bills, by document hash (see electricityBillMeta). */
export type BillingPeriods = Record<string, { start: string; end: string }>;

/** Months a record covers: every month its bill's billing period touches, else its invoice month. */
function monthsOfRow(r: FinanceLedgerRow, periods: BillingPeriods): string[] {
  const p = r.document_hash ? periods[r.document_hash] : undefined;
  if (p && /^\d{4}-\d{2}-\d{2}$/.test(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.end) && p.start <= p.end) {
    return monthRange(p.start.slice(0, 7), p.end.slice(0, 7));
  }
  const m = monthOf(r.invoice_date);
  return m ? [m] : [];
}

export function computeFinanceEvidence(rows: FinanceLedgerRow[], periods: BillingPeriods = {}): FinanceEvidence {
  const verified = latestLedgerRowPerEmission(rows).filter((r) => r.verification_status === 'verified');
  const invoiceKey = (r: FinanceLedgerRow) => r.document_id || r.document_hash || r.id;

  const totalKg = verified.reduce((s, r) => s + grossKg(r.co2_kg), 0);
  const months = [...new Set(verified.map((r) => monthOf(r.invoice_date)).filter(Boolean) as string[])].sort();
  const dates = verified.map((r) => r.invoice_date).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}/.test(d)).sort();

  const scopeKg = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const r of verified) if (r.scope === 1 || r.scope === 2 || r.scope === 3) scopeKg[r.scope] += grossKg(r.co2_kg);

  // Electricity: lines measured in kWh.
  const elec = verified.filter((r) => isKwh(r.activity_unit) && typeof r.activity_data === 'number' && r.activity_data > 0);
  const kwh = elec.reduce((s, r) => s + (r.activity_data as number), 0);
  const elecKg = elec.reduce((s, r) => s + grossKg(r.co2_kg), 0);
  const elecMonths = [...new Set(elec.flatMap((r) => monthsOfRow(r, periods)))].sort();
  const missingMonths = elecMonths.length > 1
    ? monthRange(elecMonths[0], elecMonths[elecMonths.length - 1]).filter((m) => !elecMonths.includes(m))
    : [];

  // Spend: the amount is stored once per invoice, so take it per invoice.
  const spendByInvoice = new Map<string, number>();
  const kgByInvoice = new Map<string, number>();
  for (const r of verified) {
    const k = invoiceKey(r);
    kgByInvoice.set(k, (kgByInvoice.get(k) ?? 0) + grossKg(r.co2_kg));
    if ((r.currency ?? 'INR').toUpperCase() === 'INR' && typeof r.amount === 'number' && r.amount > 0) {
      spendByInvoice.set(k, Math.max(spendByInvoice.get(k) ?? 0, r.amount));
    }
  }
  const spendInr = [...spendByInvoice.values()].reduce((s, v) => s + v, 0);
  const spendKg = [...spendByInvoice.keys()].reduce((s, k) => s + (kgByInvoice.get(k) ?? 0), 0);

  // Supplier concentration.
  const bySupplier = new Map<string, number>();
  for (const r of verified) if (text(r.vendor)) bySupplier.set(r.vendor!.trim(), (bySupplier.get(r.vendor!.trim()) ?? 0) + grossKg(r.co2_kg));
  const suppliers = [...bySupplier.entries()].sort((a, b) => b[1] - a[1]);
  const supplierKg = suppliers.reduce((s, [, v]) => s + v, 0);

  const share = (pred: (r: FinanceLedgerRow) => boolean) => (verified.length ? round(verified.filter(pred).length / verified.length, 3) : 0);

  return {
    summary: {
      verifiedTonnes: round(totalKg / 1000, 3),
      invoices: new Set(verified.map(invoiceKey)).size,
      monthsCovered: months.length,
      periodStart: dates[0] ?? null,
      periodEnd: dates[dates.length - 1] ?? null,
    },
    detail: {
      scopeTonnes: { 1: round(scopeKg[1] / 1000, 3), 2: round(scopeKg[2] / 1000, 3), 3: round(scopeKg[3] / 1000, 3) },
      electricity: {
        kwh: round(kwh, 1),
        tonnes: round(elecKg / 1000, 3),
        impliedFactor: kwh > 0 ? round(elecKg / kwh, 3) : null,
        months: elecMonths.length,
        missingMonths,
      },
      kgPerThousandInr: spendInr > 0 ? round((spendKg / spendInr) * 1000, 2) : null,
      spendInr: round(spendInr, 2),
      topSupplier: suppliers.length >= 2 && supplierKg > 0 ? { name: suppliers[0][0], share: round(suppliers[0][1] / supplierKg, 3) } : null,
      trail: {
        fingerprinted: share((r) => text(r.document_hash)),
        factorSourced: share((r) => text(r.factor_source) && typeof r.emission_factor === 'number'),
        methodPinned: share((r) => text(r.methodology_version)),
        methodVersions: [...new Set(verified.map((r) => r.methodology_version).filter(text) as string[])].sort(),
        factorSources: [...new Set(verified.map((r) => r.factor_source).filter(text) as string[])].sort(),
      },
    },
  };
}
