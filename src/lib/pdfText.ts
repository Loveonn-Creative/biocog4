// jsPDF's built-in Helvetica only covers the WinAnsi character set: anything
// outside it (subscript 2, the minus sign, approximately-equal, dashes) prints
// as a wrong glyph, e.g. "tCO2" became "tCO ‚". Every PDF writer passes text
// through here first.
const MAP: Record<string, string> = {
  '₂': '2', '₃': '3', '²': '2', '³': '3',
  '−': '-', '–': '-', '—': '-', '‑': '-',
  '≈': '~', '≤': '<=', '≥': '>=', '→': '->', '←': '<-',
  ' ': ' ', ' ': ' ', ' ': ' ',
};

export function pdfSafe<T extends string | string[]>(text: T): T {
  const fix = (s: string) => s.replace(/[\u2082\u2083\u00b2\u00b3\u2212\u2013\u2014\u2011\u2248\u2264\u2265\u2192\u2190\u2009\u202f\u00a0]/g, (c) => MAP[c] ?? c);
  return (Array.isArray(text) ? text.map(fix) : fix(text)) as T;
}
