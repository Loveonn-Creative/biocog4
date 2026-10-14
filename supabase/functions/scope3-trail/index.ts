import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recordExtraction, scope3NotEnabled } from '../_shared/scope3Record.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const NOT_ENABLED = { error: 'The Scope 3 trail is not switched on yet.', code: 'not_enabled' };
const MAX_DOCUMENTS = 200;

/**
 * Recalculates the signed-in user's Scope 3 trail from their sealed
 * extractions with the factors approved now (for example after a supplier's
 * own factor is added). Reads only server-sealed OCR fields, never browser
 * data; writes only through scope3_record_document. Unchanged lines are kept,
 * changed ones get a new row and the old one stays as history.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to see your Scope 3 trail.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.action !== 'recalculate') return json({ error: 'Unknown action.' }, 400);
    const one = typeof body?.documentId === 'string' && /^[0-9a-f-]{36}$/i.test(body.documentId) ? body.documentId : null;

    let q = admin.from('document_extractions').select('id, document_id, user_id, organization_id, extraction').eq('user_id', user.id).order('created_at', { ascending: true }).limit(MAX_DOCUMENTS);
    if (one) q = q.eq('document_id', one);
    const { data: rows, error } = await q;
    if (scope3NotEnabled(error)) return json(NOT_ENABLED, 503);
    if (error) return json({ error: 'Could not read your invoices.' }, 500);
    if (one && !rows?.length) return json({ error: 'Invoice not found.' }, 404);

    let processed = 0, written = 0, failed = 0;
    // Oldest first, so the first upload of an invoice stays the counted one.
    for (const row of rows ?? []) {
      const r = await recordExtraction(admin, row);
      if (r) { processed++; written += r.written; } else failed++;
    }
    return json({ processed, written, failed, capped: (rows?.length ?? 0) >= MAX_DOCUMENTS });
  } catch (e) {
    console.error('scope3-trail error:', e instanceof Error ? e.message : e);
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
});
