import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { createHandler } from './handler.ts';

/**
 * Customer stories: prefill, submit and withdraw. See handler.ts.
 * Secrets used: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (storage and the key
 * withdrawal links are derived from) and LOVABLE_API_KEY (email, IP-hash salt).
 */
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const lovableKey = Deno.env.get('LOVABLE_API_KEY');

const handler = url && serviceKey && lovableKey
  ? createHandler({
    db: createClient(url, serviceKey, { auth: { persistSession: false } }),
    sendTemplate: sendTemplateEmail,
    linkSecret: serviceKey,
    ipSalt: lovableKey,
    siteUrl: 'https://senseible.earth',
  })
  : null;

Deno.serve((req) => handler
  ? handler(req)
  : new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }));
