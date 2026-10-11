// Reads the server's error message from a supabase.functions.invoke error.
// No imports, so any page can use it without loading the Supabase client.
export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).clone().json();
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
