// Identifies one report download: which report, which period, which format.
// Shared by the Reports page (builds it) and the report-allowance function
// (checks it), with no imports, so both read the same rules.
//
// reportId = <REPORT>:<period start>:<period end>, dates as YYYY-MM-DD or
// "none". REPORT is a framework id (reportFrameworks.ts) or CERTIFICATE.
// The stored key adds the format: <reportId>:<pdf|xlsx>.

export type ReportFileKind = 'pdf' | 'xlsx';
export const CERTIFICATE_REPORT = 'CERTIFICATE';

const REPORT_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** The period part from any stored date or timestamp; "none" when missing or unreadable. */
export function periodPart(value: string | null | undefined): string {
  const day = typeof value === 'string' ? value.slice(0, 10) : '';
  return isRealDate(day) ? day : 'none';
}

/** Builds the reportId the page sends. */
export function reportIdFor(report: string, periodStart: string | null | undefined, periodEnd: string | null | undefined): string {
  return `${report}:${periodPart(periodStart)}:${periodPart(periodEnd)}`;
}

/** The stored key for a request body, or null when anything is malformed. */
export function reportDownloadKey(reportId: unknown, kind: unknown): string | null {
  if (typeof reportId !== 'string' || reportId.length > 70) return null;
  if (kind !== 'pdf' && kind !== 'xlsx') return null;
  const parts = reportId.split(':');
  if (parts.length !== 3) return null;
  const [report, start, end] = parts;
  if (!REPORT_RE.test(report)) return null;
  if (report === CERTIFICATE_REPORT && kind !== 'pdf') return null;
  for (const p of [start, end]) if (p !== 'none' && !isRealDate(p)) return null;
  if (start !== 'none' && end !== 'none' && start > end) return null;
  return `${reportId}:${kind}`;
}
