// Reads the server's error message from a supabase.functions.invoke error.
// No imports, so any page can use it without loading the Supabase client.
/** Shown when Senseible's own AI capacity is unavailable (HTTP 402 from the reader). Never the person's plan. */
export const AI_PAUSED_MESSAGE = 'Invoice reading is paused on our side right now. Your account is fine; please try again later.';

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
      if (body?.code === 'ai_unavailable') return AI_PAUSED_MESSAGE;
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
