import type { HindiAnswer } from '@/data/answerLibraryHi/types';
import type { LibraryAnswer } from '@/data/answerLibraryTypes';
import { loadAnswer, type AnswerPageData } from '@/lib/answerData';
import { hasHindi } from '@/lib/seo/hiPages';

// Hindi answer pages. Each Hindi file is its own small chunk, loaded only on a
// /hi/answers page, so the English pages never carry Hindi text.
const files = import.meta.glob<{ default: HindiAnswer }>('../data/answerLibraryHi/*.json');

/** The English page with its reader-facing text replaced by the Hindi edition. */
export async function loadHindiAnswer(slug: string): Promise<AnswerPageData | null> {
  if (!hasHindi(slug)) return null;
  const file = files[`../data/answerLibraryHi/${slug}.json`];
  if (!file) return null;
  const [hi, en] = await Promise.all([file().then((m) => m.default).catch(() => null), loadAnswer(slug)]);
  if (!hi || !en) return null;
  const page: LibraryAnswer = {
    ...en.page,
    q: hi.q, title: hi.title, short: hi.short, sections: hi.sections, example: hi.example,
    senseible: hi.senseible, links: hi.links, reviewNote: hi.reviewNote ?? en.page.reviewNote,
  };
  // Related questions that have a Hindi edition are shown in Hindi.
  const related = await Promise.all(en.related.map(async (r) => {
    const f = hasHindi(r.slug) ? files[`../data/answerLibraryHi/${r.slug}.json`] : undefined;
    const q = f ? await f().then((m) => m.default.q).catch(() => r.q) : r.q;
    return { slug: r.slug, q };
  }));
  return { page, related };
}
