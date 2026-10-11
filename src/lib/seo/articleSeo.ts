// Article metadata lives apart from seoMeta.ts so the title overrides only
// load with the article page, not in the initial bundle.
import { articleMetaTitles } from '@/data/articleMeta';
import { clampDescription, fitTitle, type PageMeta } from './seoMeta';

export function articleMeta(article: { slug: string; title: string; content: string }): PageMeta {
  return {
    title: fitTitle(articleMetaTitles[article.slug] ?? article.title),
    description: clampDescription(article.content),
  };
}
