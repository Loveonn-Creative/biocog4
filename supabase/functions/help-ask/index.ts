// Help Center assistant: answers a question only from Help Center articles
// (_shared/helpArticles.ts), which the server looks up itself. The browser
// sends a question and the slugs of the articles its search found; it cannot
// send instructions or article text (_shared/helpAsk.ts).
//
// Daily limit per caller (HELP_ASK_DAILY): guests by a keyed hash of their
// network address, signed-in users by account, never stored in plain form.
// Counts reuse the intelligence_usage table with the daily 'guest_scan'
// window; the subject is a hash prefixed "help|", so these counts never mix
// with invoice reads or Intelligence questions. No new table is needed.
//
// Reply: { answer: string | null, slugs: string[], used, limit }. answer is
// null when the articles do not cover the question; the page then offers the
// Contact form.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiConfigured, aiFetch } from '../_shared/aiFetch.ts';
import { HELP_ASK_DAILY, helpAnswer, helpSystemPrompt, parseHelpAsk } from '../_shared/helpAsk.ts';
import { clientIp, guestSubject, planForUser, takeUse } from '../_shared/intelligenceUsage.ts';
import { dayIst } from '../_shared/intelligence.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Not found.' }, 404);

  try {
    const input = parseHelpAsk(await req.json().catch(() => ({})));
    if (!input.ok) return json({ error: input.error }, input.status);
    const slugs = input.articles.map((a) => a.slug);
    // Nothing in the Help Center matches: say so without a model call or a used question.
    if (!input.articles.length) return json({ answer: null, slugs });
    if (!aiConfigured()) return json({ answer: null, slugs });

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Identity from the verified JWT only; the publishable key means a guest.
    const authHeader = req.headers.get('Authorization') ?? '';
    let userId: string | null = null;
    if (/^Bearer\s+\S+/i.test(authHeader)) {
      const db = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
      const { data } = await db.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
      userId = data?.user?.id ?? null;
    }
    const audience = userId ? await planForUser(admin, userId) : 'guest';
    const limit = HELP_ASK_DAILY[audience];
    const day = dayIst();
    const subject = await guestSubject(userId ? `help|u:${userId}` : `help|ip|${clientIp(req.headers)}`, day, serviceKey);
    const use = await takeUse(admin, subject, 'guest_scan', limit);
    if (!use.allowed) {
      return json({ error: 'You have used today’s help questions. Search the articles, or message us.', code: 'help_daily_limit', limit }, 429);
    }

    const response = await aiFetch({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'system', content: helpSystemPrompt(input.articles, input.language) }, { role: 'user', content: input.question }],
        max_tokens: 250,
        temperature: 0,
        stream: false,
      }),
    });
    if (!response.ok) {
      console.error('help-ask AI error', response.status);
      return json({ answer: null, slugs, used: use.used, limit });
    }
    const data = await response.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null;
    return json({ answer: helpAnswer(data?.choices?.[0]?.message?.content), slugs, used: use.used, limit });
  } catch (e) {
    console.error('help-ask failed', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Help answers are unavailable right now. Search the articles, or message us.' }, 500);
  }
});
