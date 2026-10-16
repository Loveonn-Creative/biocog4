// Customer stories: the editorial side, for admins only (checked here against
// user_roles with the service role, never trusted from the browser).
//   list       submissions awaiting review, newest first, with contact details.
//   approve    publishes the story the person agreed to. The reviewer may only
//              remove parts (the quote, the moment, a number) and must confirm
//              any "independently verified" figure, or it is shown as reported.
//   reject     keeps it unpublished, with a note.
//   unpublish  takes a live story down.
import { storySlug, type Story } from '../_shared/caseStudy.ts';
import { sha256Hex, signLink } from '../_shared/resourceLink.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
export interface Deps {
  db: Db;
  sendTemplate: (name: string, to: string, opts: { templateData: Record<string, unknown>; idempotencyKey?: string }) => Promise<{ sent: boolean }>;
  linkSecret: string;
  siteUrl: string;
  now?: () => number;
}

export type Removal = 'quote' | 'moment' | `number:${number}`;

/** Applies only removals to the approved story, and downgrades unconfirmed third-party claims. */
export function editForPublication(story: Story, removals: unknown, confirmed: unknown): { story: Story; applied: string[] } {
  const rm = Array.isArray(removals) ? removals.filter((r): r is string => typeof r === 'string') : [];
  const ok = new Set(Array.isArray(confirmed) ? confirmed.filter((c): c is number => Number.isInteger(c)) : []);
  const applied: string[] = [];
  const out: Story = { ...story, chapters: [...story.chapters] };
  if (rm.includes('quote') && out.quote) { out.quote = ''; applied.push('quote'); }
  if (rm.includes('moment') && out.moment) { out.moment = ''; applied.push('moment'); }
  out.numbers = story.numbers
    .map((n, i) => {
      if (n.basis === 'independent' && !ok.has(i)) {
        applied.push(`unconfirmed:${i}`);
        return { ...n, basis: 'reported' as const, basisLabel: `Reported by the customer (they cite ${n.basisLabel.replace(/^Independently verified by /, '')}; not confirmed by Senseible)` };
      }
      return n;
    })
    .filter((_, i) => {
      const drop = rm.includes(`number:${i}`);
      if (drop) applied.push(`number:${i}`);
      return !drop;
    });
  return { story: out, applied };
}

export function createHandler(deps: Deps) {
  const now = deps.now ?? Date.now;

  async function admin(req: Request) {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!jwt) return null;
    const { data, error } = await deps.db.auth.getUser(jwt);
    const user = data?.user;
    if (error || !user) return null;
    const { data: role } = await deps.db.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    return role ? user : null;
  }

  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const user = await admin(req);
      if (!user) return json({ error: 'forbidden' }, 403);
      const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const iso = new Date(now()).toISOString();

      if (raw.action === 'list') {
        const status = ['submitted', 'published', 'rejected', 'private', 'withdrawn'].includes(raw.status as string) ? raw.status : 'submitted';
        const { data, error } = await deps.db.from('story_submissions')
          .select('id, status, slug, buyer, industry, attribution, contact_email, story, answers, created_at, published_at, review_note')
          .eq('status', status).order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return json({ items: data ?? [] });
      }

      const id = typeof raw.id === 'string' ? raw.id : '';
      const { data: row, error: findError } = await deps.db.from('story_submissions')
        .select('id, status, story, contact_email, publish_consent, slug').eq('id', id).maybeSingle();
      if (findError) throw findError;
      if (!row) return json({ error: 'not_found' }, 404);

      if (raw.action === 'approve') {
        if (!row.publish_consent || !row.story || !['submitted', 'rejected'].includes(row.status)) return json({ error: 'This story cannot be published.' }, 409);
        const { story, applied } = editForPublication(row.story as Story, raw.removals, raw.confirmIndependent);
        const slug = row.slug ?? storySlug(story, row.id);
        const { error } = await deps.db.from('story_submissions').update({
          status: 'published', slug, story, published_at: iso, reviewer_id: user.id, reviewed_at: iso,
          review_removals: applied, review_note: typeof raw.note === 'string' ? raw.note.slice(0, 1000) : null, updated_at: iso,
        }).eq('id', row.id);
        if (error) throw error;
        if (row.contact_email) {
          const token = await signLink({ r: `story:${row.id}`, h: await sha256Hex(row.id), x: Math.floor(now() / 1000) + 10 * 365 * 86_400 }, deps.linkSecret);
          try {
            await deps.sendTemplate('story-published', row.contact_email, {
              templateData: { hook: story.hook, url: `${deps.siteUrl}/case-studies/${slug}`, withdrawUrl: `${deps.siteUrl}/case-studies/withdraw?t=${token}` },
              idempotencyKey: `story-published-${row.id}`,
            });
          } catch (e) {
            console.error('story published email failed', row.id, (e as Error)?.message);
          }
        }
        return json({ success: true, slug, applied });
      }

      if (raw.action === 'reject' || raw.action === 'unpublish') {
        if (row.status === 'withdrawn') return json({ error: 'Already withdrawn by the customer.' }, 409);
        const { error } = await deps.db.from('story_submissions').update({
          status: 'rejected', published_at: null, reviewer_id: user.id, reviewed_at: iso,
          review_note: typeof raw.note === 'string' ? raw.note.slice(0, 1000) : null, updated_at: iso,
        }).eq('id', row.id);
        if (error) throw error;
        return json({ success: true });
      }
      return json({ error: 'Unknown action' }, 400);
    } catch (error) {
      console.error('story-review error:', (error as { code?: string; message?: string })?.code ?? (error as Error)?.message ?? 'unknown');
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}
