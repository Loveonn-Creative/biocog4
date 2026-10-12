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
    const content = msg.content.trim();
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
