// Answer library: question pages written from the validated batch registers
// (docs/seo/batch-*.tsv). One JSON file per page in ./answerLibrary/, checked
// by scripts/seo/build-answer-library.mjs, which also writes the index and
// the build-only module. Rules: docs/seo/brief.md.

export type LibraryTopic = 'accounting' | 'regulation' | 'markets' | 'product';

export const LIBRARY_TOPICS: Record<LibraryTopic, { label: string; line: string }> = {
  accounting: { label: 'Scopes, factors and calculations', line: 'Scope 1, 2 and 3, emission factors, and the arithmetic behind a footprint.' },
  regulation: { label: 'CBAM, BRSR and disclosure rules', line: 'What regulators and buyers require, by when, and what to send.' },
  markets: { label: 'Credits, RECs and green finance', line: 'Carbon credits, renewable energy claims, net zero and climate finance.' },
  product: { label: 'Products, suppliers and data', line: 'Product footprints, supply chains and data an auditor can trace.' },
};

export interface LibrarySection {
  /** A sub-question or plain heading; each section must make sense on its own. */
  h: string;
  p?: string[];
  ul?: string[];
  ol?: string[];
}

export interface LibraryAnswer {
  slug: string;
  /** The question as people ask it. */
  q: string;
  /** Page title, 46 characters or fewer. */
  title: string;
  /** Direct answer, 25 to 60 words. */
  short: string;
  topic: LibraryTopic;
  intent: 'how-to' | 'decision' | 'comparison' | 'explain' | 'check';
  audience: string;
  sections: LibrarySection[];
  /** Worked example with real arithmetic; estimates say so. */
  example?: { title: string; lines: string[]; note?: string };
  /** How Senseible helps here, or plainly what it does not do. */
  senseible: string;
  links: { label: string; to: string }[];
  sources: { label: string; url: string }[];
  /** Date the facts were last checked (YYYY-MM-DD). */
  reviewed: string;
  /** For fast-changing rules: what to re-check and when. */
  reviewNote?: string;
}

export interface LibraryIndexEntry {
  slug: string; q: string; title: string; short: string; topic: LibraryTopic; reviewed: string;
}
