import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { createHandler } from './handler.ts';

/** Customer stories: admin review and publication. See handler.ts. */
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const handler = url && serviceKey
  ? createHandler({
    db: createClient(url, serviceKey, { auth: { persistSession: false } }),
    sendTemplate: sendTemplateEmail,
    linkSecret: serviceKey,
    siteUrl: 'https://senseible.earth',
  })
  : null;

Deno.serve((req) => handler
  ? handler(req)
  : new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }));
