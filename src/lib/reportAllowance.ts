// Asks the report-allowance function whether a signed-in user may download a
// report file now. Anything other than a clear "not allowed" lets the
// download through: an unreachable function, an error or an unexpected reply
// never blocks a report.

import type { ReportFileKind } from '../../supabase/functions/_shared/reportDownloadKey';

export type Invoke = (
  name: string,
  options: { body: unknown },
) => Promise<{ data: unknown; error: unknown }>;

export interface AllowanceAnswer {
  allowed: boolean;
  /** First day of the next free month (YYYY-MM-DD), only when not allowed. */
  resetsOn: string | null;
  /** Downloads included each month, as the server reported it. */
  limit: number | null;
}

export async function askReportAllowance(invoke: Invoke, reportId: string, kind: ReportFileKind): Promise<AllowanceAnswer> {
  try {
    const { data, error } = await invoke('report-allowance', { body: { reportId, kind } });
    const reply = data as { allowed?: unknown; resetsOn?: unknown; limit?: unknown } | null;
    if (error || !reply || reply.allowed !== false) return { allowed: true, resetsOn: null, limit: null };
    const resetsOn = typeof reply.resetsOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(reply.resetsOn) ? reply.resetsOn : null;
    const limit = typeof reply.limit === 'number' && Number.isInteger(reply.limit) && reply.limit >= 0 ? reply.limit : null;
    return { allowed: false, resetsOn, limit };
  } catch {
    return { allowed: true, resetsOn: null, limit: null };
  }
}

/** "1 December" for 2026-12-01, read as an India-time date. */
export function formatResetDate(resetsOn: string, locale = 'en-IN'): string {
  const d = new Date(`${resetsOn}T00:00:00+05:30`);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' };
  try {
    return d.toLocaleDateString(locale, opts);
  } catch {
    return d.toLocaleDateString('en-IN', opts);
  }
}

/** The message shown when the free plan's downloads for the month are used. */
export function limitMessage(answer: Pick<AllowanceAnswer, 'resetsOn' | 'limit'>, locale?: string): string {
  const { resetsOn, limit } = answer;
  const first = limit === null || limit === 0
    ? 'Your free plan has no report downloads left this month.'
    : `Your free plan includes ${limit} report download${limit === 1 ? '' : 's'} a month.`;
  return resetsOn ? `${first} Next one: ${formatResetDate(resetsOn, locale)}.` : first;
}
