// What an email link (sign-up confirmation, magic link, password reset) left in
// the address bar, and what to tell the person. Pure, so it is tested directly.
//
// Supabase Auth contract (implicit flow, the client default): on success the
// link lands with #access_token=...&type=signup|recovery|magiclink|invite; on
// failure with #error=<oauth error>&error_code=<code>&error_description=<text>.
// The PKCE flow puts the same error keys in the query string, so both are read.
// Codes handled: otp_expired (expired or already used), access_denied,
// flow_state_expired / flow_state_not_found / bad_code_verifier (link opened in
// another browser or too late), user_banned, signup_disabled, and anything
// else as a generic invalid link. A redirect URL that is not on the project's
// allow list does not error: Supabase silently falls back to the Site URL, so
// https://senseible.earth/auth must be on that list.

export type AuthLinkKind = 'expired' | 'other_browser' | 'blocked' | 'invalid';

export interface AuthLinkError {
  code: string;
  kind: AuthLinkKind;
  /** Short title for the toast. */
  title: string;
  /** One sentence on what happened and what to do. */
  detail: string;
  /** Whether sending a fresh confirmation email can fix it. */
  canResend: boolean;
}

export interface AuthLinkSuccess { type: string }

const params = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ''));

export function parseAuthLinkError(hash: string, search: string): AuthLinkError | null {
  const h = params(hash);
  const q = params(search);
  const get = (k: string) => h.get(k) ?? q.get(k);
  const error = get('error');
  const code = get('error_code') || (error ? error : null);
  if (!code) return null;
  if (code === 'otp_expired') {
    return { code, kind: 'expired', title: 'Link expired or already used', detail: 'Email links work once and expire after a while. Send yourself a fresh one.', canResend: true };
  }
  if (code === 'flow_state_expired' || code === 'flow_state_not_found' || code === 'bad_code_verifier') {
    return { code, kind: 'other_browser', title: 'Open the link in the same browser', detail: 'This link has to be opened in the browser where you signed up, and soon after it was sent. Send a fresh one from here.', canResend: true };
  }
  if (code === 'user_banned' || code === 'signup_disabled') {
    return { code, kind: 'blocked', title: 'This account cannot sign in', detail: 'Please write to impact@senseible.earth and we will look into it.', canResend: false };
  }
  // access_denied without a more specific code, and anything unknown.
  return { code, kind: code === 'access_denied' ? 'expired' : 'invalid', title: 'Link expired or already used', detail: 'This link is no longer valid. Send yourself a fresh one, or sign in if you already confirmed.', canResend: true };
}

/** A successful link: the token type Supabase put in the hash. */
export function parseAuthLinkSuccess(hash: string): AuthLinkSuccess | null {
  const h = params(hash);
  return h.get('access_token') ? { type: h.get('type') || 'signin' } : null;
}

/** True when the address bar carries anything from an auth link that should be removed after reading. */
export function hasAuthLinkParams(hash: string, search: string): boolean {
  const h = params(hash);
  const q = params(search);
  return ['error', 'error_code', 'error_description', 'access_token', 'refresh_token'].some((k) => h.has(k)) || ['error', 'error_code', 'error_description'].some((k) => q.has(k));
}

/** The address without auth-link keys, keeping any other query (for example ?next=). */
export function cleanAuthUrl(pathname: string, search: string): string {
  const q = params(search);
  for (const k of ['error', 'error_code', 'error_description', 'code']) q.delete(k);
  const s = q.toString();
  return `${pathname}${s ? `?${s}` : ''}`;
}

/** Message for a failed resend, by Supabase error code or HTTP status. */
export function resendErrorMessage(err: { code?: string; status?: number; message?: string } | null): string {
  if (!err) return '';
  if (err.code === 'over_email_send_rate_limit' || err.status === 429) return 'Too many emails sent. Wait a minute, then try again.';
  if (err.code === 'email_address_invalid' || err.code === 'validation_failed') return 'That email address does not look right. Check it and try again.';
  if (err.code === 'user_already_exists' || /already confirmed/i.test(err.message ?? '')) return 'This email is already confirmed. Sign in instead.';
  return 'Could not send the email just now. Check your connection and try again.';
}

/** Where the confirmation email returns people. Must be on the Supabase redirect allow list. */
export const EMAIL_REDIRECT_URL = 'https://senseible.earth/auth';

const PENDING_KEY = 'senseible_pending_signup_email';
/** The address of a sign-up awaiting confirmation, kept on this device only so "Resend" needs no typing. */
export function rememberPendingEmail(email: string): void {
  try { localStorage.setItem(PENDING_KEY, email); } catch { /* storage blocked */ }
}
export function pendingEmail(): string {
  try { return localStorage.getItem(PENDING_KEY) ?? ''; } catch { return ''; }
}
export function forgetPendingEmail(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ }
}
