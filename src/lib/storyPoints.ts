import { EVIDENCE, FRICTIONS, OPPORTUNITIES, PAINS, VISIBILITY, type Story } from "@/lib/caseStudy";

type ChapterKey = Story["chapters"][number]["key"];

const PHRASES: Record<ChapterKey, string[]> = {
  problem: PAINS.map((o) => o.story),
  friction: FRICTIONS.map((o) => o.story),
  visibility: VISIBILITY.map((o) => o.story),
  evidence: EVIDENCE.map((o) => o.story),
  opportunity: OPPORTUNITIES.map((o) => o.story),
};

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** The known phrases that appear in `text`, in reading order, longest first where they overlap. */
function found(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  const hits = phrases
    .map((p) => ({ p, at: lower.indexOf(p.toLowerCase()) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at || b.p.length - a.p.length);
  const out: { p: string; at: number }[] = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h.at < last.at + last.p.length) continue;
    out.push(h);
  }
  return out.map((h) => h.p);
}

/**
 * Splits a generated chapter back into the phrases it was written from, so the
 * page can show them as points. Returns null unless the points rebuild the
 * chapter text exactly, in which case the page shows the original paragraph:
 * nothing is reworded, dropped or added.
 */
export function chapterPoints(key: ChapterKey, text: string): string[] | null {
  const items = found(text, PHRASES[key]);
  if (items.length < 2) return null;
  let rebuilt: string | null = null;
  if (key === "problem") {
    rebuilt = items.map((p, i) => (i === 0 ? `Before Senseible, ${p}.` : `${cap(p)}.`)).join(" ");
  } else {
    const body = `${list(items)}.`;
    const lead = { friction: /^With Senseible, .+? /, visibility: /^They can now see /, evidence: /^They now have /, opportunity: /^It opened the way to / }[key];
    const m = text.match(lead);
    if (m && text.slice(m[0].length) === body) rebuilt = text;
  }
  return rebuilt === text ? items.map(cap) : null;
}

/** Minutes to read the story at 200 words a minute, at least one. */
export function readingMinutes(story: Story): number {
  const words = [story.hook, story.dek, story.moment, story.quote, ...story.chapters.map((c) => c.text)].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
