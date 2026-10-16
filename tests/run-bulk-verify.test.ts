import { describe, expect, test } from 'bun:test';
import { runBulkVerify, type VerifyInvoke } from '../src/lib/bulkVerify';

const rows = [
  { id: 'a1', document_id: 'docA' }, { id: 'a2', document_id: 'docA' },
  { id: 'b1', document_id: 'docB' },
  { id: 'c1', document_id: null },
];

function fakeInvoke(opts: { missing?: Record<string, string[]>; fail?: string[] } = {}) {
  const calls: Array<Record<string, unknown>> = [];
  const invoke: VerifyInvoke = async (body) => {
    calls.push(body);
    const ids = body.emissionIds as string[];
    if (body.inspectOnly) {
      return { data: { missingInputs: ids.filter((i) => opts.missing?.[i]).map((i) => ({ emissionId: i, fields: opts.missing![i] })) }, errorMessage: null };
    }
    if (ids.some((i) => opts.fail?.includes(i))) return { data: null, errorMessage: 'boom' };
    return { data: { success: true, data: { status: 'verified', score: 0.9, totalCO2Kg: 10 } }, errorMessage: null };
  };
  return { invoke, calls };
}

describe('runBulkVerify (shared by Verify page and auto-verifier)', () => {
  test('verifies each invoice on its own, with the same sorted id set', async () => {
    const { invoke, calls } = fakeInvoke();
    const { results } = await runBulkVerify(rows, invoke, { userId: 'u' });
    expect(results.map((r) => [r.key, r.status])).toEqual([['docA', 'verified'], ['docB', 'verified'], ['row:c1', 'verified']]);
    const verifyCalls = calls.filter((c) => !c.inspectOnly);
    expect(verifyCalls.map((c) => c.emissionIds)).toEqual([['a1', 'a2'], ['b1'], ['c1']]);
    expect(verifyCalls.every((c) => c.userId === 'u')).toBe(true);
  });

  test('an invoice with any missing input is left untouched', async () => {
    const { invoke, calls } = fakeInvoke({ missing: { a2: ['quantity'] } });
    const { results, missing } = await runBulkVerify(rows, invoke);
    expect(results.find((r) => r.key === 'docA')?.status).toBe('needs_inputs');
    expect(missing).toEqual([{ emissionId: 'a2', fields: ['quantity'] }]);
    expect(calls.some((c) => !c.inspectOnly && (c.emissionIds as string[]).includes('a1'))).toBe(false);
  });

  test('a failed call is reported per invoice, others still verify', async () => {
    const { invoke } = fakeInvoke({ fail: ['b1'] });
    const { results } = await runBulkVerify(rows, invoke);
    expect(results.find((r) => r.key === 'docB')).toMatchObject({ status: 'error', message: 'boom' });
    expect(results.filter((r) => r.status === 'verified')).toHaveLength(2);
  });

  test('a failing evidence preflight throws (nothing is verified)', async () => {
    const invoke: VerifyInvoke = async () => ({ data: null, errorMessage: 'preflight down' });
    await expect(runBulkVerify(rows, invoke)).rejects.toThrow('preflight down');
  });
});
