import type { LibrarySection } from '@/data/answerLibraryTypes';

// The Hindi edition of an answer library page. Only the reader-facing text is
// translated; topic, sources and the review date come from the English page,
// so facts and their sources can never drift apart.
export interface HindiAnswer {
  slug: string;
  q: string;
  title: string;
  short: string;
  sections: LibrarySection[];
  example?: { title: string; lines: string[]; note?: string };
  senseible: string;
  /** Same targets as the English page, labels in Hindi. */
  links: { label: string; to: string }[];
  reviewNote?: string;
}
