// In-memory stand-in for supabase-js, mapped over https://esm.sh/@supabase/supabase-js@2
// by function-tests/import_map.json. Covers only what the tested functions call.

type Row = Record<string, unknown>;
export const db: { tables: Record<string, Row[]>; files: Record<string, Uint8Array>; users: Record<string, { id: string }>; failInsert?: { code: string } } = {
  tables: {}, files: {}, users: {},
};
export function resetDb() { db.tables = {}; db.files = {}; db.users = {}; db.failInsert = undefined; }

class Query {
  private filters: Array<(r: Row) => boolean> = [];
  private _limit = Infinity;
  private _order: { col: string; asc: boolean } | null = null;
  private _insert: Row | null = null;
  private _count = false;
  private _head = false;
  private _single = false;
  private _columns: string[] | null = null;
  constructor(private table: string) {}
  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    if (cols !== '*') this._columns = cols.split(',').map((c) => c.trim());
    this._count = opts?.count === 'exact'; this._head = !!opts?.head; return this;
  }
  insert(row: Row) { this._insert = row; return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  gte(col: string, v: string) { this.filters.push((r) => String(r[col]) >= v); return this; }
  lt(col: string, v: string) { this.filters.push((r) => String(r[col]) < v); return this; }
  order(col: string, o?: { ascending?: boolean }) { this._order = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; return this; }
  private pick(r: Row) { return this._columns ? Object.fromEntries(this._columns.map((c) => [c, r[c]])) : { ...r }; }
  then<T>(resolve: (v: { data: unknown; error: unknown; count?: number }) => T) {
    const rows = (db.tables[this.table] ??= []);
    if (this._insert) {
      if (db.failInsert) return Promise.resolve(resolve({ data: null, error: db.failInsert }));
      const r = this._insert as Row;
      if (rows.some((x) => x.user_id === r.user_id && x.photo_sha256 === r.photo_sha256)) {
        return Promise.resolve(resolve({ data: null, error: { code: '23505', message: 'duplicate' } }));
      }
      const row = { id: crypto.randomUUID(), status: 'unverified', verification_source: null, created_at: new Date().toISOString(), ...r };
      rows.push(row);
      return Promise.resolve(resolve({ data: this._single ? this.pick(row) : [this.pick(row)], error: null }));
    }
    let out = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this._order) { const { col, asc } = this._order; out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1)); }
    out = out.slice(0, this._limit);
    if (this._count) return Promise.resolve(resolve({ data: this._head ? null : out.map((r) => this.pick(r)), error: null, count: out.length }));
    return Promise.resolve(resolve({ data: this._single ? (out[0] ? this.pick(out[0]) : null) : out.map((r) => this.pick(r)), error: null }));
  }
}

// deno-lint-ignore no-explicit-any
export function createClient(_url: string, _key: string, opts?: { global?: { headers?: Record<string, string> }; [k: string]: unknown }): any {
  const auth = opts?.global?.headers?.Authorization ?? '';
  return {
    auth: {
      getUser: async () => {
        const user = db.users[auth.replace(/^Bearer /, '')];
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'invalid' } };
      },
    },
    from: (table: string) => new Query(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, bytes: Uint8Array) => {
          const key = `${bucket}/${path}`;
          if (db.files[key]) return { data: null, error: { message: 'exists' } };
          db.files[key] = bytes; return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => { for (const p of paths) delete db.files[`${bucket}/${p}`]; return { data: null, error: null }; },
      }),
    },
  };
}
