// Reads the server's error message from a supabase.functions.invoke error.
// No imports, so any page can use it without loading the Supabase client.
/** Shown when Senseible's own AI capacity is unavailable (HTTP 402 from the reader). Never the person's plan. */
export const AI_PAUSED_MESSAGE = 'Bill reading is catching up with demand. Nothing was counted and your account is fine. Try again in a few minutes.';
/** Many reads at once (429). */
export const AI_BUSY_MESSAGE = "We're reading a high volume of bills right now. Nothing was counted. Try again in a minute.";
/** The file itself could not be read. */
export const UNREADABLE_MESSAGE = 'This file is hard to read. Nothing was counted. A sharp photo of the full page, or the original PDF, usually works first time.';

// The website owns the wording for these codes, so it changes with a site
// deploy and stays the same whichever server version sent the error.
const CODE_MESSAGES: Record<string, string> = {
  ai_busy: AI_BUSY_MESSAGE,
  ai_unavailable: AI_PAUSED_MESSAGE,
  ai_down: AI_PAUSED_MESSAGE,
  unreadable: UNREADABLE_MESSAGE,
};

/** HTTP status of a supabase.functions.invoke error, when there is one. */
export function functionErrorStatus(error: unknown): number | null {
  const context = (error as { context?: unknown } | null)?.context;
  const status = (context as { status?: unknown } | undefined)?.status;
  return typeof status === 'number' ? status : null;
}

export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (functionErrorStatus(error) === 402) return AI_PAUSED_MESSAGE;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).clone().json();
      if (typeof body?.code === 'string' && CODE_MESSAGES[body.code]) return CODE_MESSAGES[body.code];
      if (body && typeof body.error === 'string' && body.error) return body.error;
    } catch {
      // Body was not JSON; fall through.
    }
  }
  if (error instanceof Error && error.message && !/non-2xx|failed to send a request/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

/** The server's error code (e.g. 'ai_unavailable', 'monthly_limit'), when the body has one. */
export async function functionErrorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof (context as Response).json !== 'function') return null;
  try {
    const body = await (context as Response).clone().json();
    return typeof body?.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

// Codes after which every later file in a batch would fail the same way:
// reading paused or down on our side (503), busy (429) or a limit reached.
const STOP_CODES = new Set(['ai_unavailable', 'ai_down', 'ai_busy', 'monthly_limit', 'guest_daily_limit', 'guest_limit_unavailable']);

/** True when a batch should stop sending files after this error. */
export async function stopsBatch(error: unknown): Promise<boolean> {
  const status = functionErrorStatus(error);
  if (status === 402 || status === 429) return true;
  const code = await functionErrorCode(error);
  return code !== null && STOP_CODES.has(code);
}

/**
 * Runs `task` over `items` with at most `limit` at a time, in order of start.
 * `stopped()` is checked before each start, so a batch can stop early; items
 * not started are passed to `skipped`.
 */
export async function runPool<T>(items: T[], limit: number, task: (item: T, index: number) => Promise<void>, stopped: () => boolean, skipped?: (item: T, index: number) => void): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      if (stopped()) { skipped?.(items[i], i); continue; }
      await task(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
