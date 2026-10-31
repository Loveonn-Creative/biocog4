import { describe, expect, test } from 'bun:test';
import { buildLines, financialYears, gradeFor, nextActions, overview, supplierCsv, type SupplierRequestRow, type SupplierSnapshotRow } from '../src/lib/enterprise/supplierPilot';
import { accessLoading } from '../src/lib/enterprise/access';
import { checkPeriod, cleanSupplier, requestEmail } from '../supabase/functions/_shared/supplierRequests';

const NOW = Date.parse('2026-10-25T10:00:00Z');
const req = (id: string, over: Partial<SupplierRequestRow> = {}): SupplierRequestRow => ({
  id, supplier_name: `Supplier ${id}`, supplier_email: `${id}@x.in`, supplier_gstin: null, buys: 'Steel', purchase_share_pct: null,
  scope3_category: 1, period_start: '2025-04-01', period_end: '2026-03-31', status: 'sent',
  created_at: '2026-10-20T00:00:00Z', expires_at: '2026-11-19T00:00:00Z', shared_at: null, last_reminded_at: null, ...over,
});
const snap = (request_id: string, over: Partial<SupplierSnapshotRow> = {}): SupplierSnapshotRow => ({
  id: `s-${request_id}`, request_id, supplier_name: '', supplier_gstin: null, period_start: '2025-04-01', period_end: '2026-03-31',
  scope1_kg: 0, scope2_kg: 0, scope3_kg: 0, total_kg: 0, verified_kg: 0, declared_kg: null, by_category: {}, activity: {},
  documents_total: 0, documents_verified: 0, snapshot_hash: 'h'.repeat(64), created_at: '2026-10-21T00:00:00Z', ...over,
});

describe('enterprise supplier dashboard numbers', () => {
  test('lines: status, proof, grade and order by emissions', () => {
    const lines = buildLines([
      req('a', { status: 'shared', purchase_share_pct: 20 }),
      req('b', { status: 'shared', purchase_share_pct: 5 }),
      req('c', { created_at: '2026-09-01T00:00:00Z', purchase_share_pct: 8 }), // overdue, big
      req('d', { status: 'opened' }),
      req('e', { status: 'revoked' }),
    ], [
      snap('a', { total_kg: 3_000_000, verified_kg: 2_850_000, scope2_kg: 2_000_000 }),
      snap('b', { declared_kg: 500_000 }),
    ], NOW);
    expect(lines.map((l) => l.requestId)).toEqual(['a', 'b', 'c', 'd']);
    expect(lines[0]).toMatchObject({ status: 'shared', proof: 'bills', grade: 'A', kg: 3_000_000, scope2Kg: 2_000_000 });
    expect(lines[1]).toMatchObject({ proof: 'own_number', grade: 'D', kg: 500_000 });
    expect(lines[2]).toMatchObject({ status: 'overdue', canRemind: true });
    expect(lines[3]).toMatchObject({ status: 'opened', proof: 'none' });

    const o = overview(lines);
    expect(o).toMatchObject({ totalKg: 3_500_000, sharing: 2, asked: 4, overdue: 1, purchasesCoveredPct: 25 });
    expect(o.verifiedPct).toBe(81);
    expect(o.top5Pct).toBeNull(); // fewer than 6 sharing: concentration says nothing

    const acts = nextActions(lines);
    expect(acts[0]).toMatchObject({ kind: 'big_missing', names: ['Supplier c'], overdueIds: ['c'] });
    expect(acts.map((a) => a.kind)).toEqual(['big_missing', 'ask_bills']);
  });

  test('a later snapshot replaces an earlier one; a reminder waits 3 days', () => {
    const lines = buildLines(
      [req('a', { status: 'shared' }), req('b', { created_at: '2026-09-01T00:00:00Z', last_reminded_at: '2026-10-24T00:00:00Z' })],
      [snap('a', { total_kg: 100, created_at: '2026-10-01T00:00:00Z' }), snap('a', { id: 's2', total_kg: 250, created_at: '2026-10-22T00:00:00Z' })],
      NOW,
    );
    expect(lines.find((l) => l.requestId === 'a')!.kg).toBe(250);
    expect(lines.find((l) => l.requestId === 'b')!.canRemind).toBe(false);
  });

  test('grades follow the verification bands', () => {
    expect([gradeFor(95, 100), gradeFor(80, 100), gradeFor(60, 100), gradeFor(10, 100), gradeFor(0, 0)]).toEqual(['A', 'B', 'C', 'D', null]);
  });

  test('financial years run April to March', () => {
    expect(financialYears(new Date('2026-10-25'), 2)).toEqual([
      { label: 'FY 2026-27', start: '2026-04-01', end: '2027-03-31' },
      { label: 'FY 2025-26', start: '2025-04-01', end: '2026-03-31' },
    ]);
    expect(financialYears(new Date('2026-02-10'), 1)[0].label).toBe('FY 2025-26');
  });

  test('CSV quotes commas and carries the snapshot hash', () => {
    const lines = buildLines([req('a', { status: 'shared', supplier_name: 'Rao, Sons' })], [snap('a', { total_kg: 1000, verified_kg: 1000 })], NOW);
    const csv = supplierCsv(lines, { start: '2025-04-01', end: '2026-03-31' });
    expect(csv.split('\n')[1].startsWith('"Rao, Sons"')).toBe(true);
    expect(csv).toContain('h'.repeat(64));
  });
});

describe('supplier request inputs and email', () => {
  test('a request needs a name and an email or GSTIN; GSTIN is upper-cased', () => {
    expect(cleanSupplier({ name: 'A' }).ok).toBe(false);
    expect(cleanSupplier({ name: 'Acme' }).ok).toBe(false);
    expect(cleanSupplier({ name: 'Acme', email: 'bad' }).ok).toBe(false);
    expect(cleanSupplier({ name: 'Acme', gstin: '27abcde1234f1z5', purchaseSharePct: 12.345 })).toEqual({
      ok: true, value: { name: 'Acme', email: null, gstin: '27ABCDE1234F1Z5', buys: null, purchaseSharePct: 12.35, scope3Category: 1 },
    });
    expect(cleanSupplier({ name: 'Acme', email: 'a@b.in', purchaseSharePct: 120 }).ok).toBe(false);
    expect(checkPeriod('2026-03-31', '2025-04-01').ok).toBe(false);
  });

  test('the email names the buyer, keeps bills private and escapes input', () => {
    const m = requestEmail({ siteUrl: 'https://senseible.earth', token: 'tok', companyName: 'Buyer Ltd', supplierName: '<b>Acme</b>', buys: 'Castings',
      periodStart: '2025-04-01', periodEnd: '2026-03-31', expiresAt: '2026-11-24T00:00:00Z' });
    expect(m.subject).toBe('Buyer Ltd asks for your emissions, 1 Apr 2025 to 31 Mar 2026');
    expect(m.html).toContain('https://senseible.earth/supplier-request/tok');
    expect(m.html).toContain('your bills stay private.');
    expect(m.html).not.toContain('<b>Acme</b>');
    expect(m.html).not.toMatch(/—/);
  });
});

describe('enterprise access loading', () => {
  test('is loading while the session resolves, so pages never redirect on a guess', () => {
    expect(accessLoading({ sessionLoading: true, queryPending: false, claiming: false })).toBe(true);
    expect(accessLoading({ sessionLoading: false, userId: 'u', queryPending: true, claiming: false })).toBe(true);
    expect(accessLoading({ sessionLoading: false, userId: 'u', queryPending: false, claiming: true })).toBe(true);
    expect(accessLoading({ sessionLoading: false, userId: 'u', queryPending: false, claiming: false })).toBe(false);
    expect(accessLoading({ sessionLoading: false, queryPending: true, claiming: false })).toBe(false); // signed out: settled
  });
});

describe('supplier claims on the dashboard', () => {
  test('shows who opened a forwarded request, and drops shares made before Resend link', () => {
    const [own] = buildLines([req('a', { status: 'opened', claimed_email: 'a@x.in' })], [], NOW);
    expect(own.openedBy).toBeNull();
    const [fwd] = buildLines([req('b', { status: 'shared', claimed_email: 'accounts@other.in' })], [snap('b', { total_kg: 500 })], NOW);
    expect(fwd.openedBy).toBe('accounts@other.in');
    expect(fwd.kg).toBe(500);
    const [reset] = buildLines([req('c', { status: 'sent', link_reset_at: '2026-10-22T00:00:00Z' })], [snap('c', { total_kg: 500 })], NOW);
    expect(reset.kg).toBe(0);
    expect(reset.proof).toBe('none');
    const [after] = buildLines([req('d', { status: 'shared', link_reset_at: '2026-10-22T00:00:00Z' })],
      [snap('d', { total_kg: 500 }), snap('d', { id: 's2', total_kg: 300, created_at: '2026-10-23T00:00:00Z' })], NOW);
    expect(after.kg).toBe(300);
  });
});

describe('supplier can stop sharing', () => {
  // The consent text promises "I can stop sharing at any time", so the share screen must offer it.
  test('share screen calls the consent withdrawal function the migration grants to signed-in users', async () => {
    const page = await Bun.file('src/pages/SupplierShare.tsx').text();
    expect(page).toContain('I can stop sharing at any time');
    expect(page).toContain("untypedRpc('withdraw_supplier_consent', { p_request_id: r.request_id })");
    const sql = await Bun.file('drizzle/migrations/0034_enterprise_pilot.sql').text();
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.withdraw_supplier_consent(uuid) TO authenticated');
  });
});
