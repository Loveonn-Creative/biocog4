// Build-only: renders structured page content to HTML (prerendered pages) and
// Markdown (/md mirrors for AI crawlers). Inline links use markdown syntax
// [text](/path) in source strings and are resolved to absolute URLs.
import { SITE_URL } from './seoMeta';

export type Block =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { table: { head: string[]; rows: string[][] } };

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const absolute = (href: string): string => (href.startsWith('/') ? `${SITE_URL}${href}` : href);

/** Escapes text, then turns [text](href) into anchors and **x** into <strong>. */
export function inlineHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => `<a href="${absolute(href)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function inlineMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => `[${label}](${absolute(href)})`);
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map(b => {
      if ('h2' in b) return `<h2>${inlineHtml(b.h2)}</h2>`;
      if ('h3' in b) return `<h3>${inlineHtml(b.h3)}</h3>`;
      if ('p' in b) return `<p>${inlineHtml(b.p)}</p>`;
      if ('ul' in b) return `<ul>${b.ul.map(i => `<li>${inlineHtml(i)}</li>`).join('')}</ul>`;
      if ('ol' in b) return `<ol>${b.ol.map(i => `<li>${inlineHtml(i)}</li>`).join('')}</ol>`;
      const head = b.table.head.map(h => `<th>${inlineHtml(h)}</th>`).join('');
      const rows = b.table.rows.map(r => `<tr>${r.map(c => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`).join('');
      return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join('\n');
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map(b => {
      if ('h2' in b) return `## ${inlineMarkdown(b.h2)}`;
      if ('h3' in b) return `### ${inlineMarkdown(b.h3)}`;
      if ('p' in b) return inlineMarkdown(b.p);
      if ('ul' in b) return b.ul.map(i => `- ${inlineMarkdown(i)}`).join('\n');
      if ('ol' in b) return b.ol.map((i, n) => `${n + 1}. ${inlineMarkdown(i)}`).join('\n');
      const head = `| ${b.table.head.join(' | ')} |`;
      const sep = `| ${b.table.head.map(() => '---').join(' | ')} |`;
      const rows = b.table.rows.map(r => `| ${r.map(inlineMarkdown).join(' | ')} |`).join('\n');
      return [head, sep, rows].join('\n');
    })
    .join('\n\n');
}

/** Converts the article markdown subset used in src/data/cmsContent.ts to blocks. */
export function markdownToBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (list) blocks.push(list.kind === 'ul' ? { ul: list.items } : { ol: list.items });
    list = null;
  };
  const isSep = (l: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l);
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }
    if (line.includes('|') && i + 1 < lines.length && isSep(lines[i + 1])) {
      flush();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) rows.push(cells(lines[i++]));
      i--;
      blocks.push({ table: { head, rows } });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flush(); blocks.push(h[1].length <= 2 ? { h2: h[2] } : { h3: h[2] }); continue; }
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) { if (list?.kind !== 'ul') { flush(); list = { kind: 'ul', items: [] }; } list.items.push(ul[1]); continue; }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) { if (list?.kind !== 'ol') { flush(); list = { kind: 'ol', items: [] }; } list.items.push(ol[1]); continue; }
    flush();
    blocks.push({ p: line.replace(/^>\s*/, '') });
  }
  flush();
  return blocks;
}
