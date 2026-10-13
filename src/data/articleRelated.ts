// Related articles, shared by the prerendered HTML and the article page so
// both link the same way. Deterministic: same inputs, same links.
//
// Score: same category 3, each shared tag 2, next funnel stage down 1
// (awareness -> consideration -> decision). Each article lists its top
// RELATED_COUNT. Then every article that nobody lists is added to the list of
// the article that scores it highest (up to RELATED_MAX), so no article is
// left without an in-content link from another article.
import { articleIndex, type CMSArticleMeta } from './articleIndex';
import { articleFunnel, type FunnelStage } from './articleFunnel';

export const RELATED_COUNT = 4;
export const RELATED_MAX = 6;
const NEXT: Record<FunnelStage, FunnelStage | null> = { awareness: 'consideration', consideration: 'decision', decision: null };

const tagsOf = new Map(articleIndex.map(a => [a.slug, new Set(a.tags.map(t => t.toLowerCase()))]));

function score(a: CMSArticleMeta, b: CMSArticleMeta): number {
  let s = a.category === b.category ? 3 : 0;
  const ta = tagsOf.get(a.slug)!;
  for (const t of tagsOf.get(b.slug)!) if (ta.has(t)) s += 2;
  const sa = articleFunnel[a.slug]?.stage;
  if (sa && NEXT[sa] && articleFunnel[b.slug]?.stage === NEXT[sa]) s += 1;
  return s;
}

function build(): Map<string, string[]> {
  const order = (x: CMSArticleMeta, y: CMSArticleMeta) => Number(x.id) - Number(y.id);
  const lists = new Map<string, string[]>();
  for (const a of articleIndex) {
    const ranked = articleIndex
      .filter(b => b.slug !== a.slug)
      .map(b => ({ b, s: score(a, b) }))
      .filter(x => x.s > 0)
      .sort((x, y) => y.s - x.s || order(x.b, y.b));
    lists.set(a.slug, ranked.slice(0, RELATED_COUNT).map(x => x.b.slug));
  }
  const inbound = new Map<string, number>(articleIndex.map(a => [a.slug, 0]));
  for (const l of lists.values()) for (const s of l) inbound.set(s, (inbound.get(s) ?? 0) + 1);
  for (const orphan of articleIndex.filter(a => inbound.get(a.slug) === 0).sort(order)) {
    const host = articleIndex
      .filter(h => h.slug !== orphan.slug && (lists.get(h.slug)!.length < RELATED_MAX) && !lists.get(h.slug)!.includes(orphan.slug))
      .map(h => ({ h, s: score(h, orphan) }))
      .sort((x, y) => y.s - x.s || order(x.h, y.h))[0];
    if (host) { lists.get(host.h.slug)!.push(orphan.slug); inbound.set(orphan.slug, 1); }
  }
  return lists;
}

let cache: Map<string, string[]> | null = null;

export function relatedSlugs(slug: string): string[] {
  cache ??= build();
  return cache.get(slug) ?? [];
}

export function relatedArticles(slug: string): CMSArticleMeta[] {
  const bySlug = new Map(articleIndex.map(a => [a.slug, a]));
  return relatedSlugs(slug).map(s => bySlug.get(s)!).filter(Boolean);
}

/** The anchor text other pages use when linking to an article. */
export const anchorFor = (a: Pick<CMSArticleMeta, 'slug' | 'title'>) => articleFunnel[a.slug]?.anchor ?? a.title;
