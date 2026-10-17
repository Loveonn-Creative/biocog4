import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { internalInbox } from '../_shared/internalInbox.ts';
import { RESOURCE, type DnsAnswer } from '../_shared/resourceLead.ts';
import { createHandler } from './handler.ts';

/**
 * Sample ESG report: gated access. See handler.ts for the three actions.
 * The PDF is read from Storage: bucket gated-resources, file
 * esg-report-sample-2026.pdf. Secrets used: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (storage, and the
 * key the download links are derived from), LOVABLE_API_KEY (email, IP-hash
 * salt) and, as a fallback for the team notification only, RESEND_API_KEY.
 */
// The repository is public, so the PDF lives only in the private
// gated-resources bucket (uploaded once by the team) and is cached per instance.
const BUCKET = 'gated-resources';
const OBJECT = `${RESOURCE.id}.pdf`;
let pdfCache: Uint8Array | null = null;

async function dnsJson(url: string): Promise<DnsAnswer | null> {
  try {
    const res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(2500) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Team notification fallback: the same inbox the contact form uses.
async function notifyFallback(subject: string, lines: string[]): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  const inbox = internalInbox();
  if (!key || !inbox) return false;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Senseible Leads <onboarding@resend.dev>',
      to: [inbox],
      subject,
      html: `<p>${lines.map(esc).join('<br>')}</p>`,
    }),
  });
  return res.ok;
}

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const lovableKey = Deno.env.get('LOVABLE_API_KEY');

const db = url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

async function loadPdf(): Promise<Uint8Array | null> {
  if (pdfCache) return pdfCache;
  if (!db) return null;
  const { data, error } = await db.storage.from(BUCKET).download(OBJECT);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  // Only ever serve a real PDF.
  if (bytes.length < 1024 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return null;
  pdfCache = bytes;
  return bytes;
}

const handler = db && serviceKey && lovableKey
  ? createHandler({
    db,
    sendTemplate: sendTemplateEmail,
    notifyFallback,
    dnsJson,
    linkSecret: serviceKey,
    ipSalt: lovableKey,
    siteUrl: 'https://senseible.earth',
    loadPdf,
  })
  : null;

Deno.serve((req) => handler
  ? handler(req)
  : new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }));
