// Question radar for an /answers address that has no page (yet). The address
// is read as the visitor's question, and the closest existing answers and
// guides are found by word overlap. Pure, so it is tested.

export interface RadarItem { kind: 'answer' | 'guide' | 'tool'; title: string; to: string; text: string }
export interface RadarHit extends RadarItem { score: number; strength: 'strong' | 'close' | 'related' }

const STOP = new Set('a an the and or of to for in on with by from how what is are do does can i my your we our it its vs versus should when which who why much many per under into at as be this that there their they me us'.split(' '));
// Plurals only: "invoices" and "invoice" match; other endings are left alone.
const stem = (w: string) => {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (/(ss|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

export function words(s: string): string[] {
  return s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')
    .filter((w) => w && !STOP.has(w)).map(stem);
}

/** "buyer-asked-for-product-carbon-footprint-what-to-send" -> "Buyer asked for product carbon footprint what to send" */
export function slugToQuestion(slug: string): string {
  const text = decodeURIComponent(slug).replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

/**
 * Best matches for a question: share of the question's words found in the
 * item (title words count double), so a short exact title beats a long page
 * that mentions everything once. Returns at most `limit` hits above a floor.
 */
export function scan(question: string, items: RadarItem[], limit = 3): RadarHit[] {
  const seq = words(question);
  const q = [...new Set(seq)];
  if (q.length === 0) return [];
  // Adjacent word pairs ("product carbon", "carbon footprint"): a title that
  // keeps the visitor's phrase together outranks one that only shares words.
  const pairs = seq.slice(1).map((w, i) => `${seq[i]} ${w}`);
  return items
    .map((it) => {
      const titleWords = words(it.title);
      const title = new Set(titleWords);
      const body = new Set(words(it.text));
      const hit = q.reduce((n, w) => n + (title.has(w) ? 2 : body.has(w) ? 1 : 0), 0);
      const titlePairs = new Set(titleWords.slice(1).map((w, i) => `${titleWords[i]} ${w}`));
      const phrase = pairs.filter((p) => titlePairs.has(p)).length;
      return { ...it, score: Math.min(1, (hit + phrase) / (q.length * 2)) };
    })
    .filter((h) => h.score >= 0.2)
    .sort((a, b) => b.score - a.score || a.title.length - b.title.length)
    .slice(0, limit)
    .map((h) => ({ ...h, strength: h.score >= 0.6 ? 'strong' : h.score >= 0.4 ? 'close' : 'related' }));
}

/** Contact form link with the question prefilled, so asking takes one tap. */
export function askLink(question: string): string {
  const msg = `Please answer this on Senseible: ${question}`;
  return `/contact?topic=climate&msg=${encodeURIComponent(msg)}`;
}
