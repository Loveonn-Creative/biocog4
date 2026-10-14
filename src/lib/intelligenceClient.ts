// Biocog Intelligence on the page: turning server and network outcomes into a
// status the person can act on, and a reply into chat-sized bits. Pure, so it
// is tested directly. Never produces an answer; only says what happened.

export type ChatFailureKind = 'limit' | 'unavailable' | 'rejected' | 'network' | 'timeout' | 'empty' | 'server';

export interface ChatFailure {
  kind: ChatFailureKind;
  message: string;
  /** Sending the same question again can work. */
  retry: boolean;
  action?: { label: string; to: string };
}

export type Audience = 'guest' | 'snapshot' | 'essential' | 'pro' | 'scale';

/** What a failed response means. 402/429/503 from the AI provider are Senseible's capacity, never the person's plan. */
export function chatFailure(status: number, body: unknown, audience: Audience | null): ChatFailure {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = typeof b.message === 'string' ? b.message : typeof b.error === 'string' ? b.error : '';
  if (status === 429 && (b.error === 'monthly_limit' || b.error === 'daily_limit')) {
    const limit = typeof b.limit === 'number' ? b.limit : null;
    return {
      kind: 'limit',
      message: `You've used this month's ${limit ?? ''} questions. More on the 1st.`.replace('  ', ' '),
      retry: false,
      action: audience === 'guest' || audience === null
        ? { label: 'Sign in for more', to: '/auth?next=/intelligence' }
        : audience === 'pro' || audience === 'scale' ? undefined : { label: 'See Pro', to: '/pricing' },
    };
  }
  if (status === 402 || status === 429 || status === 502 || status === 503) {
    return { kind: 'unavailable', message: "Biocog Intelligence can't answer right now. This is on our side, not your account. Try again in a few minutes.", retry: true };
  }
  if (status === 400 || status === 403) {
    return { kind: 'rejected', message: text && text.length < 160 ? text : 'That question could not be sent. Try rephrasing it.', retry: false };
  }
  return { kind: 'server', message: 'Something went wrong on our side. Try again.', retry: true };
}

export const NETWORK_FAILURE: ChatFailure = { kind: 'network', message: 'No connection. Check your internet and try again.', retry: true };
export const TIMEOUT_FAILURE: ChatFailure = { kind: 'timeout', message: 'That took too long to answer. Try again.', retry: true };
export const EMPTY_FAILURE: ChatFailure = { kind: 'empty', message: 'No answer came back. Try again.', retry: true };

/** How long to wait for the first byte of an answer. */
export const CHAT_TIMEOUT_MS = 45000;

/** A reply as the short messages the model was asked to send (blank-line separated). */
export function chatBits(text: string): string[] {
  const bits = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return bits.length ? bits : text.trim() ? [text.trim()] : [];
}

/**
 * Reads complete SSE lines from a buffer. Returns the text deltas found, the
 * unread remainder, and whether the stream said it is done.
 */
export function readSse(buffer: string): { deltas: string[]; rest: string; done: boolean } {
  const deltas: string[] = [];
  let done = false;
  let rest = buffer;
  let nl: number;
  while ((nl = rest.indexOf('\n')) !== -1) {
    let line = rest.slice(0, nl);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line.startsWith('data: ')) { rest = rest.slice(nl + 1); continue; }
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') { done = true; rest = rest.slice(nl + 1); continue; }
    rest = rest.slice(nl + 1);
    try {
      const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) deltas.push(delta);
    } catch {
      // A complete line that is not JSON (keep-alive or noise): skip it.
    }
  }
  return { deltas, rest, done };
}
