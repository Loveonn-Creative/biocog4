import { createClient } from 'npm:@supabase/supabase-js@2';
import { COMMITMENTS, LANES, validateApplication } from '../_shared/ambassadorApplication.ts';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';

/**
 * Decarbonize India: stores one Impact Ambassador application and tells the
 * program coordinator. The applicant's answers are stored exactly as written.
 * Applications live in the private ambassador_applications table (service
 * role only). Three submissions per network per hour; one per email.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') return json({ error: 'Check your answers and try again.' }, 400);
    const result = validateApplication(raw as Record<string, unknown>);
    if (!result.ok) return json({ error: 'Check your answers and try again.', fields: result.errors }, 400);
    const app = result.value;

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const secret = Deno.env.get('LOVABLE_API_KEY');
    if (!url || !key || !secret) throw new Error('Application service unavailable');
    const db = createClient(url, key, { auth: { persistSession: false } });

    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${ip}`));
    const ipHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await db.from('ambassador_applications')
      .select('id', { count: 'exact', head: true }).eq('request_ip_hash', ipHash).gte('created_at', since);
    if (countError) {
      // Table not created yet: applications are not open through the site.
      if (countError.code === '42P01' || countError.code === 'PGRST205') return json({ error: 'not_open' }, 503);
      throw countError;
    }
    if ((count ?? 0) >= 3) return json({ error: 'Too many applications from this network. Try again in an hour.' }, 429);

    const { data: saved, error: saveError } = await db.from('ambassador_applications').insert({
      name: app.name, email: app.email, whatsapp: app.whatsapp, city: app.city, lanes: app.lanes,
      commitment: app.commitment, first_move: app.firstMove, work_link: app.workLink,
      confirmations: { reviewedPlatform: true, ownWords: true, selfless: true, at: new Date().toISOString() },
      request_ip_hash: ipHash,
    }).select('id').single();
    if (saveError?.code === '23505') return json({ success: true, duplicate: true });
    if (saveError || !saved) throw saveError || new Error('Unable to save application');

    let emailStatus: 'sent' | 'suppressed' | 'failed' = 'failed';
    try {
      const sent = await sendTemplateEmail('ambassador-application', 'palanisamy@senseible.earth', {
        templateData: {
          name: app.name, email: app.email, whatsapp: app.whatsapp, city: app.city,
          lanes: app.lanes.map((id) => LANES.find((l) => l.id === id)?.label || id),
          commitment: COMMITMENTS.find((c) => c.id === app.commitment)?.label || app.commitment,
          firstMove: app.firstMove, workLink: app.workLink, applicationId: saved.id,
        },
        idempotencyKey: `ambassador-application-${saved.id}`,
        replyTo: app.email,
      });
      emailStatus = sent.sent ? 'sent' : 'suppressed';
    } catch (sendError) {
      console.error('Ambassador application notification failed', saved.id, sendError);
    }
    const { error: statusError } = await db.from('ambassador_applications').update({ email_status: emailStatus }).eq('id', saved.id);
    if (statusError) console.error('Ambassador email status update failed', saved.id, statusError);

    // Saved either way; the program team can see every application in the table.
    return json({ success: true });
  } catch (error) {
    console.error('submit-ambassador-application error:', error);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
