// Water MRV backfill, dry run first.
//
//   bun scripts/water-backfill.ts                      # dry run: prints the plan, writes nothing
//   bun scripts/water-backfill.ts --apply --planned-by alice --approved-by bob [--restatement "reason"]
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the operator's shell
// (never commit them). Reads existing documents' cached extraction results,
// runs the same pipeline as shadow mode, and compares with what the water
// tables already hold. New bills are ingested; changed results become new
// versions through water_apply_recalc (approver must differ from planner).
import { createClient } from '@supabase/supabase-js';
import { waterBillsFromInvoice } from '../supabase/functions/_shared/water/fromInvoice';
import { loadWaterConfig } from '../supabase/functions/_shared/water/shadow';
import { runBill, WATER_METHOD_VERSION } from '../supabase/functions/_shared/water/pipeline';
import { idempotencyKey, validateBill } from '../supabase/functions/_shared/water/ingest';
import { planRecalc, type StoredResult } from '../supabase/functions/_shared/water/recalc';
import { aggregate, describeTotal, gapReport } from '../supabase/functions/_shared/water/aggregate';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const apply = process.argv.includes('--apply');
const plannedBy = arg('--planned-by'), approvedBy = arg('--approved-by'), restatement = arg('--restatement') ?? null;
if (apply && (!plannedBy || !approvedBy || plannedBy === approvedBy)) {
  console.error('--apply needs --planned-by and a different --approved-by'); process.exit(2);
}
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
const db = createClient(url, key, { auth: { persistSession: false } });

const cfg = await loadWaterConfig(db);
if (!cfg) { console.error('water_mrv_settings.enabled is false or the tables are missing; nothing to do'); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);

let newBills = 0, ingested = 0;
const allFresh = [], allFlags = [];
const recalcByEntity = new Map<string, { bills: Map<string, string>; inserts: unknown[] }>();

for (let from = 0; ; from += 500) {
  const { data: docs, error } = await db.from('documents').select('document_hash, user_id, cached_result')
    .not('user_id', 'is', null).not('cached_result', 'is', null).order('created_at').range(from, from + 499);
  if (error) throw error;
  if (!docs?.length) break;
  for (const d of docs) {
    for (const bill of waterBillsFromInvoice(d.cached_result ?? {}, d.user_id, d.document_hash)) {
      const run = await runBill(bill, { ...cfg, calc_run_id: 'backfill', today });
      allFresh.push(...run.results); allFlags.push(...run.flags);
      const k = await idempotencyKey(bill);
      const { data: existing } = await db.from('water_bill').select('id').eq('idempotency_key', k).maybeSingle();
      if (!existing) {
        newBills++;
        if (apply) {
          const { error: e } = await db.rpc('water_persist_run', { p: { actor: `backfill:${approvedBy}`, kind: 'INGEST', method_version: WATER_METHOD_VERSION,
            bill: { ...bill, idempotency_key: k, volume_m3: validateBill(bill).volume_m3 }, results: run.results, flags: run.flags } });
          if (e) console.error('ingest failed', k.slice(0, 12), e.message); else ingested++;
        }
        continue;
      }
      const { data: cur } = await db.from('water_emission_result').select('*').eq('water_bill_id', existing.id).eq('is_current', true);
      const { data: locked } = await db.from('water_locked_period').select('allocation_period').eq('entity_id', bill.entity_id);
      const stored = (cur ?? []).map(r => ({ ...r, water_bill_key: k, emissions_kgco2e: r.emissions_kgco2e === null ? null : Number(r.emissions_kgco2e),
        allocated_volume_m3: r.allocated_volume_m3 === null ? null : Number(r.allocated_volume_m3), factor_value: r.factor_value === null ? null : Number(r.factor_value) })) as StoredResult[];
      const plan = planRecalc(stored, run.results, (locked ?? []).map(l => l.allocation_period));
      for (const e of plan.entries) {
        if (e.kind !== 'CHANGED' && e.kind !== 'NEW') continue;
        console.log(`${e.kind.padEnd(8)} ${e.slot.slice(0, 12)}… ${e.changed_fields.join(',') || 'new period'} delta=${e.delta_kgco2e ?? 'n/a'}${e.locked ? ' [LOCKED]' : ''}`);
        const g = recalcByEntity.get(bill.entity_id) ?? { bills: new Map(), inserts: [] };
        g.inserts.push({ ...e.after, water_bill_id: existing.id, supersedes_id: e.before?.id ?? null });
        recalcByEntity.set(bill.entity_id, g);
      }
    }
  }
}

console.log('\n=== Dry-run totals (what the water tables would show) ===');
for (const t of aggregate(allFresh, allFlags)) console.log(describeTotal(t));
console.log('\n=== Open data gaps ===');
for (const g of gapReport(allFlags, today)) console.log(`${g.severity.padEnd(6)} ${g.reason_code.padEnd(26)} ${g.open} open (${g.owner_role})`);
const changes = [...recalcByEntity.values()].reduce((s, g) => s + g.inserts.length, 0);
console.log(`\nNew bills: ${newBills}${apply ? `, ingested: ${ingested}` : ''}. Changed results: ${changes}.`);

if (apply) {
  for (const [entity_id, g] of recalcByEntity) {
    const { error } = await db.rpc('water_apply_recalc', { p: { planned_by: plannedBy, approved_by: approvedBy, method_version: WATER_METHOD_VERSION,
      restatement_reason: restatement, entity_id, inserts: g.inserts, flags: [] } });
    if (error) console.error('recalc failed for entity', entity_id.slice(0, 8), error.message);
  }
} else {
  console.log('Dry run only. Nothing was written.');
}
