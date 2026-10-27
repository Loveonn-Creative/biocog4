// Lifecycle emails, run once a day by a scheduled job (.github/workflows/lifecycle-email.yml).
// Today it sends one email: the plan-ending reminder (_shared/planEndingEmail.ts).
//
// Safety:
// * Refuses every call without the LIFECYCLE_CRON_SECRET header, and does
//   nothing at all while that secret is unset.
// * LIFECYCLE_EMAILS=off stops all sending at once.
// * Each email is claimed in email_log (unique key) before it is sent, so a
//   repeated run never sends it twice. A temporary failure releases the
//   claim; a refused address keeps it (marked failed) so it is not retried.
// * dryRun returns counts only and sends nothing.
// * Only confirmed emails; enterprise accounts are left to the team.
// Touches no other email function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { planEndingDue, planEndingEmail, type SubscriptionRow } from "../_shared/planEndingEmail.ts";

const FROM = "Senseible <noreply@senseible.earth>";
const SITE_URL = "https://senseible.earth";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('LIFECYCLE_CRON_SECRET') ?? '';
  const given = req.headers.get('x-cron-secret') ?? '';
  if (secret.length < 24 || !sameSecret(given, secret)) return json({ error: 'Unauthorized' }, 401);

  let dryRun = false;
  try { dryRun = (await req.json())?.dryRun === true; } catch { /* empty body */ }
  const off = (Deno.env.get('LIFECYCLE_EMAILS') ?? '').toLowerCase() === 'off';
  const RESEND = Deno.env.get('RESEND_API_KEY');
  if (!dryRun && (off || !RESEND)) return json({ sent: 0, off: true });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = new Date();
  const from = new Date(now.getTime() - 3 * 86_400_000).toISOString();
  const to = new Date(now.getTime() + 8 * 86_400_000).toISOString();

  // Accounts whose paid period ends within the window, from either record.
  const [subs, profs] = await Promise.all([
    admin.from('subscriptions').select('user_id').eq('status', 'active').gte('expires_at', from).lte('expires_at', to).limit(2000),
    admin.from('profiles').select('id').gte('subscription_expires_at', from).lte('subscription_expires_at', to).limit(2000),
  ]);
  if (subs.error || profs.error) return json({ error: 'Could not read plans' }, 500);
  const userIds = [...new Set([...(subs.data ?? []).map((r) => r.user_id as string), ...(profs.data ?? []).map((r) => r.id as string)])].filter(Boolean);

  // The send log must exist before anything is sent (it is what prevents repeats).
  const logCheck = await admin.from('email_log').select('id', { head: true, count: 'exact' }).limit(1);
  if (logCheck.error) return json({ error: 'Send log missing; nothing sent' }, 500);

  const result = { checked: userIds.length, due: 0, sent: 0, skipped: 0, failed: 0, dryRun };
  for (const userId of userIds) {
    const [rows, prof] = await Promise.all([
      admin.from('subscriptions').select('tier, expires_at, status').eq('user_id', userId).eq('status', 'active'),
      admin.from('profiles').select('subscription_tier, subscription_expires_at, business_name').eq('id', userId).maybeSingle(),
    ]);
    if (rows.error || prof.error) { result.failed++; continue; }
    const due = planEndingDue(
      userId,
      prof.data ? { tier: prof.data.subscription_tier, expiresAt: prof.data.subscription_expires_at } : null,
      (rows.data ?? []) as SubscriptionRow[],
      now,
    );
    if (!due) continue;

    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email?.trim();
    if (!email || !u?.user?.email_confirmed_at) { result.skipped++; continue; }
    // Enterprise terms are custom and handled by the team.
    const ent = await admin.from('enterprise_access').select('id').eq('email', email.toLowerCase()).eq('status', 'active').maybeSingle();
    if (!ent.error && ent.data) { result.skipped++; continue; }
    // Already sent?
    const seen = await admin.from('email_log').select('id').eq('dedupe_key', due.dedupeKey).maybeSingle();
    if (seen.data) continue;
    result.due++;
    if (dryRun) continue;

    const claim = await admin.from('email_log').insert({ user_id: userId, kind: 'plan_ending', dedupe_key: due.dedupeKey }).select('id').maybeSingle();
    if (claim.error || !claim.data) { result.skipped++; continue; }
    const mail = planEndingEmail(due, prof.data?.business_name ?? null, now, SITE_URL);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json', 'Idempotency-Key': due.dedupeKey },
        body: JSON.stringify({ from: FROM, to: [email], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (!res.ok) {
        // A refused address (4xx other than rate limiting) will fail every day:
        // keep the claim, marked failed, so it is not retried. Anything else
        // (rate limit, 5xx, network) releases the claim for the next run.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          await admin.from('email_log').update({ provider_id: `failed:${res.status}` }).eq('id', claim.data.id);
          result.failed++;
          continue;
        }
        throw new Error(`resend ${res.status}`);
      }
      const out = await res.json().catch(() => ({}));
      await admin.from('email_log').update({ provider_id: typeof out?.id === 'string' ? out.id : null }).eq('id', claim.data.id);
      result.sent++;
    } catch (e) {
      await admin.from('email_log').delete().eq('id', claim.data.id);
      console.error('lifecycle-mailer send failed:', e instanceof Error ? e.message : 'unknown');
      result.failed++;
    }
  }
  return json(result);
});
