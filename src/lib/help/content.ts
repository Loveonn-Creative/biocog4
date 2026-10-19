// Help Center copy in the reader's language. English lives in
// supabase/functions/_shared/helpArticles.ts (shared with the help-ask
// function) and the UI strings below. Other languages are reviewed static
// bundles in ./i18n, loaded only when that language is chosen, so English
// pays nothing and no machine translation runs on these pages. Any missing
// piece falls back to English.

import { useEffect, useState } from 'react';
import { HELP_ARTICLES, HELP_FIXES, HELP_SECTIONS, type HelpArticle, type HelpFix, type HelpSection } from '../../../supabase/functions/_shared/helpArticles';

export const HELP_UI = {
  hubTitle: 'How can we help?',
  hubLead: 'Ask the way you’d say it, or pick a topic.',
  askPlaceholder: 'e.g. paid but plan not active',
  askLabel: 'Ask or search',
  speak: 'Speak your question',
  listening: 'Listening…',
  ask: 'Ask',
  answer: 'Answer',
  fromArticle: 'From',
  related: 'Also see',
  noMatch: 'We don’t have an answer for this yet. Message us and we’ll help.',
  aiThinking: 'Finding your answer…',
  aiNotCovered: 'Our help articles don’t cover this one. Message us and we’ll help.',
  aiLimit: 'You have used today’s help questions. Search the articles, or message us.',
  aiError: 'Answers are unavailable right now. Search the articles, or message us.',
  askAnswerCta: 'Get a direct answer',
  messageUs: 'Message us',
  stillStuck: 'Still stuck?',
  stillStuckLead: 'Send us a message. The topic is filled in for you.',
  fixTitle: 'Paste the message you saw',
  fixLead: 'Copy the line from your screen and we’ll tell you what to do.',
  fixPlaceholder: 'e.g. Page limit reached',
  fixLabel: 'Paste a message',
  whatToDo: 'What to do',
  more: 'More',
  fixUnknown: 'We don’t know this message yet. Send it to us and we’ll take a look.',
  sendIt: 'Send it to us',
  somethingWrong: 'Something went wrong',
  somethingWrongBlurb: 'Paste the message, get the fix',
  allTopics: 'All topics',
  helpful: 'Did this answer it?',
  yes: 'Yes',
  no: 'No, message us',
  thanks: 'Thanks. Glad it helped.',
  forThisPage: 'For this page',
  openHelp: 'Help',
  close: 'Close',
  back: 'Back',
  helpCenter: 'Help Center',
  example: 'Example: 100 invoice credits (₹79)',
  upi: 'UPI',
  card: 'Card, netbanking or wallet',
  price: 'Price',
  fee: 'Payment fee 4%',
  gst: 'GST 18%',
  total: 'Total',
  quantity: 'Quantity on your bill',
  factor: 'Emission factor',
  result: 'kg CO₂',
  formulaExample: '1,000 kWh × 0.710 = 710 kg CO₂',
  scoreStart: 'Starts at 100',
  scorePass: 'Passes at 80',
  scoreGaps: 'Gaps take points off',
  splitWhole: 'Whole PDF',
  splitParts: 'Read part by part',
};

export type HelpUi = typeof HELP_UI;

export interface HelpBundle {
  ui?: Partial<HelpUi>;
  sections?: Partial<Record<HelpSection, { title?: string; blurb?: string }>>;
  articles?: Record<string, { q?: string; a?: string; facts?: [string, string][]; steps?: string[]; cta?: string; keywords?: string[] }>;
  /** Keyed by the English match text; only the fix is translated. */
  fixes?: Record<string, string>;
}

export interface HelpContent {
  locale: string;
  ui: HelpUi;
  sections: { id: HelpSection; title: string; blurb: string }[];
  articles: HelpArticle[];
  fixes: HelpFix[];
}

// JSON imports are typed loosely (facts read as string[][]); mergeHelp checks list lengths.
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  hi: () => import('./i18n/hi.json'),
  bn: () => import('./i18n/bn.json'),
  ta: () => import('./i18n/ta.json'),
  mr: () => import('./i18n/mr.json'),
  ur: () => import('./i18n/ur.json'),
  es: () => import('./i18n/es.json'),
  id: () => import('./i18n/id.json'),
  tl: () => import('./i18n/tl.json'),
  vi: () => import('./i18n/vi.json'),
  th: () => import('./i18n/th.json'),
};

export const HELP_LOCALES = Object.keys(LOADERS);

/** English merged with a bundle, field by field. A list is used only if it has the English list's length. */
export function mergeHelp(locale: string, b: HelpBundle | null): HelpContent {
  const sameLen = <T,>(t: T[] | undefined, en: T[] | undefined) => (t && en && t.length === en.length ? t : en);
  return {
    locale: b ? locale : 'en',
    ui: { ...HELP_UI, ...(b?.ui ?? {}) },
    sections: HELP_SECTIONS.map((s) => ({ ...s, ...(b?.sections?.[s.id] ?? {}) })),
    articles: HELP_ARTICLES.map((a) => {
      const t = b?.articles?.[a.slug];
      if (!t) return a;
      return {
        ...a,
        q: t.q || a.q,
        a: t.a || a.a,
        facts: sameLen(t.facts, a.facts),
        steps: sameLen(t.steps, a.steps),
        cta: a.cta && t.cta ? { ...a.cta, label: t.cta } : a.cta,
        // English search words stay, so a reader can search either way.
        keywords: [...a.keywords, ...(t.keywords ?? [])],
      };
    }),
    fixes: HELP_FIXES.map((f) => ({ ...f, fix: b?.fixes?.[f.match] || f.fix })),
  };
}

const EN = mergeHelp('en', null);
const cache: Record<string, HelpContent> = { en: EN };

/** Help copy for a locale: English at once, the reviewed translation as soon as it loads. */
export function useHelpContent(locale: string): HelpContent {
  const [content, setContent] = useState<HelpContent>(() => cache[locale] ?? EN);
  useEffect(() => {
    if (cache[locale]) { setContent(cache[locale]); return; }
    const load = LOADERS[locale];
    if (!load) { setContent(EN); return; }
    let live = true;
    load().then((m) => {
      cache[locale] = mergeHelp(locale, m.default as HelpBundle);
      if (live) setContent(cache[locale]);
    }).catch(() => { if (live) setContent(EN); });
    return () => { live = false; };
  }, [locale]);
  return content;
}

/** Contact form link with the topic and the article filled in. */
export function contactHref(topic: string, about?: string): string {
  const msg = about ? `&msg=${encodeURIComponent(`Help Center: ${about}\n\n`)}` : '';
  return `/contact?topic=${topic}${msg}`;
}
