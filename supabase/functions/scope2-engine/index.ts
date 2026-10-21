import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recalculateOwner, scope2NotEnabled } from '../_shared/scope2Record.ts';
import { versionProbe } from '../_shared/versionProbe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const NOT_ENABLED = { error: 'Scope 2 dual reporting is not switched on yet.', code: 'not_enabled' };
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const TYPES = new Set(['eac', 'ppa', 'green_tariff', 'supplier_contract']);
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Scope 2 engine for the signed-in user.
 * - register_instrument: records a contractual instrument (certificate, PPA,
 *   green tariff, supplier contract) with its registry reference, quantity,
 *   market, vintage, retirement and evidence document, then recalculates.
 *   Eligibility (Scope 2 Quality Criteria) is decided per reporting year by
 *   the shared engine; an instrument that fails a check is kept but not
 *   allocated, and the reason is returned.
 * - recalculate: location- and market-based results from the user's
 *   consumption records, approved factors and instruments.
 */
Deno.serve(async (req) => {
  const probe = versionProbe(req, "scope2-engine");
  if (probe) return probe;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to manage Scope 2.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
    const body = await req.json().catch(() => ({}));

    if (body?.action === 'register_instrument') {
      const i = body.instrument ?? {};
      const mwh = Number(i.mwh), rate = Number(i.kgPerKwh ?? 0);
      if (!TYPES.has(i.type)) return json({ error: 'Choose the instrument type.' }, 400);
      if (!text(i.scheme, 60)) return json({ error: 'Name the scheme or registry (for example I-REC).' }, 400);
      if (!(mwh > 0 && mwh < 1e8)) return json({ error: 'Enter the quantity in MWh.' }, 400);
      if (!/^[A-Z]{2}$/.test(String(i.generationCountry ?? ''))) return json({ error: 'Enter the country of generation.' }, 400);
      if (!isDate(i.vintageStart) || !isDate(i.vintageEnd) || i.vintageEnd < i.vintageStart) return json({ error: 'Enter the generation period (vintage).' }, 400);
      if (!(rate >= 0 && rate < 3)) return json({ error: 'Enter the emission rate the instrument conveys (0 for renewable generation).' }, 400);
      if (i.retired === true && !text(i.retirementRef, 120)) return json({ error: 'Enter the retirement or cancellation reference.' }, 400);
      let evidence: string | null = null;
      if (typeof i.evidenceDocumentId === 'string') {
        const { data: doc } = await admin.from('documents').select('id').eq('id', i.evidenceDocumentId).eq('user_id', user.id).maybeSingle();
        if (!doc) return json({ error: 'The evidence document was not found in your records.' }, 400);
        evidence = doc.id;
      }
      const ins = await admin.from('electricity_instruments').insert({
        user_id: user.id, type: i.type, scheme: text(i.scheme, 60), certificate_ref: text(i.certificateRef, 120), mwh,
        generation_country: i.generationCountry, generation_region: text(i.generationRegion, 20), vintage_start: i.vintageStart, vintage_end: i.vintageEnd,
        kg_per_kwh: rate, retired: i.retired === true, retirement_ref: text(i.retirementRef, 120), beneficiary_confirmed: i.beneficiaryConfirmed === true,
        evidence_document_id: evidence,
      }).select('id').single();
      if (scope2NotEnabled(ins.error)) return json(NOT_ENABLED, 503);
      if (ins.error?.code === '23505') return json({ error: 'This certificate is already registered and cannot be claimed twice.' }, 409);
      if (ins.error) return json({ error: 'Could not record the instrument.' }, 500);
      const r = await recalculateOwner(admin, user.id);
      return json({ instrumentId: ins.data.id, recalculated: r });
    }

    if (body?.action === 'recalculate') {
      const r = await recalculateOwner(admin, user.id);
      if (!r) {
        const probe = await admin.from('electricity_activities').select('id').limit(1);
        if (scope2NotEnabled(probe.error)) return json(NOT_ENABLED, 503);
        return json({ error: 'Could not recalculate.' }, 500);
      }
      return json(r);
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    console.error('scope2-engine error:', e instanceof Error ? e.message : e);
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
});
