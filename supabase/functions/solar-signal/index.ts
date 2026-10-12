import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeSolarSignal, type GridFactor, type SolarInput, type SolarReading } from '../_shared/solarSignal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const missingTable = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205' || e?.code === 'PGRST202';
const NOT_ENABLED = { error: 'Solar signals are not switched on yet.', code: 'not_enabled' };
const EVIDENCE = new Set(['net_meter_bill', 'generation_meter', 'inverter_export']);
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Rooftop solar signal for the signed-in user: load their system, or save it
 * with its readings and store a freshly computed signal (append-only). The
 * method is the shared one in _shared/solarSignal.ts; the grid factor comes
 * from grid_emission_factors (latest version for the region) or is absent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to save a solar signal.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'save' ? 'save' : 'load';

    const { data: asset, error: assetError } = await admin.from('solar_assets').select('*').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
    if (missingTable(assetError)) return json(NOT_ENABLED, 503);
    if (assetError) return json({ error: 'Could not load your solar system.' }, 500);

    const region = typeof body?.asset?.region === 'string' && /^[A-Z]{2}$/.test(body.asset.region) ? body.asset.region : (asset?.region ?? 'IN');
    const { data: factorRow } = await admin.from('grid_emission_factors').select('*').eq('region', region).eq('kind', 'combined_margin').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const factor: GridFactor | null = factorRow ? { kgPerKwh: Number(factorRow.kg_per_kwh), kind: 'combined_margin', region: factorRow.region, source: factorRow.source, version: factorRow.version } : null;

    if (action === 'load') {
      if (!asset) return json({ asset: null, readings: [], signal: null, factor });
      const [{ data: readings }, { data: signal }] = await Promise.all([
        admin.from('solar_readings').select('period_start, period_end, kwh, evidence').eq('asset_id', asset.id).order('period_start'),
        admin.from('credit_signals').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return json({ asset, readings: readings ?? [], signal, factor });
    }

    // ---- save ----
    const a = body?.asset ?? {};
    const capacity = Number(a.capacityKwp), accuracy = Number(a.meterAccuracyPct ?? 1);
    if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 10000) return json({ error: 'Enter the system size in kWp (up to 10,000).' }, 400);
    if (!isDate(a.commissionedOn)) return json({ error: 'Enter the commissioning date.' }, 400);
    const rawReadings: unknown[] = Array.isArray(body?.readings) ? body.readings.slice(0, 120) : [];
    const readings: SolarReading[] = [];
    for (const r of rawReadings as Record<string, unknown>[]) {
      if (!isDate(r?.periodStart) || !isDate(r?.periodEnd) || !EVIDENCE.has(String(r?.evidence))) continue;
      const kwh = Number(r.kwh);
      if (Number.isFinite(kwh) && kwh > 0 && kwh < 1e8) readings.push({ periodStart: r.periodStart, periodEnd: r.periodEnd, kwh, evidence: r.evidence as SolarReading['evidence'] });
    }
    const input: SolarInput = {
      capacityKwp: capacity, commissionedOn: a.commissionedOn, readings,
      meterAccuracyPct: Number.isFinite(accuracy) ? Math.min(10, Math.max(0, accuracy)) : 1,
      factor, registeredElsewhere: typeof a.registeredElsewhere === 'boolean' ? a.registeredElsewhere : null,
      additionality: a.additionality === 'passed_with_evidence' ? 'passed_with_evidence' : 'not_assessed',
    };
    const signal = computeSolarSignal(input);
    if (signal.checks.find((c) => c.id === 'no_overlap' && !c.pass)) return json({ error: 'Two readings cover the same days. Fix the dates and save again.', signal }, 400);

    const assetRow = {
      user_id: user.id, region, name: typeof a.name === 'string' ? a.name.slice(0, 120) || 'Rooftop solar' : 'Rooftop solar',
      capacity_kwp: capacity, commissioned_on: a.commissionedOn, meter_accuracy_pct: input.meterAccuracyPct,
      registered_elsewhere: input.registeredElsewhere, additionality: input.additionality, updated_at: new Date().toISOString(),
    };
    const saved = asset
      ? await admin.from('solar_assets').update(assetRow).eq('id', asset.id).select('*').single()
      : await admin.from('solar_assets').insert(assetRow).select('*').single();
    if (saved.error || !saved.data) return json({ error: 'Could not save your solar system.' }, 500);
    const assetId = saved.data.id;

    // Readings are replaced as a set (the form always sends the full list).
    const del = await admin.from('solar_readings').delete().eq('asset_id', assetId);
    if (del.error) return json({ error: 'Could not save the readings.' }, 500);
    if (readings.length) {
      const ins = await admin.from('solar_readings').insert(readings.map((r) => ({ asset_id: assetId, period_start: r.periodStart, period_end: r.periodEnd, kwh: r.kwh, evidence: r.evidence })));
      if (ins.error) return json({ error: 'Could not save the readings.' }, 500);
    }

    const inputsHash = await sha256Hex(JSON.stringify({ input, factorId: factorRow?.id ?? null }));
    const stored = await admin.from('credit_signals').insert({
      asset_id: assetId, method_id: signal.method.id, method_version: signal.method.version, status: signal.status,
      monitoring_start: signal.monitoringStart, monitoring_end: signal.monitoringEnd, eligible_kwh: signal.eligibleKwh,
      factor_id: signal.status === 'ready' ? factorRow?.id ?? null : null, central_tco2e: signal.centralTco2e, conservative_tco2e: signal.conservativeTco2e,
      uncertainty_pct: signal.uncertaintyPct, checks: signal.checks, inputs_hash: inputsHash,
    }).select('*').single();
    if (stored.error) return json({ error: 'Could not store the signal.' }, 500);
    return json({ asset: saved.data, signal: stored.data, factor });
  } catch (error) {
    console.error('solar-signal failed:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
});
