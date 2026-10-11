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

/**
 * FAQs written in article content as a "## Frequently asked questions"
 * section with "### Question" headings. Only visible questions become
 * FAQPage schema, so the markup always matches the page.
 */
export function extractFaqs(content: string): { question: string; answer: string }[] {
  const start = content.search(/^##\s+(Frequently asked questions|FAQs?)\s*$/im);
  if (start === -1) return [];
  const rest = content.slice(start).split('\n').slice(1);
  const faqs: { question: string; answer: string }[] = [];
  let current: { question: string; answer: string[] } | null = null;
  for (const line of rest) {
    if (/^##\s/.test(line)) break;
    const q = line.match(/^###\s+(.*)$/);
    if (q) {
      if (current) faqs.push({ question: current.question, answer: current.answer.join(' ').trim() });
      current = { question: q[1].trim(), answer: [] };
    } else if (current && line.trim()) {
      current.answer.push(line.trim().replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, ''));
    }
  }
  if (current) faqs.push({ question: current.question, answer: current.answer.join(' ').trim() });
  return faqs.filter(f => f.answer);
}
