// Enterprise pilot: send supplier requests and reminders.
// Signed-in enterprise members only (checked again in the database). Rows are
// written by service_create_supplier_request / service_reissue_supplier_link;
// the link token goes into the email and is never stored.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkPeriod, cleanSupplier, MAX_SUPPLIERS_PER_CALL, requestEmail, type SupplierInput } from '../_shared/supplierRequests.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = (() => {
  const raw = Deno.env.get('SITE_URL')?.trim();
  try { const u = new URL(raw || 'https://senseible.earth'); return u.protocol === 'https:' || u.hostname === 'localhost' ? u.origin : 'https://senseible.earth'; }
  catch { return 'https://senseible.earth'; }
})();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Senseible <onboarding@resend.dev>', to: [to], subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Sign in first.' }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(auth.slice(7));
  const callerId = claims?.claims?.sub as string | undefined;
  if (authErr || !callerId) return json({ error: 'Sign in first.' }, 401);

  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request JSON, validated field by field below
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // The caller's enterprise, read with their own session (RLS-free RPC that checks membership).
  const { data: ent, error: entErr } = await userClient.rpc('my_enterprise');
  if (entErr) return json({ error: 'Enterprise access is not set up yet.' }, 503);
  const org = (ent ?? []).find((r: { organization_id: string | null }) => r.organization_id)?.organization_id as string | undefined;
  if (!org) return json({ error: 'This account has no enterprise access.' }, 403);
  const company = (ent ?? []).find((r: { organization_id: string | null }) => r.organization_id === org)?.company_name as string;

  if (body?.action === 'create') {
    const period = checkPeriod(body.periodStart, body.periodEnd);
    if (!period.ok) return json({ error: period.error }, 400);
    const rows: SupplierInput[] = Array.isArray(body.suppliers) ? body.suppliers : [];
    if (rows.length === 0) return json({ error: 'Add at least one supplier.' }, 400);
    if (rows.length > MAX_SUPPLIERS_PER_CALL) return json({ error: `Add up to ${MAX_SUPPLIERS_PER_CALL} suppliers at a time.` }, 400);

    const results: Array<{ name: string; ok: boolean; emailed?: boolean; error?: string }> = [];
    for (const raw of rows) {
      const c = cleanSupplier(raw);
      if (!c.ok) { results.push({ name: String(raw?.name ?? ''), ok: false, error: c.error }); continue; }
      const s = c.value;
      const { data, error } = await admin.rpc('service_create_supplier_request', {
        p_org: org, p_created_by: callerId, p_name: s.name, p_email: s.email, p_gstin: s.gstin, p_buys: s.buys,
        p_period_start: period.start, p_period_end: period.end, p_valid_days: 30,
        p_purchase_share_pct: s.purchaseSharePct, p_scope3_category: s.scope3Category,
      });
      if (error) {
        const msg = /limit/i.test(error.message) ? 'Supplier limit reached. Ask Senseible to raise it.'
          : error.code === '23505' ? 'Already asked for this period.' : 'Could not create this request.';
        results.push({ name: s.name, ok: false, error: msg });
        continue;
      }
      const row = Array.isArray(data) ? data[0] : data;
      let emailed = false;
      if (s.email && row?.token) {
        const mail = requestEmail({
          siteUrl: SITE_URL, token: row.token, companyName: company, supplierName: s.name, buys: s.buys,
          periodStart: period.start, periodEnd: period.end, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
        emailed = await send(s.email, mail.subject, mail.html);
      }
      // GSTIN-only requests reach existing accounts in the app; nothing to email.
      results.push({ name: s.name, ok: true, emailed });
    }
    return json({ results });
  }

  if (body?.action === 'remind') {
    if (typeof body.requestId !== 'string') return json({ error: 'Pick a request.' }, 400);
    const { data, error } = await admin.rpc('service_reissue_supplier_link', { p_request_id: body.requestId, p_caller: callerId, p_valid_days: 30 });
    if (error) {
      const status = error.code === '42501' ? 403 : 409;
      return json({ error: /3 days/.test(error.message) ? 'Already reminded in the last 3 days.' : /open requests/.test(error.message) ? 'This request is already closed.' : 'Not allowed.' }, status);
    }
    const r = Array.isArray(data) ? data[0] : data;
    if (!r?.supplier_email) return json({ ok: true, emailed: false });
    const mail = requestEmail({
      siteUrl: SITE_URL, token: r.token, companyName: r.company_name, supplierName: r.supplier_name, buys: null,
      periodStart: r.period_start, periodEnd: r.period_end, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), reminder: true,
    });
    return json({ ok: true, emailed: await send(r.supplier_email, mail.subject, mail.html) });
  }

  return json({ error: 'Unknown action.' }, 400);
});
