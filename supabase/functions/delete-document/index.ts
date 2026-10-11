import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decideDocumentDelete } from '../_shared/deletePolicy.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Delete one of the caller's own invoices that was parsed wrongly or uploaded
 * twice, with the rows derived from it. Refused when anything derived from it
 * is verified (audit evidence). Every deletion is written to security_audit_log.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to delete invoices.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
    if (!UUID_RE.test(documentId)) return json({ error: 'Invalid invoice.' }, 400);

    // Ownership: the document must belong to the caller. Anything else is "not found".
    const { data: doc, error: docError } = await admin
      .from('documents')
      .select('id, user_id, document_hash, vendor, invoice_number, created_at')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (docError) return json({ error: 'Could not load the invoice.' }, 500);
    if (!doc) return json({ error: 'Invoice not found.' }, 404);

    const { data: emissions, error: emError } = await admin
      .from('emissions')
      .select('id, verified, user_id')
      .eq('document_id', documentId);
    if (emError) return json({ error: 'Could not load the invoice records.' }, 500);

    // Rows on this document owned by someone else would mean broken ownership: stop, never delete them.
    if ((emissions ?? []).some(e => e.user_id !== user.id)) {
      await admin.from('security_audit_log').insert({
        event_type: 'document_delete_blocked_ownership_mismatch', user_id: user.id,
        details: { document_id: documentId },
      });
      return json({ error: 'This invoice has records linked to another account. Contact support.' }, 409);
    }

    const emissionIds = (emissions ?? []).map(e => e.id);
    const ledgerQuery = admin.from('compliance_ledger').select('id, emission_id, verification_status').eq('user_id', user.id);
    const { data: ledger, error: ledgerError } = emissionIds.length
      ? await ledgerQuery.or(`document_id.eq.${documentId},emission_id.in.(${emissionIds.join(',')})`)
      : await ledgerQuery.eq('document_id', documentId);
    if (ledgerError) return json({ error: 'Could not load the audit ledger.' }, 500);

    const decision = decideDocumentDelete(emissions ?? [], ledger ?? []);
    if (!decision.allowed) {
      return json({
        error: 'This invoice has verified records. They stay for your audit trail and cannot be deleted.',
        reason: decision.reason,
      }, 409);
    }

    // Derived rows first (the ledger references emissions and documents), then
    // the document; emissions also cascade from the document.
    if (decision.ledgerIds.length) {
      const { error } = await admin.from('compliance_ledger').delete().in('id', decision.ledgerIds).eq('user_id', user.id);
      if (error) return json({ error: 'Could not remove the ledger rows.' }, 500);
    }
    if (decision.emissionIds.length) {
      const { error } = await admin.from('emissions').delete().in('id', decision.emissionIds).eq('user_id', user.id).eq('verified', false);
      if (error) return json({ error: 'Could not remove the emission records.' }, 500);
    }
    const { error: delError } = await admin.from('documents').delete().eq('id', documentId).eq('user_id', user.id);
    if (delError) return json({ error: 'Could not remove the invoice.' }, 500);

    await admin.from('security_audit_log').insert({
      event_type: 'document_deleted_by_owner',
      user_id: user.id,
      user_agent: req.headers.get('user-agent'),
      details: {
        document_id: documentId,
        document_hash: doc.document_hash,
        vendor: doc.vendor,
        invoice_number: doc.invoice_number,
        uploaded_at: doc.created_at,
        emissions_removed: decision.emissionIds.length,
        ledger_rows_removed: decision.ledgerIds.length,
      },
    });

    return json({ success: true, removed: { emissions: decision.emissionIds.length, ledger: decision.ledgerIds.length } });
  } catch (error) {
    console.error('delete-document error:', error);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
