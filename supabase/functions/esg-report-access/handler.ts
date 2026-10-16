// Gated access to the sample ESG report. Three actions:
//   request   a visitor fills the six-question form; after the email checks
//             (syntax, disposable, placeholder, typo, mail server) a private
//             link is emailed to that address and the team is notified.
//   download  the emailed link's token returns the PDF; downloads are counted.
//   account   a signed-in user with a confirmed email gets the PDF directly.
// The report is never served without one of those. Leads live in the private
// resource_leads table (service role only); IPs are kept only as a salted hash.
import {
  EMAIL_MESSAGES, INDUSTRIES, LEAD_RETENTION_DAYS, LINK_VALID_DAYS, MAX_DOWNLOADS_PER_LINK, NEEDS, NOTICE_VERSION,
  RESOURCE, ROLES, labelOf, maskEmail, mxVerdict, validateLead, type DnsAnswer,
} from '../_shared/resourceLead.ts';
import { sha256Hex, signLink, verifyLink } from '../_shared/resourceLink.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'content-disposition',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DAY_MS = 86_400_000;
const ACCOUNT_RETENTION_DAYS = 548; // 18 months, the Privacy Policy's period for signed-in users.
const RESEND_COOLDOWN_MS = 60_000;
const MAX_SENDS_PER_DAY = 3;
const MAX_REQUESTS_PER_IP_HOUR = 5;

// The service-role Supabase client; typed loosely so tests can pass an in-memory stand-in.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  /** sendTemplateEmail from _shared/transactional-email-templates. */
  sendTemplate: (name: string, to: string, opts: { templateData: Record<string, unknown>; idempotencyKey?: string; replyTo?: string }) => Promise<{ sent: boolean }>;
  /** Plain fallback for the team notification if the template service fails. */
  notifyFallback?: (subject: string, lines: string[]) => Promise<boolean>;
  /** GET a DNS-over-HTTPS JSON URL; null on any failure. */
  dnsJson: (url: string) => Promise<DnsAnswer | null>;
  linkSecret: string;
  ipSalt: string;
  siteUrl: string;
  /** The report bytes from private storage; null when the file is not uploaded yet. */
  loadPdf: () => Promise<Uint8Array | null>;
  now?: () => number;
}

const missingTable = (e: { code?: string } | null | undefined) => !!e && (e.code === '42P01' || e.code === 'PGRST205');

async function lookupMx(domain: string, dnsJson: Deps['dnsJson']) {
  const q = (type: string) => dnsJson(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`)
    .then((r) => r ?? dnsJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`));
  const mx = await q('MX');
  const needAddress = mx && mx.Status === 0 && !(mx.Answer ?? []).some((a) => a.type === 15);
  const address = needAddress ? await q('A') : null;
  return mxVerdict(mx, address);
}

export function createHandler(deps: Deps) {
  const now = deps.now ?? Date.now;

  const UNAVAILABLE = 'The report is being updated. We have your request and will email it to you within one working day.';
  const pdfResponse = async () => {
    const bytes = await deps.loadPdf();
    if (!bytes) return json({ error: 'unavailable' }, 503);
    return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      ...corsHeaders,
      // octet-stream so supabase.functions.invoke hands the browser a Blob.
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${RESOURCE.fileName}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
    });
  };

  async function notifyTeam(data: Record<string, unknown>, leadId: string | null): Promise<'sent' | 'fallback' | 'failed'> {
    try {
      const r = await deps.sendTemplate('resource-lead', '', { templateData: data, idempotencyKey: leadId ? `resource-lead-${leadId}` : undefined, replyTo: data.email as string | undefined });
      if (r.sent) return 'sent';
    } catch (e) {
      console.error('resource lead notification failed', leadId, (e as Error)?.message);
    }
    if (deps.notifyFallback) {
      const lines = Object.entries(data).map(([k, v]) => `${k}: ${v ?? ''}`);
      const ok = await deps.notifyFallback(`[Report request] ${data.company || data.email}`, lines).catch(() => false);
      if (ok) return 'fallback';
    }
    return 'failed';
  }

  async function purgeExpired() {
    const { error } = await deps.db.from('resource_leads').delete().lt('expires_at', new Date(now()).toISOString());
    if (error && !missingTable(error)) console.error('resource lead purge failed', error.code);
  }

  async function request(raw: Record<string, unknown>, ipHash: string) {
    const result = validateLead(raw);
    if (!result.ok) return json({ error: 'Check the highlighted fields.', fields: result.errors, suggestion: result.suggestion }, 400);
    const lead = result.value;

    const mx = await lookupMx(result.domain, deps.dnsJson);
    if (mx === 'no_domain' || mx === 'no_mail') return json({ error: 'Check the highlighted fields.', fields: { email: EMAIL_MESSAGES.no_mail } }, 400);
    if (mx === 'disposable') return json({ error: 'Check the highlighted fields.', fields: { email: EMAIL_MESSAGES.disposable } }, 400);

    const t = now();
    const iso = new Date(t).toISOString();
    const today = iso.slice(0, 10);
    const emailHash = await sha256Hex(lead.email);

    await purgeExpired();
    let stored = true;
    const { count, error: countError } = await deps.db.from('resource_leads')
      .select('id', { count: 'exact', head: true }).eq('request_ip_hash', ipHash).gte('updated_at', new Date(t - 3_600_000).toISOString());
    if (countError) {
      if (missingTable(countError)) stored = false;
      else throw countError;
    }
    if (stored && (count ?? 0) >= MAX_REQUESTS_PER_IP_HOUR) return json({ error: 'Too many requests from this network. Try again in an hour.' }, 429);

    let existing: { id: string; last_sent_at: string | null; send_day: string | null; sends_on_day: number; send_count: number } | null = null;
    if (stored) {
      const { data, error } = await deps.db.from('resource_leads').select('id, last_sent_at, send_day, sends_on_day, send_count')
        .eq('resource', RESOURCE.id).eq('email', lead.email).maybeSingle();
      if (error) throw error;
      existing = data;
      if (existing?.last_sent_at && t - Date.parse(existing.last_sent_at) < RESEND_COOLDOWN_MS) {
        return json({ success: true, sent: true, email: maskEmail(lead.email), repeat: true });
      }
      if (existing && existing.send_day === today && existing.sends_on_day >= MAX_SENDS_PER_DAY) {
        return json({ error: 'This link was sent 3 times today. Check your spam folder, or try again tomorrow.' }, 429);
      }
    }

    const answers = {
      name: lead.name, company: lead.company, industry: lead.industry, role: lead.role, primary_need: lead.need,
      free_mailbox: result.freeMailbox, mx_status: mx === 'ok' ? 'ok' : 'unknown',
      marketing_consent: lead.marketing, notice_version: NOTICE_VERSION, consented_at: iso,
      request_ip_hash: ipHash, updated_at: iso, expires_at: new Date(t + LEAD_RETENTION_DAYS * DAY_MS).toISOString(),
    };
    let leadId: string | null = existing?.id ?? null;
    if (stored && !existing) {
      const { data, error } = await deps.db.from('resource_leads')
        .insert({ resource: RESOURCE.id, email: lead.email, email_hash: emailHash, source: 'form', ...answers }).select('id').single();
      if (error && error.code !== '23505') throw error;
      leadId = data?.id ?? null;
    } else if (stored && existing) {
      const { error } = await deps.db.from('resource_leads').update(answers).eq('id', existing.id);
      if (error) throw error;
    }

    // Never email a link that would lead nowhere: without the file, the team follows up by hand.
    const available = !!(await deps.loadPdf());
    const token = await signLink({ r: RESOURCE.id, h: emailHash, x: Math.floor((t + LINK_VALID_DAYS * DAY_MS) / 1000) }, deps.linkSecret);
    const link = `${deps.siteUrl}${RESOURCE.path}?access=${token}`;
    let delivery: 'sent' | 'suppressed' | 'failed' = 'failed';
    if (available) try {
      const sent = await deps.sendTemplate('resource-delivery', lead.email, {
        templateData: { name: lead.name.split(' ')[0], link, validDays: LINK_VALID_DAYS, title: RESOURCE.title, pages: RESOURCE.pages },
        idempotencyKey: `resource-delivery-${emailHash.slice(0, 32)}-${t}`,
      });
      delivery = sent.sent ? 'sent' : 'suppressed';
    } catch (e) {
      console.error('resource delivery failed', leadId, (e as Error)?.message);
    }

    if (stored && leadId) {
      const sendsOnDay = existing && existing.send_day === today ? existing.sends_on_day + 1 : 1;
      const patch: Record<string, unknown> = { delivery_status: delivery };
      if (delivery === 'sent') Object.assign(patch, { last_sent_at: iso, send_day: today, sends_on_day: sendsOnDay, send_count: (existing?.send_count ?? 0) + 1 });
      const { error } = await deps.db.from('resource_leads').update(patch).eq('id', leadId);
      if (error) console.error('resource lead status update failed', leadId, error.code);
    }

    // The team hears about each new person once (and about every lead while the table is not applied).
    if (!existing) {
      const status = await notifyTeam({
        resource: RESOURCE.title, source: 'form', name: lead.name, email: lead.email, company: lead.company,
        industry: labelOf(INDUSTRIES, lead.industry), role: labelOf(ROLES, lead.role), need: labelOf(NEEDS, lead.need),
        mailbox: `${result.freeMailbox ? 'Personal mailbox' : 'Work domain'}${mx === 'ok' ? ', mail server found' : ', mail server not checked'}; ${available ? `report link ${delivery}` : 'REPORT FILE NOT UPLOADED: send the report by hand'}`,
        marketing: lead.marketing, stored: stored && !!leadId, leadId: leadId ?? '', at: iso,
      }, leadId);
      if (stored && leadId) await deps.db.from('resource_leads').update({ notify_status: status }).eq('id', leadId);
    }

    if (!available) return json({ error: UNAVAILABLE }, 503);
    if (delivery === 'suppressed') return json({ error: 'This address is not accepting our emails. Use another work email.', fields: { email: 'This address is not accepting our emails.' } }, 422);
    if (delivery === 'failed') return json({ error: 'We could not send the email just now. Try again in a minute.' }, 502);
    return json({ success: true, sent: true, email: maskEmail(lead.email) });
  }

  async function download(token: unknown) {
    const v = await verifyLink(token, deps.linkSecret, now());
    if (!v.ok) return json({ error: v.reason === 'expired' ? 'expired' : 'invalid' }, 410);
    if (v.claims.r !== RESOURCE.id) return json({ error: 'invalid' }, 410);
    if (!(await deps.loadPdf())) return json({ error: 'unavailable' }, 503);
    const { data, error } = await deps.db.from('resource_leads').select('id, downloads, verified_at, first_downloaded_at')
      .eq('resource', RESOURCE.id).eq('email_hash', v.claims.h).maybeSingle();
    if (error && !missingTable(error)) throw error;
    if (data) {
      if (data.downloads >= MAX_DOWNLOADS_PER_LINK) return json({ error: 'overused' }, 429);
      const iso = new Date(now()).toISOString();
      const { error: updateError } = await deps.db.from('resource_leads').update({
        downloads: data.downloads + 1, last_downloaded_at: iso,
        first_downloaded_at: data.first_downloaded_at ?? iso, verified_at: data.verified_at ?? iso,
      }).eq('id', data.id);
      if (updateError) console.error('resource download count failed', data.id, updateError.code);
    }
    return await pdfResponse();
  }

  async function account(req: Request) {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!jwt) return json({ error: 'sign_in' }, 401);
    const { data, error } = await deps.db.auth.getUser(jwt);
    const user = data?.user;
    if (error || !user?.email) return json({ error: 'sign_in' }, 401);
    if (!user.email_confirmed_at) return json({ error: 'confirm_email' }, 403);
    if (!(await deps.loadPdf())) return json({ error: 'unavailable' }, 503);

    const t = now();
    const iso = new Date(t).toISOString();
    const email = String(user.email).toLowerCase();
    const emailHash = await sha256Hex(email);
    const { data: existing, error: findError } = await deps.db.from('resource_leads').select('id, downloads, first_downloaded_at')
      .eq('resource', RESOURCE.id).eq('email', email).maybeSingle();
    const stored = !missingTable(findError);
    if (findError && stored) throw findError;

    if (stored && existing) {
      await deps.db.from('resource_leads').update({
        user_id: user.id, downloads: existing.downloads + 1, last_downloaded_at: iso, first_downloaded_at: existing.first_downloaded_at ?? iso,
        updated_at: iso, expires_at: new Date(t + ACCOUNT_RETENTION_DAYS * DAY_MS).toISOString(),
      }).eq('id', existing.id);
      return await pdfResponse();
    }

    let leadId: string | null = null;
    if (stored) {
      const { data: saved, error: saveError } = await deps.db.from('resource_leads').insert({
        resource: RESOURCE.id, email, email_hash: emailHash, source: 'account', user_id: user.id, mx_status: 'account',
        notice_version: NOTICE_VERSION, consented_at: iso, delivery_status: 'direct', downloads: 1, verified_at: user.email_confirmed_at,
        first_downloaded_at: iso, last_downloaded_at: iso, updated_at: iso, expires_at: new Date(t + ACCOUNT_RETENTION_DAYS * DAY_MS).toISOString(),
      }).select('id').single();
      if (saveError && saveError.code !== '23505') throw saveError;
      leadId = saved?.id ?? null;
    }
    const status = await notifyTeam({
      resource: RESOURCE.title, source: 'account', email, company: user.user_metadata?.business_name || undefined,
      mailbox: 'Signed-in account, email confirmed', marketing: false, stored: !!leadId, leadId: leadId ?? '', at: iso,
    }, leadId);
    if (leadId) await deps.db.from('resource_leads').update({ notify_status: status }).eq('id', leadId);
    return await pdfResponse();
  }

  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const raw = await req.json().catch(() => null);
      if (!raw || typeof raw !== 'object') return json({ error: 'Something went wrong. Please try again.' }, 400);
      const action = (raw as Record<string, unknown>).action;
      if (action === 'download') return await download((raw as Record<string, unknown>).token);
      if (action === 'account') return await account(req);
      if (action !== 'request') return json({ error: 'Something went wrong. Please try again.' }, 400);
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      return await request(raw as Record<string, unknown>, await sha256Hex(`${deps.ipSalt}:${ip}`));
    } catch (error) {
      // No personal details in logs (DPDP).
      console.error('esg-report-access error:', (error as { code?: string; message?: string })?.code ?? (error as Error)?.message ?? 'unknown');
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}
