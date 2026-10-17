// The confidential internal review inbox lives only in the INTERNAL_INBOX
// edge-function secret (Supabase project secrets). It is never written in
// code, sent to a browser or logged. Without the secret, internal
// notifications are skipped and the caller reports the send as failed.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function internalInbox(): string | null {
  const v = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get('INTERNAL_INBOX')?.trim();
  return v && EMAIL.test(v) ? v : null;
}
