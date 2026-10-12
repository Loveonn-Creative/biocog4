// Shadow mode: runs the water pipeline on a just-extracted invoice and stores
// the result in the water_* tables, without changing anything the user sees.
// Does nothing unless water_mrv_settings.enabled is true. Never throws.
import type { EmissionFactor, MappingRule } from './types.ts';
import { waterBillsFromInvoice, type OcrLike } from './fromInvoice.ts';
import { runBill, WATER_METHOD_VERSION } from './pipeline.ts';
import { idempotencyKey, validateBill } from './ingest.ts';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function loadWaterConfig(db: Client): Promise<{ enabled: boolean; gwp_basis: string; period_basis: 'CALENDAR' | 'INDIA_FY'; factors: EmissionFactor[]; rules: MappingRule[] } | null> {
  const { data: s, error } = await db.from('water_mrv_settings').select('enabled, gwp_basis, period_basis').maybeSingle();
  if (error || !s?.enabled) return null;   // table missing (not migrated) or switch off
  const [{ data: f }, { data: r }] = await Promise.all([
    db.from('water_emission_factor').select('*').eq('status', 'APPROVED'),
    db.from('water_category_mapping_rule').select('*').eq('status', 'APPROVED'),
  ]);
  const factors: EmissionFactor[] = (f ?? []).map((x: Record<string, unknown>) => ({
    ...(x as unknown as EmissionFactor), value: Number(x.value), uncertainty: num(x.uncertainty),
    source_publication_year: Number(x.source_publication_year),
  }));
  return { enabled: true, gwp_basis: s.gwp_basis, period_basis: s.period_basis, factors, rules: (r ?? []) as MappingRule[] };
}

export async function shadowWaterRun(db: Client, ocr: OcrLike, userId: string | null, documentRef: string): Promise<void> {
  try {
    if (!userId) return;
    const bills = waterBillsFromInvoice(ocr, userId, documentRef);
    if (!bills.length) return;
    const cfg = await loadWaterConfig(db);
    if (!cfg) return;
    const today = new Date().toISOString().slice(0, 10);
    for (const bill of bills) {
      const run = await runBill(bill, { ...cfg, calc_run_id: 'shadow', today });
      const { error } = await db.rpc('water_persist_run', { p: {
        actor: 'extract-document', kind: 'SHADOW', method_version: WATER_METHOD_VERSION,
        bill: { ...bill, idempotency_key: await idempotencyKey(bill), volume_m3: validateBill(bill).volume_m3 },
        results: run.results, flags: run.flags,
      } });
      if (error) console.error('water shadow persist failed:', error.message);
    }
  } catch (e) {
    console.error('water shadow run failed:', e instanceof Error ? e.message : e);
  }
}
