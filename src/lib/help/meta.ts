// Search titles and descriptions for Help Center pages, shared by the page
// (SEOHead) and the build's route registry, so the prerendered HTML and the
// live page say the same thing. English only: that is what is prerendered.

import { clampDescription, DESCRIPTION_MIN, TITLE_MAX } from '@/lib/seo/seoMeta';
import { helpArticle, type HelpArticle } from '../../../supabase/functions/_shared/helpArticles';

export const HELP_HUB_META = {
  title: 'Help Center: Uploads, Plans, Payments | Senseible',
  description: 'Quick answers on uploading bills, monthly reads, credits, GST, payments and Verify, plus fixes for messages you may see in Senseible.',
};

export function helpArticleMeta(a: HelpArticle): { title: string; description: string } {
  const branded = `${a.q} | Senseible Help`;
  const title = branded.length <= TITLE_MAX ? branded : a.q;
  let description = clampDescription([a.a, ...(a.steps ?? [])].join(' '));
  if (description.length < DESCRIPTION_MIN) description = clampDescription(`${a.a} Senseible Help Center: short answers on uploads, plans and payments.`);
  return { title, description };
}

export const helpMetaFor = (slug?: string) => {
  const a = slug ? helpArticle(slug) : undefined;
  return a ? helpArticleMeta(a) : HELP_HUB_META;
};
