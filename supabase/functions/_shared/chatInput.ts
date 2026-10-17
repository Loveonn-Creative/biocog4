// Validates what a browser may send to intelligence-chat. Only the server
// writes system instructions: clients may send user and assistant turns as
// plain text, within size limits, and pick a language from a safe pattern.
// Pure: no Deno imports, so the website tests run it too.

export const CHAT_LIMITS = {
  maxMessages: 10, // most recent turns kept
  maxCharsPerMessage: 4000, // what the visitor may type in one message
  maxHistoryTurnChars: 6000, // earlier turns are shortened to this
  maxTotalChars: 20000, // oldest turns are dropped to stay under this
} as const;

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export type ChatInputResult =
  | { ok: true; messages: ChatTurn[]; language: string }
  | { ok: false; error: string };

// A language is a display name such as "English", "Hindi" or "Bahasa Indonesia".
// Anything else (instructions, punctuation, long text) falls back to English.
const LANGUAGE_RE = /^[A-Za-z][A-Za-z ]{1,29}$/;

// Data blocks only the server writes; a client copy of one is never trusted.
const DATA_BLOCK_RE = /<\s*(records|resources|evidence|system|instructions)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DATA_TAG_RE = /<\s*\/?\s*(records|resources|evidence|system|instructions)\b[^>]*>/gi;
const RECORD_ID_RE = /\[?\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b\]?|\[\s*[0-9a-f]{8}\s*\]/gi;

/**
 * An earlier answer as the client sends it back: plain text only. Evidence
 * events, data blocks, record ID markers and evidence summaries are removed,
 * so a client cannot claim records or figures the server never gave.
 */
export function stripClientEvidence(content: string): string {
  return content
    .replace(DATA_BLOCK_RE, ' ')
    .replace(DATA_TAG_RE, ' ')
    .split('\n')
    .filter((l) => !/^\s*(event|data|id|retry)\s*:/i.test(l) && !/^\s*(evidence|basis|calculation|projection|records?)\s*[·:|-]/i.test(l))
    .join('\n')
    .replace(RECORD_ID_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:])/g, '$1')
    .trim();
}

/** A question as typed: a pasted server data block is removed, the words kept. */
const stripDataTags = (content: string) => content.replace(DATA_TAG_RE, ' ').replace(/[ \t]{2,}/g, ' ').trim();

export function sanitizeChatInput(body: unknown): ChatInputResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const raw = Array.isArray(b.messages) ? b.messages : null;
  if (!raw || raw.length === 0) return { ok: false, error: 'messages is required' };

  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-CHAT_LIMITS.maxMessages)) {
    const msg = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { ok: false, error: 'Only user and assistant messages are accepted' };
    }
    if (typeof msg.content !== 'string') return { ok: false, error: 'Message content must be text' };
    const content = msg.role === 'assistant' ? stripClientEvidence(msg.content) : stripDataTags(msg.content);
    if (!content) continue;
    turns.push({ role: msg.role, content });
  }
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
    return { ok: false, error: 'The last message must be from the user' };
  }
  // The new question is checked exactly; earlier turns are context, so they
  // are shortened and the oldest dropped instead of failing the request.
  if (turns[turns.length - 1].content.length > CHAT_LIMITS.maxCharsPerMessage) {
    return { ok: false, error: `Keep your message under ${CHAT_LIMITS.maxCharsPerMessage} characters` };
  }
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].content.length > CHAT_LIMITS.maxHistoryTurnChars) turns[i].content = turns[i].content.slice(0, CHAT_LIMITS.maxHistoryTurnChars);
  }
  let total = turns.reduce((n, t) => n + t.content.length, 0);
  while (total > CHAT_LIMITS.maxTotalChars && turns.length > 1) total -= turns.shift()!.content.length;

  const lang = typeof b.language === 'string' ? b.language.trim() : '';
  return { ok: true, messages: turns, language: LANGUAGE_RE.test(lang) ? lang : 'English' };
}
