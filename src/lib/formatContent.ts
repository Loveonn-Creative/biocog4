// Content formatting utilities for clean, readable text
// Supports: ## H2, ### H3, **bold** (stripped), bullets (- / *), numbered lists, > callouts, key: value lines

export const cleanMarkdownText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface FormattedSection {
  type: 'h2' | 'h3' | 'paragraph' | 'listItem' | 'numberedItem' | 'callout' | 'keyValue';
  content: string;
  key?: string;
}

const cleanInline = (text: string): string =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

export const parseContentToSections = (content: string): FormattedSection[] => {
  if (!content) return [];
  const lines = content.split('\n');
  const sections: FormattedSection[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('### ')) { sections.push({ type: 'h3', content: cleanInline(line.slice(4)) }); continue; }
    if (line.startsWith('## ')) { sections.push({ type: 'h2', content: cleanInline(line.slice(3)) }); continue; }
    if (line.startsWith('# ')) { sections.push({ type: 'h2', content: cleanInline(line.slice(2)) }); continue; }
    if (line.startsWith('> ')) { sections.push({ type: 'callout', content: cleanInline(line.slice(2)) }); continue; }

    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) { sections.push({ type: 'numberedItem', content: cleanInline(num[2]) }); continue; }
    if (line.startsWith('- ') || line.startsWith('* ')) { sections.push({ type: 'listItem', content: cleanInline(line.slice(2)) }); continue; }

    // Standalone bold "**Title**" or "**Title:**" → h3
    const boldHead = line.match(/^\*\*([^*]+?):?\*\*:?\s*$/);
    if (boldHead) { sections.push({ type: 'h3', content: cleanInline(boldHead[1]) }); continue; }

    // Key: value short line (no period, key < 50 chars, has value)
    const kv = line.match(/^([A-Z][A-Za-z0-9 ()&/+\-]{2,48}):\s+(.+)$/);
    if (kv && !kv[2].includes(':') && kv[2].length < 220) {
      sections.push({ type: 'keyValue', key: cleanInline(kv[1]), content: cleanInline(kv[2]) });
      continue;
    }

    sections.push({ type: 'paragraph', content: cleanInline(line) });
  }
  return sections;
};

export const formatContentForDisplay = (content: string): string => {
  if (!content) return '';
  return content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(\d+)\.\s+\*\*([^*]+)\*\*/g, '$1. $2')
    .replace(/^-\s+\*\*([^*]+)\*\*/gm, '• $1')
    .replace(/^-\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n');
};

export const extractPreview = (content: string, maxLength = 150): string => {
  const cleaned = cleanMarkdownText(content.replace(/^#+\s.*$/gm, '').replace(/^>\s.*$/gm, ''));
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '…';
};
