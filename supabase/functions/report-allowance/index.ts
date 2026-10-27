import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { versionProbe } from '../_shared/versionProbe.ts';
import { reportDownloadKey } from '../_shared/reportDownloadKey.ts';
import { reportAllowance } from '../_shared/reportAllowance.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Asked by the Reports page before it builds a report file for a signed-in
 * user. Body: { reportId, kind } (see _shared/reportDownloadKey.ts).
 * Answers { allowed: true, unlimited: true } on paid plans; on the free plan
 * { allowed, used, limit, resetsOn, repeat }; { allowed: true, degraded: true }
 * when the plan or the count cannot be read. Viewing reports never calls this.
 */
Deno.serve(async (req) => {
  const probe = versionProbe(req, 'report-allowance');
  if (probe) return probe;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Sign in to download reports.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

  const body = await req.json().catch(() => null);
  const key = reportDownloadKey(body?.reportId, body?.kind);
  if (!key) return json({ error: 'Invalid report.' }, 400);

  try {
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    return json(await reportAllowance(admin, user.id, key, new Date(), user.email ?? null));
  } catch (error) {
    console.error('report-allowance failed:', error instanceof Error ? error.message : 'unknown');
    return json({ allowed: true, degraded: true });
  }
});
