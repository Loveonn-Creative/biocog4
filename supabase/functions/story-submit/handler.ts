// Customer stories: the public side. Three actions:
//   prefill   signed-in only: company, sector and account figures to start from
//             (the visitor sees them and chooses whether to include them).
//   submit    validates the answers, rebuilds the story server-side, checks it
//             is exactly the story the person previewed, stores it with the
//             consent record, notifies the team and confirms to the person.
//   withdraw  the signed link from the confirmation email takes a story down.
// Nothing is public until an admin publishes it with story-review.
import {
  CONSENT_VERSION, consentRecord, generateStory, storyJson, validateStory, type AccountFigures, type StoryAnswers,
} from '../_shared/caseStudy.ts';
import { checkEmail } from '../_shared/resourceLead.ts';
import { sha256Hex, signLink, verifyLink } from '../_shared/resourceLink.ts';
import { platformIp } from '../_shared/platformIp.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DAY_MS = 86_400_000;
const MAX_PER_IP_HOUR = 3;
const WITHDRAW_LINK_YEARS = 10;

// The service-role Supabase client; typed loosely so tests can pass an in-memory stand-in.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  sendTemplate: (name: string, to: string, opts: { templateData: Record<string, unknown>; idempotencyKey?: string; replyTo?: string }) => Promise<{ sent: boolean }>;
  linkSecret: string;
  ipSalt: string;
  siteUrl: string;
  now?: () => number;
}

const missingTable = (e: { code?: string } | null | undefined) => !!e && (e.code === '42P01' || e.code === 'PGRST205');

export function createHandler(deps: Deps) {
  const now = deps.now ?? Date.now;

  async function userFrom(req: Request) {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!jwt) return null;
    const { data, error } = await deps.db.auth.getUser(jwt);
    return error || !data?.user ? null : data.user;
  }

  /** The person's own figures: verified emissions by scope and documents processed. */
  async function accountFigures(userId: string): Promise<AccountFigures> {
    const [{ data: rows }, { count }] = await Promise.all([
      deps.db.from('emissions').select('scope, co2_kg').eq('user_id', userId).eq('verified', true),
      deps.db.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    const by = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const r of rows ?? []) if (by[r.scope] !== undefined && Number.isFinite(Number(r.co2_kg))) by[r.scope] += Number(r.co2_kg);
    const round = (n: number) => Math.round(n * 10) / 10;
    return { documents: count ?? 0, scope1Kg: round(by[1]), scope2Kg: round(by[2]), scope3Kg: round(by[3]), verifiedKg: round(by[1] + by[2] + by[3]) };
  }

  async function prefill(req: Request) {
    const user = await userFrom(req);
    if (!user) return json({ error: 'sign_in' }, 401);
    const { data: profile } = await deps.db.from('profiles').select('business_name, sector, location').eq('id', user.id).maybeSingle();
    return json({
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      company: profile?.business_name || '',
      sector: profile?.sector || '',
      region: profile?.location || '',
      email: user.email ?? '',
      figures: await accountFigures(user.id),
    });
  }

  async function submit(req: Request, raw: Record<string, unknown>) {
    if (typeof raw.website === 'string' && raw.website.trim()) return json({ error: 'Something went wrong. Please try again.' }, 400);
    const v = validateStory(raw.answers && typeof raw.answers === 'object' ? raw.answers as Record<string, unknown> : {});
    if (!v.ok) return json({ error: 'Check the highlighted answers.', fields: v.errors }, 400);
    const answers: StoryAnswers = v.value;
    const publish = raw.publish === true;
    if (!publish && raw.privateOnly !== true) return json({ error: 'Choose whether we may publish your story, or keep it private.' }, 400);

    const user = await userFrom(req);
    const wantsAccount = raw.includeAccount === true && !!user;
    const email = user?.email ? String(user.email).toLowerCase() : (() => {
      const c = checkEmail(raw.email);
      return c.ok ? c.email : null;
    })();
    if (publish && !email) return json({ error: 'Add an email we can reach you on. It is never published.', fields: { email: 'Add a work email. It is never published.' } }, 400);

    const figures = wantsAccount ? await accountFigures(user!.id) : null;
    const story = generateStory(answers, figures);
    const storyHash = await sha256Hex(storyJson(story));
    // The stored story must be the one the person read and agreed to.
    if (raw.storyHash !== storyHash) return json({ error: 'Your story changed while you were writing it. Check the preview and send it again.', changed: true }, 409);

    const t = now();
    const iso = new Date(t).toISOString();
    const ip = platformIp(req.headers);
    const ipHash = await sha256Hex(`${deps.ipSalt}:${ip}`);

    // Withdrawn stories: content erased after 30 days, consent record kept.
    const { error: eraseError } = await deps.db.from('story_submissions')
      .update({ story: null, answers: null, account_figures: null, contact_email: null, updated_at: iso }).lt('erase_after', iso).not('story', 'is', null);
    if (eraseError && missingTable(eraseError)) return json({ error: 'not_open' }, 503);

    const { count } = await deps.db.from('story_submissions').select('id', { count: 'exact', head: true })
      .eq('request_ip_hash', ipHash).gte('created_at', new Date(t - 3_600_000).toISOString());
    if ((count ?? 0) >= MAX_PER_IP_HOUR) return json({ error: 'Too many stories from this network. Try again in an hour.' }, 429);

    const consent = consentRecord({ publish, attribution: answers.attribution, company: answers.company, account: wantsAccount });
    const { data: saved, error } = await deps.db.from('story_submissions').insert({
      status: publish ? 'submitted' : 'private',
      user_id: user?.id ?? null,
      contact_email: email,
      buyer: answers.buyer,
      industry: answers.industry,
      attribution: answers.attribution,
      answers,
      account_figures: figures,
      story,
      story_hash: storyHash,
      publish_consent: publish,
      consent_version: CONSENT_VERSION,
      consent_text_hash: await sha256Hex(consent),
      consented_at: iso,
      request_ip_hash: ipHash,
      updated_at: iso,
    }).select('id').single();
    if (error || !saved) throw error ?? new Error('save failed');

    let notify = 'failed';
    try {
      const r = await deps.sendTemplate('story-received', '', {
        templateData: { id: saved.id, publish, buyer: answers.buyer, industry: story.industry, attribution: answers.attribution, hook: story.hook, dek: story.dek, chapters: story.chapters, numbers: story.numbers, quote: story.quote, moment: story.moment, email: email ?? 'Not given', name: answers.name || 'Not given', company: answers.company || 'Not given', reviewUrl: `${deps.siteUrl}/admin/stories` },
        idempotencyKey: `story-received-${saved.id}`,
        replyTo: email ?? undefined,
      });
      notify = r.sent ? 'sent' : 'suppressed';
    } catch (e) {
      console.error('story notification failed', saved.id, (e as Error)?.message);
    }

    if (email && publish) {
      const token = await signLink({ r: `story:${saved.id}`, h: await sha256Hex(saved.id), x: Math.floor((t + WITHDRAW_LINK_YEARS * 365 * DAY_MS) / 1000) }, deps.linkSecret);
      try {
        await deps.sendTemplate('story-confirmation', email, {
          templateData: { hook: story.hook, withdrawUrl: `${deps.siteUrl}/case-studies/withdraw?t=${token}`, attribution: answers.attribution },
          idempotencyKey: `story-confirmation-${saved.id}`,
        });
      } catch (e) {
        console.error('story confirmation failed', saved.id, (e as Error)?.message);
      }
    }
    await deps.db.from('story_submissions').update({ notify_status: notify }).eq('id', saved.id);
    return json({ success: true, status: publish ? 'submitted' : 'private' });
  }

  async function withdraw(raw: Record<string, unknown>) {
    const v = await verifyLink(raw.token, deps.linkSecret, now());
    if (!v.ok || !v.claims.r.startsWith('story:')) return json({ error: 'invalid' }, 410);
    const id = v.claims.r.slice(6);
    if (v.claims.h !== await sha256Hex(id)) return json({ error: 'invalid' }, 410);
    const t = now();
    const { data, error } = await deps.db.from('story_submissions').select('id, status').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'invalid' }, 410);
    if (data.status === 'withdrawn') return json({ success: true, already: true });
    const { error: upd } = await deps.db.from('story_submissions').update({
      status: 'withdrawn', withdrawn_at: new Date(t).toISOString(), erase_after: new Date(t + 30 * DAY_MS).toISOString(), updated_at: new Date(t).toISOString(),
    }).eq('id', id);
    if (upd) throw upd;
    return json({ success: true });
  }

  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const raw = await req.json().catch(() => null);
      if (!raw || typeof raw !== 'object') return json({ error: 'Something went wrong. Please try again.' }, 400);
      const action = (raw as Record<string, unknown>).action;
      if (action === 'prefill') return await prefill(req);
      if (action === 'submit') return await submit(req, raw as Record<string, unknown>);
      if (action === 'withdraw') return await withdraw(raw as Record<string, unknown>);
      return json({ error: 'Something went wrong. Please try again.' }, 400);
    } catch (error) {
      console.error('story-submit error:', (error as { code?: string; message?: string })?.code ?? (error as Error)?.message ?? 'unknown');
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}
