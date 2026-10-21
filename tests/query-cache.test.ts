import { describe, expect, test } from 'bun:test';

// recordsEvents listens on window; give the module a real event target before it loads,
// replacing any stub another test file left behind (bun shares globals across files).
const g = globalThis as unknown as { window?: Partial<EventTarget> };
if (typeof g.window?.addEventListener !== 'function') g.window = new EventTarget();
// Same for CustomEvent: a plain-object stub cannot be dispatched on an EventTarget.
const ce = globalThis as unknown as { CustomEvent: typeof CustomEvent };
if (!(Object.create(ce.CustomEvent.prototype) instanceof Event)) {
  ce.CustomEvent = class<T> extends Event { detail: T; constructor(type: string, init?: CustomEventInit<T>) { super(type); this.detail = init?.detail as T; } } as typeof CustomEvent;
}
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }).localStorage ??= {
  getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); },
};

const { queryClient, RECORDS_KEY, accountKey } = await import('../src/lib/queryClient');
const { emitRecordsChanged } = await import('../src/lib/recordsEvents');
const { syncIdentity } = await import('../src/lib/identity');

describe('shared query cache', () => {
  test('a records change marks every records query stale, and only those', () => {
    queryClient.setQueryData([RECORDS_KEY, 'emissions', 'user:a:0'], [{ id: 'e1' }]);
    queryClient.setQueryData([RECORDS_KEY, 'ledger', 'a', 'user:a:0'], [{ id: 'l1' }]);
    queryClient.setQueryData(accountKey('a', 'business_name'), 'Factory');
    emitRecordsChanged('test');
    expect(queryClient.getQueryState([RECORDS_KEY, 'emissions', 'user:a:0'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState([RECORDS_KEY, 'ledger', 'a', 'user:a:0'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(accountKey('a', 'business_name'))?.isInvalidated).toBe(false);
  });

  test("one person's cached data is cleared when someone else signs in", () => {
    queryClient.setQueryData([RECORDS_KEY, 'emissions', 'user:a:0'], [{ id: 'e1' }]);
    queryClient.setQueryData(['plan', 'a'], { tier: 'pro', expiresAt: null });
    syncIdentity('a');
    syncIdentity('b');
    expect(queryClient.getQueryData([RECORDS_KEY, 'emissions', 'user:a:0'])).toBeUndefined();
    expect(queryClient.getQueryData(['plan', 'a'])).toBeUndefined();
  });

});
