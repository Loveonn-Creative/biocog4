import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { orgCan } from '../_shared/workspaceAccess.ts';
import { isSourceFilePath, SOURCE_BUCKET, SOURCE_LINK_SECONDS } from '../_shared/sourceFiles.ts';
import { versionProbe } from '../_shared/versionProbe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "View source" in History: a short-lived link to an invoice's original file.
 * A personal invoice opens only for its uploader; an organisation invoice for
 * members whose role allows reading records (records.view). Anything else is
 * "not found". Every link issued is written to security_audit_log.
 */
Deno.serve(async (req) => {
  const probe = versionProbe(req, 'document-source-url');
  if (probe) return probe;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to open source files.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
    if (!UUID_RE.test(documentId)) return json({ error: 'Invalid invoice.' }, 400);

    // '*' so this works before and after the workspace migration adds organization_id.
    const { data: doc, error: docError } = await admin.from('documents').select('*').eq('id', documentId).maybeSingle();
    if (docError) return json({ error: 'Could not load the invoice.' }, 500);
    const orgId: string | null = (doc as { organization_id?: string | null } | null)?.organization_id ?? null;
    const allowed = !!doc && (orgId ? await orgCan(admin, user.id, orgId, 'records.view') : doc.user_id === user.id);
    if (!doc || !allowed) return json({ error: 'Invoice not found.' }, 404);

    if (!isSourceFilePath(doc.file_url)) {
      return json({ error: 'The original file was not kept for this invoice. Files are kept for invoices added after source storage was switched on.', code: 'no_source_file' }, 404);
    }

    const { data: signed, error: signError } = await admin.storage.from(SOURCE_BUCKET).createSignedUrl(doc.file_url, SOURCE_LINK_SECONDS);
    if (signError || !signed?.signedUrl) return json({ error: 'The original file could not be opened. Try again.' }, 500);

    await admin.from('security_audit_log').insert({
      event_type: 'document_source_viewed',
      user_id: user.id,
      user_agent: req.headers.get('user-agent'),
      details: { document_id: doc.id, organization_id: orgId, uploaded_by: doc.user_id, document_hash: doc.document_hash },
    });

    return json({ url: signed.signedUrl, expiresIn: SOURCE_LINK_SECONDS });
  } catch (error) {
    console.error('document-source-url failed:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'The original file could not be opened. Try again.' }, 500);
  }
});
