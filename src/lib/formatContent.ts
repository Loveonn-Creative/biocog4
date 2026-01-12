// Content formatting utilities for clean, readable text
// Converts markdown-style formatting to clean HTML or plain text

/**
 * Clean markdown formatting from text
 * Removes ** for bold, * for italic, etc.
 */
export const cleanMarkdownText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove bold markers **text**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic markers *text*
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove inline code `text`
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Convert markdown-style content to formatted React elements
 * Returns structured content for rendering
 */
export interface FormattedSection {
  type: 'heading' | 'paragraph' | 'list' | 'listItem';
  content: string;
  level?: number;
}

export const parseContentToSections = (content: string): FormattedSection[] => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const sections: FormattedSection[] = [];
  let currentList: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      // Empty line - flush any current list
      if (currentList.length > 0) {
        currentList.forEach(item => {
          sections.push({ type: 'listItem', content: cleanBoldMarkers(item) });
        });
        currentList = [];
      }
      continue;
    }
    
    // Check for heading patterns
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(':')) {
      // Standalone bold text is likely a heading
      if (currentList.length > 0) {
        currentList.forEach(item => {
          sections.push({ type: 'listItem', content: cleanBoldMarkers(item) });
        });
        currentList = [];
      }
      sections.push({ 
        type: 'heading', 
        content: trimmed.replace(/^\*\*|\*\*$/g, ''),
        level: 3
      });
    } else if (trimmed.match(/^\*\*[^:]+:\*\*/)) {
      // Bold heading with colon like **Title:**
      if (currentList.length > 0) {
        currentList.forEach(item => {
          sections.push({ type: 'listItem', content: cleanBoldMarkers(item) });
        });
        currentList = [];
      }
      sections.push({ 
        type: 'heading', 
        content: trimmed.replace(/^\*\*|\*\*$/g, '').replace(/:$/, ''),
        level: 3
      });
    } else if (trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
      // List item
      const itemContent = trimmed.replace(/^[-\d.]+\s*/, '');
      currentList.push(itemContent);
    } else {
      // Regular paragraph
      if (currentList.length > 0) {
        currentList.forEach(item => {
          sections.push({ type: 'listItem', content: cleanBoldMarkers(item) });
        });
        currentList = [];
      }
      sections.push({ type: 'paragraph', content: cleanBoldMarkers(trimmed) });
    }
  }
  
  // Flush remaining list items
  if (currentList.length > 0) {
    currentList.forEach(item => {
      sections.push({ type: 'listItem', content: cleanBoldMarkers(item) });
    });
  }
  
  return sections;
};

/**
 * Clean bold markers but preserve the text structure
 */
const cleanBoldMarkers = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
};

/**
 * Format content for display - converts markdown to clean readable format
 */
export const formatContentForDisplay = (content: string): string => {
  if (!content) return '';
  
  return content
    // Convert **bold** to just the text (cleaner reading)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Convert *italic* to just the text
    .replace(/\*([^*]+)\*/g, '$1')
    // Clean up numbered lists formatting
    .replace(/(\d+)\.\s+\*\*([^*]+)\*\*/g, '$1. $2')
    // Clean up bullet lists
    .replace(/^-\s+\*\*([^*]+)\*\*/gm, '• $1')
    .replace(/^-\s+/gm, '• ')
    // Ensure proper paragraph spacing
    .replace(/\n{3,}/g, '\n\n');
};

/**
 * Extract a clean preview from content
 */
export const extractPreview = (content: string, maxLength: number = 150): string => {
  const cleaned = cleanMarkdownText(content);
  if (cleaned.length <= maxLength) return cleaned;
  
  // Find a good break point
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...';
};
