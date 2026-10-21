import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decideDocumentDelete } from '../_shared/deletePolicy.ts';
import { canDeleteOrganizationDocument, orgCan } from '../_shared/workspaceAccess.ts';
import { isSourceFilePath, SOURCE_BUCKET } from '../_shared/sourceFiles.ts';
import { versionProbe } from '../_shared/versionProbe.ts';

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
  const probe = versionProbe(req, 'delete-document');
  if (probe) return probe;
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

    // Ownership: a personal document must belong to the caller; an organisation
    // document needs a team role that allows it. Anything else is "not found".
    const { data: found, error: docError } = await admin
      .from('documents')
      .select('id, user_id, organization_id, document_hash, vendor, invoice_number, created_at, file_url')
      .eq('id', documentId)
      .maybeSingle();
    if (docError) return json({ error: 'Could not load the invoice.' }, 500);
    const orgId: string | null = found?.organization_id ?? null;
    let allowed = !!found && !orgId && found.user_id === user.id;
    if (found && orgId) {
      const [manage, upload] = await Promise.all([
        orgCan(admin, user.id, orgId, 'records.manage'),
        orgCan(admin, user.id, orgId, 'records.upload'),
      ]);
      allowed = canDeleteOrganizationDocument(found, user.id, { manage, upload });
    }
    if (!found || !allowed) return json({ error: 'Invoice not found.' }, 404);
    const doc = found;
    // The deleted invoice's original file goes too (only unverified invoices get here).
    const removeSourceFile = async (path: unknown) => {
      if (!isSourceFilePath(path)) return;
      const { error } = await admin.storage.from(SOURCE_BUCKET).remove([path]);
      if (error) console.error('Source file not removed:', error.message);
    };

    // One transaction (pending migration 20261015100000): locks the invoice and
    // its records, checks every verified reference, deletes and writes the
    // audit entry together. Until it exists, the step-by-step path below runs.
    const { data: atomic, error: atomicError } = await admin.rpc('delete_document_atomic', {
      p_document_id: documentId, p_actor: user.id, p_allowed: true, p_user_agent: req.headers.get('user-agent'),
    });
    if (!atomicError) {
      const r = atomic as { deleted: boolean; emissions?: number; ledger?: number; reason?: string };
      if (!r.deleted) {
        return json({ error: 'This invoice has verified records. They stay for your audit trail and cannot be deleted.', reason: r.reason }, 409);
      }
      await removeSourceFile(doc.file_url);
      return json({ success: true, removed: { emissions: r.emissions ?? 0, ledger: r.ledger ?? 0 } });
    }
    if (atomicError.code === 'P0002') return json({ error: 'Invoice not found.' }, 404);
    if (atomicError.code !== 'PGRST202' && atomicError.code !== '42883') {
      // Rolled back: nothing was removed.
      console.error('delete_document_atomic failed:', atomicError.code);
      return json({ error: 'Could not remove the invoice. Nothing was changed. Try again.' }, 500);
    }

    const { data: emissions, error: emError } = await admin
      .from('emissions')
      .select('id, verified, user_id, organization_id')
      .eq('document_id', documentId);
    if (emError) return json({ error: 'Could not load the invoice records.' }, 500);

    // Rows on this document outside its workspace would mean broken ownership: stop, never delete them.
    const outside = (e: { user_id: string | null; organization_id: string | null }) =>
      orgId ? e.organization_id !== orgId : e.user_id !== user.id;
    if ((emissions ?? []).some(outside)) {
      await admin.from('security_audit_log').insert({
        event_type: 'document_delete_blocked_ownership_mismatch', user_id: user.id,
        details: { document_id: documentId },
      });
      return json({ error: 'This invoice has records linked to another account. Contact support.' }, 409);
    }

    const emissionIds = (emissions ?? []).map(e => e.id);
    // Organisation ledger rows belong to each emission's uploader, so they are found through the invoice.
    const ledgerBase = admin.from('compliance_ledger').select('id, emission_id, verification_status');
    const ledgerQuery = orgId ? ledgerBase : ledgerBase.eq('user_id', user.id);
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
      const del = admin.from('compliance_ledger').delete().in('id', decision.ledgerIds);
      const { error } = await (orgId ? del : del.eq('user_id', user.id));
      if (error) return json({ error: 'Could not remove the ledger rows.' }, 500);
    }
    if (decision.emissionIds.length) {
      const del = admin.from('emissions').delete().in('id', decision.emissionIds).eq('verified', false);
      const { error } = await (orgId ? del.eq('organization_id', orgId) : del.eq('user_id', user.id));
      if (error) return json({ error: 'Could not remove the emission records.' }, 500);
    }
    const delDoc = admin.from('documents').delete().eq('id', documentId);
    const { error: delError } = await (orgId ? delDoc.eq('organization_id', orgId) : delDoc.eq('user_id', user.id));
    if (delError) return json({ error: 'Could not remove the invoice.' }, 500);

    await admin.from('security_audit_log').insert({
      event_type: orgId ? 'document_deleted_in_organization' : 'document_deleted_by_owner',
      user_id: user.id,
      user_agent: req.headers.get('user-agent'),
      details: {
        document_id: documentId,
        organization_id: orgId,
        uploaded_by: doc.user_id,
        document_hash: doc.document_hash,
        vendor: doc.vendor,
        invoice_number: doc.invoice_number,
        uploaded_at: doc.created_at,
        emissions_removed: decision.emissionIds.length,
        ledger_rows_removed: decision.ledgerIds.length,
      },
    });

    await removeSourceFile(doc.file_url);
    return json({ success: true, removed: { emissions: decision.emissionIds.length, ledger: decision.ledgerIds.length } });
  } catch (error) {
    console.error('delete-document error:', error);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
