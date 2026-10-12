// The invoice date used for reporting periods. Extraction is asked for
// YYYY-MM-DD; only a real calendar date in that form, from 2000 up to a month
// ahead, is accepted. Anything else is null (the upload date is used for the
// period instead), so an ambiguous date such as 05/09 is never guessed.
// Pure: shared by the website and the edge functions.

export function parseInvoiceDate(raw: unknown, now = new Date()): string | null {
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  if (y < 2000 || t > now.getTime() + 31 * 86_400_000) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** The date a record belongs to for periods: its invoice date, else when it was uploaded. */
export function activityDate(invoiceDate: unknown, createdAt: string): string {
  return parseInvoiceDate(invoiceDate) ?? createdAt;
}

/** Indian financial year and quarter (April to March) for a date. */
export function fiscalPeriod(iso: string): { fiscalYear: string; fiscalQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' } {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  const month = t.getUTCMonth() + 1;
  const year = t.getUTCFullYear();
  return {
    fiscalYear: month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`,
    fiscalQuarter: month >= 4 && month <= 6 ? 'Q1' : month >= 7 && month <= 9 ? 'Q2' : month >= 10 ? 'Q3' : 'Q4',
  };
}
