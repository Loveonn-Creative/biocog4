// The White Paper as plain blocks for the prerendered HTML and the /md mirror:
// the same text as the page, with equations written out in Unicode.
import type { Block } from './render';
import { mathToText } from '@/lib/mathMarkup';
import { WP_NUMBERS, WP_SECTIONS, WP_TAGLINE, resolveRefs } from '@/data/whitePaper';

/** Prose with {eq:..} references resolved and $inline math$ written out. */
export function wpText(text: string): string {
  return resolveRefs(text).replace(/\$([^$]+)\$/g, (_, m: string) => mathToText(m));
}

export function whitePaperBlocks(): Block[] {
  const out: Block[] = [
    { p: `${WP_TAGLINE} How Senseible turns tax invoices and utility bills into greenhouse-gas figures: the accounting equations, emission factor governance, uncertainty, where AI is and is not used, the audit trail, data protection and known limits. Please read the Legal Disclaimer at the end.` },
  ];
  for (const s of WP_SECTIONS) {
    out.push({ h2: s.title });
    for (const b of s.blocks) {
      if ('p' in b) out.push({ p: wpText(b.p) });
      else if ('ul' in b) out.push({ ul: b.ul.map(wpText) });
      else if ('h3' in b) out.push({ h3: b.h3 });
      else if ('eq' in b) out.push({ p: `Equation (${WP_NUMBERS.eq.get(b.id)}): ${b.eq.map((part) => mathToText(part)).join('    ')}` });
      else if ('plain' in b) out.push({ p: `**What it means.** ${wpText(b.plain)}` });
      else if ('example' in b) out.push({ p: `**${b.label ?? 'Example'}.** ${wpText(b.example)}` });
      else if ('note' in b) out.push({ p: `**${b.label ?? 'Note'}.** ${wpText(b.note)}` });
      else if ('table' in b) out.push({ table: { head: b.table.head, rows: b.table.rows.map((r) => r.map(wpText)) } });
      else if ('figure' in b) out.push({ p: `**Figure ${WP_NUMBERS.fig.get(b.id)}. ${b.title}.** ${b.caption}` });
      // Widgets are interactive illustrations of the equation just above; the text already carries them.
    }
  }
  return out;
}
