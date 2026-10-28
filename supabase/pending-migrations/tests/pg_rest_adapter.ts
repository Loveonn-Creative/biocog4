// A small stand-in for the supabase-js client over a real local Postgres, for
// replay tests only: enough of from()/select/eq/insert/rpc to run edge
// function code against the replayed production schema. Runs as service_role
// (what an edge function's service key is), so RLS and the write guards
// behave as they do for edge functions.
import postgres from 'postgres';
import { userInfo } from 'os';

type Row = Record<string, unknown>;
type Sql = ReturnType<typeof postgres>;

export function connect(database: string): Sql {
  return postgres({
    database, max: 1, onnotice: () => {},
    host: process.env.PGHOST || '/var/run/postgresql', username: process.env.PGUSER || userInfo().username, password: process.env.PGPASSWORD,
    types: {
      // PostgREST returns numbers for numeric, text for dates and ISO text for timestamps.
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      date: { to: 1082, from: [1082], serialize: (x: unknown) => String(x), parse: (x: string) => x },
      tstz: { to: 1184, from: [1184], serialize: (x: unknown) => (x instanceof Date ? x.toISOString() : String(x)), parse: (x: string) => new Date(x).toISOString() },
    },
  });
}

export async function asServiceRole(sql: Sql) {
  await sql`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`;
  await sql.unsafe('set role service_role');
}

const isJson = (v: unknown) => v !== null && typeof v === 'object' && !(v instanceof Date);
const ident = (c: string) => {
  const m = c.match(/^(\w+)->>(\w+)$/);
  if (m) return `"${m[1]}"->>'${m[2]}'`;
  const n = c.match(/^(\w+)->(\w+)->>(\w+)$/);
  if (n) return `"${n[1]}"->'${n[2]}'->>'${n[3]}'`;
  if (!/^\w+$/.test(c)) throw new Error(`adapter: unsupported column ${c}`);
  return `"${c}"`;
};

class Query {
  private where: string[] = [];
  private params: unknown[] = [];
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row[] | Row | null = null;
  private count = false; private head = false; private one: 'single' | 'maybe' | null = null;
  private max: number | null = null; private orderBy: string[] = []; private returning = false;
  constructor(private sql: Sql, private table: string) {}
  // Objects go as they are: postgres.js serialises them for json/jsonb columns.
  private p(v: unknown) { this.params.push(v); return `$${this.params.length}`; }
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true;
    if (opts?.count) this.count = true; if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) { this.mode = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  upsert(rows: Row | Row[]) { this.mode = 'upsert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(obj: Row) { this.mode = 'update'; this.payload = obj; return this; }
  delete() { this.mode = 'delete'; return this; }
  eq(c: string, v: unknown) { this.where.push(`${ident(c)} = ${this.p(v)}`); return this; }
  neq(c: string, v: unknown) { this.where.push(`${ident(c)} is distinct from ${this.p(v)}`); return this; }
  gte(c: string, v: unknown) { this.where.push(`${ident(c)} >= ${this.p(v)}`); return this; }
  lte(c: string, v: unknown) { this.where.push(`${ident(c)} <= ${this.p(v)}`); return this; }
  gt(c: string, v: unknown) { this.where.push(`${ident(c)} > ${this.p(v)}`); return this; }
  lt(c: string, v: unknown) { this.where.push(`${ident(c)} < ${this.p(v)}`); return this; }
  in(c: string, vs: unknown[]) { this.where.push(`${ident(c)}::text = any(${this.p(vs.map(String))}::text[])`); return this; }
  is(c: string, v: unknown) { this.where.push(v === null ? `${ident(c)} is null` : `${ident(c)} is ${v ? 'true' : 'false'}`); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orderBy.push(`${ident(c)} ${o?.ascending === false ? 'desc' : 'asc'}`); return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) { return this.run().then(res, rej); }
  private async run(): Promise<{ data: unknown; error: { code?: string; message?: string } | null; count?: number | null }> {
    const t = `public."${this.table}"`;
    const w = this.where.length ? ` where ${this.where.join(' and ')}` : '';
    try {
      if (this.mode === 'insert' || this.mode === 'upsert') {
        const rows = this.payload as Row[];
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const values = rows.map((r) => `(${cols.map((c) => (r[c] === undefined ? 'default' : this.p(r[c]))).join(', ')})`).join(', ');
        const conflict = this.mode === 'upsert' ? ' on conflict do nothing' : '';
        const out = await this.sql.unsafe(`insert into ${t} (${cols.map((c) => `"${c}"`).join(', ')}) values ${values}${conflict} returning *`, this.params as never[]);
        const data = this.returning ? (this.one ? out[0] ?? null : [...out]) : null;
        return { data, error: null };
      }
      if (this.mode === 'update') {
        const obj = this.payload as Row;
        const sets = Object.keys(obj).map((c) => `"${c}" = ${this.p(obj[c])}`).join(', ');
        await this.sql.unsafe(`update ${t} set ${sets}${w}`, this.params as never[]);
        return { data: null, error: null };
      }
      if (this.mode === 'delete') {
        if (!this.where.length) throw new Error('adapter: delete without a filter');
        await this.sql.unsafe(`delete from ${t}${w}`, this.params as never[]);
        return { data: null, error: null };
      }
      if (this.head) {
        const [r] = await this.sql.unsafe(`select count(*)::int as n from ${t}${w}`, this.params as never[]);
        return { data: null, error: null, count: (r as { n: number }).n };
      }
      const order = this.orderBy.length ? ` order by ${this.orderBy.join(', ')}` : '';
      const lim = this.max !== null ? ` limit ${this.max}` : '';
      const rows = [...(await this.sql.unsafe(`select * from ${t}${w}${order}${lim}`, this.params as never[]))];
      if (this.one) return { data: rows[0] ?? null, error: rows[0] || this.one === 'maybe' ? null : { code: 'PGRST116', message: 'no rows' } };
      return { data: rows, error: null, count: this.count ? rows.length : null };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      return { data: null, error: { code: err.code === '42P01' ? '42P01' : err.code, message: err.message } };
    }
  }
}

/** A supabase-js shaped client. users maps bearer tokens to user ids. */
export function pgClient(sql: Sql, users: Record<string, string>) {
  return {
    from: (table: string) => new Query(sql, table),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      const names = Object.keys(args);
      const params = names.map((k) => (isJson(args[k]) ? JSON.stringify(args[k]) : args[k]));
      try {
        const [r] = await sql.unsafe(`select public."${fn}"(${names.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, params as never[]);
        return { data: (r as { r: unknown }).r, error: null };
      } catch (e) {
        const err = e as { code?: string; message?: string };
        // PostgREST answers a missing function with PGRST202.
        return { data: null, error: { code: err.code === '42883' ? 'PGRST202' : err.code, message: err.message } };
      }
    },
    storage: { from: () => ({ upload: async () => ({ error: { message: 'bucket not used in replay' } }), remove: async () => ({ error: null }) }) },
    auth: { getUser: async (token: string) => (users[token] ? { data: { user: { id: users[token] } }, error: null } : { data: { user: null }, error: { message: 'bad token' } }) },
  };
}
