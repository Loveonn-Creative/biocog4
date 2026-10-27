/* eslint-disable @typescript-eslint/no-explicit-any -- a minimal fake Supabase client */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  FREE_REPORT_DOWNLOADS_PER_MONTH,
  nextMonthStart,
  planOrNull,
  reportAllowance,
} from '../supabase/functions/_shared/reportAllowance';
import { usageWindow } from '../supabase/functions/_shared/intelligenceUsage';
import {
  CERTIFICATE_REPORT,
  periodPart,
  reportDownloadKey,
  reportIdFor,
} from '../supabase/functions/_shared/reportDownloadKey';
import { askReportAllowance, formatResetDate, limitMessage } from '../src/lib/reportAllowance';
import { FRAMEWORKS } from '../src/lib/reportFrameworks';

type Err = { code?: string; message?: string } | null;
function fakeAdmin(opts: {
  profile?: any; subs?: any[]; profileError?: Err; subsError?: Err; throwOnRead?: boolean; enterprise?: any; enterpriseError?: Err;
  rpc?: (fn: string, a: any) => { data: any; error: Err };
} = {}) {
  const calls: Array<[string, any]> = [];
  return {
    calls,
    from: (t: string) => {
      if (opts.throwOnRead) throw new Error('network');
      const q: any = {
        select: () => q, eq: () => q,
        maybeSingle: async () => (t === 'enterprise_access'
          ? { data: opts.enterprise ?? null, error: opts.enterpriseError ?? null }
          : { data: opts.profile ?? null, error: opts.profileError ?? null }),
        then: (r: any) => r({ data: t === 'subscriptions' ? opts.subs ?? [] : [], error: t === 'subscriptions' ? opts.subsError ?? null : null }),
      };
      return q;
    },
    rpc: async (fn: string, a: any) => { calls.push([fn, a]); return opts.rpc ? opts.rpc(fn, a) : { data: null, error: { code: 'PGRST202' } }; },
  };
}

const USER = '00000000-0000-4000-8000-0000000000a1';
const FREE = { profile: { subscription_tier: 'snapshot', subscription_expires_at: null } };
const KEY = 'GHG_PROTOCOL:2026-04-01:2026-09-30:pdf';
// 27 Oct 2026, 20:00 UTC is 28 Oct in India; 31 Oct 19:00 UTC is already 1 Nov in India.
const OCT = new Date('2026-10-27T20:00:00Z');
const NOV_IST = new Date('2026-10-31T19:00:00Z');

describe('report download key', () => {
  test('builds and accepts a framework report and period', () => {
    const id = reportIdFor('GHG_PROTOCOL', '2026-04-01T10:00:00Z', '2026-09-30');
    expect(id).toBe('GHG_PROTOCOL:2026-04-01:2026-09-30');
    expect(reportDownloadKey(id, 'pdf')).toBe(KEY);
    expect(reportDownloadKey(id, 'xlsx')).toBe('GHG_PROTOCOL:2026-04-01:2026-09-30:xlsx');
  });
  test('a missing or unreadable period becomes none', () => {
    expect(periodPart(null)).toBe('none');
    expect(periodPart('garbage')).toBe('none');
    expect(periodPart('2026-02-30')).toBe('none');
    expect(reportDownloadKey(reportIdFor('INDIA_BRSR', null, undefined), 'pdf')).toBe('INDIA_BRSR:none:none:pdf');
  });
  test('the certificate is a PDF only', () => {
    const id = reportIdFor(CERTIFICATE_REPORT, '2026-04-01', '2026-09-30');
    expect(reportDownloadKey(id, 'pdf')).toBe('CERTIFICATE:2026-04-01:2026-09-30:pdf');
    expect(reportDownloadKey(id, 'xlsx')).toBeNull();
  });
  test('rejects anything malformed', () => {
    for (const [id, kind] of [
      [undefined, 'pdf'], [42, 'pdf'], ['GHG_PROTOCOL:2026-04-01:2026-09-30', 'docx'], ['GHG_PROTOCOL:2026-04-01:2026-09-30', undefined],
      ['ghg_protocol:none:none', 'pdf'], ['GHG PROTOCOL:none:none', 'pdf'], ['GHG_PROTOCOL:none', 'pdf'],
      ['GHG_PROTOCOL:none:none:pdf', 'pdf'], ['GHG_PROTOCOL:2026-13-01:none', 'pdf'], ['GHG_PROTOCOL:2026-09-30:2026-04-01', 'pdf'],
      ['A' + 'B'.repeat(70) + ':none:none', 'pdf'], ["X';drop:none:none", 'pdf'],
    ] as Array<[unknown, unknown]>) {
      expect(reportDownloadKey(id, kind)).toBeNull();
    }
  });
  test('every framework id fits the key, and none is called CERTIFICATE', () => {
    for (const fw of Object.values(FRAMEWORKS)) {
      expect(reportDownloadKey(reportIdFor(fw.id, '2026-04-01', '2026-09-30'), 'pdf')).not.toBeNull();
      expect(fw.id).not.toBe(CERTIFICATE_REPORT);
    }
  });
  test('keys match the database check', () => {
    const sql = readFileSync(new URL('../supabase/pending-migrations/20261112100000_report_downloads.sql', import.meta.url), 'utf8');
    const pattern = sql.match(/report_key ~ '([^']+)'/)![1];
    const re = new RegExp(pattern);
    expect(re.test(KEY)).toBe(true);
    expect(re.test('CERTIFICATE:none:none:pdf')).toBe(true);
  });
});

describe('monthly window', () => {
  test('report downloads use the India-time month', () => {
    expect(usageWindow('report_download', OCT)).toEqual({ day: '2026-10-28', start: '2026-10-01' });
    expect(usageWindow('report_download', NOV_IST)).toEqual({ day: '2026-11-01', start: '2026-11-01' });
  });
  test('next month start rolls over the year', () => {
    expect(nextMonthStart('2026-10-01')).toBe('2026-11-01');
    expect(nextMonthStart('2026-12-01')).toBe('2027-01-01');
  });
});

describe('allowance', () => {
  test('free plan: the database decides, with the India-time window and the free limit', async () => {
    const admin = fakeAdmin({ ...FREE, rpc: () => ({ data: [{ allowed: true, used: 1, repeat: false }], error: null }) });
    const r = await reportAllowance(admin, USER, KEY, OCT);
    expect(r).toEqual({ allowed: true, used: 1, limit: FREE_REPORT_DOWNLOADS_PER_MONTH, resetsOn: '2026-11-01', repeat: false });
    expect(admin.calls).toEqual([['report_download_take', { p_user: USER, p_report_key: KEY, p_day: '2026-10-28', p_window_start: '2026-10-01', p_limit: FREE_REPORT_DOWNLOADS_PER_MONTH }]]);
  });
  test('free plan: refused when the month is used', async () => {
    const admin = fakeAdmin({ ...FREE, rpc: () => ({ data: [{ allowed: false, used: 1, repeat: false }], error: null }) });
    const r = await reportAllowance(admin, USER, 'BRSR:none:none:pdf', NOV_IST);
    expect(r).toEqual({ allowed: false, used: 1, limit: FREE_REPORT_DOWNLOADS_PER_MONTH, resetsOn: '2026-12-01', repeat: false });
  });
  test('free plan: the same report again is let through as a repeat', async () => {
    const admin = fakeAdmin({ ...FREE, rpc: () => ({ data: [{ allowed: true, used: 1, repeat: true }], error: null }) });
    expect(await reportAllowance(admin, USER, KEY, OCT)).toMatchObject({ allowed: true, repeat: true });
  });
  test('a user with no profile row is on the free plan', async () => {
    const admin = fakeAdmin({ rpc: () => ({ data: [{ allowed: false, used: 1 }], error: null }) });
    expect((await reportAllowance(admin, USER, KEY, OCT)).allowed).toBe(false);
  });
  test('enterprise accounts (custom terms) are never limited', async () => {
    const admin = fakeAdmin({ ...FREE, enterprise: { id: 'e1' }, rpc: () => ({ data: [{ allowed: false, used: 1 }], error: null }) });
    expect(await reportAllowance(admin, USER, KEY, OCT, 'Owner@Example.com')).toEqual({ allowed: true, unlimited: true });
    expect(admin.calls).toEqual([]);
  });
  test('without the enterprise table yet, free users are still limited', async () => {
    const admin = fakeAdmin({ ...FREE, enterpriseError: { code: '42P01' }, rpc: () => ({ data: [{ allowed: false, used: 1 }], error: null }) });
    expect((await reportAllowance(admin, USER, KEY, OCT, 'a@b.co')).allowed).toBe(false);
  });
  test('an enterprise lookup fault allows the download', async () => {
    const admin = fakeAdmin({ ...FREE, enterpriseError: { code: '57014' }, rpc: () => ({ data: [{ allowed: false, used: 1 }], error: null }) });
    expect(await reportAllowance(admin, USER, KEY, OCT, 'a@b.co')).toEqual({ allowed: true, degraded: true });
  });
  test('paid plans are never limited and never counted', async () => {
    for (const tier of ['essential', 'pro', 'scale']) {
      const admin = fakeAdmin({ profile: { subscription_tier: tier, subscription_expires_at: '2027-01-01T00:00:00Z' }, rpc: () => ({ data: [{ allowed: false, used: 9 }], error: null }) });
      expect(await reportAllowance(admin, USER, KEY, OCT)).toEqual({ allowed: true, unlimited: true });
      expect(admin.calls).toEqual([]);
    }
  });
  test('an active subscription row counts even when the profile says free', async () => {
    const admin = fakeAdmin({ ...FREE, subs: [{ tier: 'pro', expires_at: '2027-01-01T00:00:00Z' }] });
    expect(await reportAllowance(admin, USER, KEY, OCT)).toEqual({ allowed: true, unlimited: true });
  });
  test('a plan in its grace days is still paid', async () => {
    const admin = fakeAdmin({ profile: { subscription_tier: 'pro', subscription_expires_at: '2026-10-25T00:00:00Z' } });
    expect(await reportAllowance(admin, USER, KEY, OCT)).toEqual({ allowed: true, unlimited: true });
  });
  test('fails open when the plan cannot be read, so a paid user is never blocked by a fault', async () => {
    const rpc = () => ({ data: [{ allowed: false, used: 1 }], error: null });
    expect(await reportAllowance(fakeAdmin({ profileError: { code: '57014' }, rpc }), USER, KEY, OCT)).toEqual({ allowed: true, degraded: true });
    expect(await reportAllowance(fakeAdmin({ ...FREE, subsError: { code: '57014' }, rpc }), USER, KEY, OCT)).toEqual({ allowed: true, degraded: true });
    expect(await reportAllowance(fakeAdmin({ throwOnRead: true, rpc }), USER, KEY, OCT)).toEqual({ allowed: true, degraded: true });
    expect(await planOrNull(fakeAdmin({ profileError: { message: 'x' } }), USER)).toBeNull();
  });
  test('fails open when the counter is missing, errors or answers oddly', async () => {
    for (const rpc of [
      () => ({ data: null, error: { code: 'PGRST202' } }),
      () => ({ data: null, error: { code: '42P01' } }),
      () => ({ data: null, error: { code: '23514', message: 'check' } }),
      () => ({ data: [], error: null }),
      () => ({ data: [{ used: 1 }], error: null }),
      () => { throw new Error('network'); },
    ]) {
      expect(await reportAllowance(fakeAdmin({ ...FREE, rpc: rpc as any }), USER, KEY, OCT)).toEqual({ allowed: true, degraded: true });
    }
  });
});

describe('page side', () => {
  const invokeWith = (reply: { data: unknown; error: unknown } | Error) => {
    const calls: any[] = [];
    const invoke = async (name: string, options: { body: unknown }) => {
      calls.push([name, options.body]);
      if (reply instanceof Error) throw reply;
      return reply;
    };
    return { invoke, calls };
  };
  test('sends the report id and format', async () => {
    const { invoke, calls } = invokeWith({ data: { allowed: true, unlimited: true }, error: null });
    expect(await askReportAllowance(invoke, 'GHG_PROTOCOL:2026-04-01:2026-09-30', 'xlsx')).toEqual({ allowed: true, resetsOn: null, limit: null });
    expect(calls).toEqual([['report-allowance', { reportId: 'GHG_PROTOCOL:2026-04-01:2026-09-30', kind: 'xlsx' }]]);
  });
  test('blocks only on a clear refusal', async () => {
    const { invoke } = invokeWith({ data: { allowed: false, used: 1, limit: 1, resetsOn: '2026-11-01' }, error: null });
    expect(await askReportAllowance(invoke, 'X1:none:none', 'pdf')).toEqual({ allowed: false, resetsOn: '2026-11-01', limit: 1 });
  });
  test('lets the download through when the function fails or is not deployed', async () => {
    for (const reply of [
      { data: null, error: new Error('FunctionsHttpError') },
      { data: null, error: null },
      { data: { allowed: true, degraded: true }, error: null },
      { data: 'odd', error: null },
      new Error('offline'),
    ]) {
      const { invoke } = invokeWith(reply as any);
      expect((await askReportAllowance(invoke, 'X1:none:none', 'pdf')).allowed).toBe(true);
    }
  });
  test('the message names the next free date, plainly', () => {
    expect(formatResetDate('2026-11-01')).toBe('1 November');
    const msg = limitMessage({ resetsOn: '2026-11-01', limit: 1 });
    expect(msg).toBe('Your free plan includes 1 report download a month. Next one: 1 November.');
    expect(limitMessage({ resetsOn: null, limit: 3 })).toBe('Your free plan includes 3 report downloads a month.');
    expect(msg).not.toMatch(/[—–]|platform|quota|allowance|limit reached/i);
  });
});

describe('Reports page contract', () => {
  const src = readFileSync(new URL('../src/pages/Reports.tsx', import.meta.url), 'utf8');
  const body = (name: string) => {
    const start = src.indexOf(`const ${name} = async`);
    expect(start).toBeGreaterThan(-1);
    return src.slice(start, src.indexOf('\n  };\n', start));
  };
  test('framework downloads ask the server before building a file', () => {
    const fn = body('downloadFramework');
    const ask = fn.indexOf('await mayDownload(fwId, kind)');
    expect(ask).toBeGreaterThan(-1);
    expect(ask).toBeLessThan(fn.indexOf("import('@/lib/frameworkReports')"));
    expect(fn.slice(ask, ask + 60)).toContain('return');
  });
  test('the certificate asks the server before building a file', () => {
    const fn = body('generateComplianceCertificate');
    const ask = fn.indexOf('await mayDownload(CERTIFICATE_REPORT');
    expect(ask).toBeGreaterThan(-1);
    expect(ask).toBeLessThan(fn.indexOf("import('jspdf')"));
    expect(ask).toBeLessThan(fn.indexOf('doc.save('));
  });
  test('the check calls report-allowance, skips guests and paid plans, and links to plans', () => {
    const fn = body('mayDownload');
    expect(fn).toContain('if (!user || isPremium) return true;');
    expect(fn).toContain('askReportAllowance(');
    expect(fn).toContain("navigate('/pricing')");
    expect(fn).toContain("'See plans'");
    expect(readFileSync(new URL('../src/lib/reportAllowance.ts', import.meta.url), 'utf8')).toContain("invoke('report-allowance'");
  });
  test('the edge function is registered like its siblings', () => {
    const cfg = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
    expect(cfg).toMatch(/\[functions\.report-allowance\]\s+verify_jwt = false/);
    const fnSrc = readFileSync(new URL('../supabase/functions/report-allowance/index.ts', import.meta.url), 'utf8');
    expect(fnSrc).toContain('auth.getUser()');
    expect(fnSrc).toContain('reportDownloadKey(body?.reportId, body?.kind)');
    expect(fnSrc).toContain("return json({ allowed: true, degraded: true });");
  });
});

describe('Gov-Ready exports', () => {
  test('count toward the same monthly allowance before any file is built', async () => {
    const page = await Bun.file(new URL('../src/pages/Reports.tsx', import.meta.url)).text();
    expect(page).toContain("if (!(await mayDownload(`GOV_${format}`, 'xlsx'))) return;");
    expect(page).not.toMatch(/onClick=\{\(\) => exportGovFormat\(/);
    const { reportDownloadKey, reportIdFor } = await import('../supabase/functions/_shared/reportDownloadKey');
    for (const f of ['GCP', 'BRSR', 'CCTS']) expect(reportDownloadKey(reportIdFor(`GOV_${f}`, null, null), 'xlsx')).toBe(`GOV_${f}:none:none:xlsx`);
  });
});
