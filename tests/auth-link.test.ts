import { describe, expect, test } from 'bun:test';
import { cleanAuthUrl, EMAIL_REDIRECT_URL, hasAuthLinkParams, parseAuthLinkError, parseAuthLinkMessage, parseAuthLinkSuccess, resendErrorMessage } from '../src/lib/authLink';

describe('email link errors (Supabase contract)', () => {
  test('expired or used link in the hash (implicit flow)', () => {
    const e = parseAuthLinkError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '')!;
    expect(e.code).toBe('otp_expired');
    expect(e.title).toBe('Link expired or already used');
    expect(e.canResend).toBe(true);
  });
  test('the same keys in the query string (PKCE flow)', () => {
    expect(parseAuthLinkError('', '?error=access_denied&error_code=otp_expired')!.code).toBe('otp_expired');
  });
  test('access_denied without a code is treated as an expired link', () => {
    const e = parseAuthLinkError('#error=access_denied&error_description=x', '')!;
    expect(e.code).toBe('access_denied');
    expect(e.canResend).toBe(true);
  });
  test('opened in another browser', () => {
    expect(parseAuthLinkError('', '?error_code=flow_state_not_found')!.kind).toBe('other_browser');
    expect(parseAuthLinkError('', '?error_code=bad_code_verifier')!.kind).toBe('other_browser');
  });
  test('blocked accounts are not offered a resend', () => {
    expect(parseAuthLinkError('#error_code=user_banned', '')!.canResend).toBe(false);
    expect(parseAuthLinkError('#error_code=signup_disabled', '')!.canResend).toBe(false);
  });
  test('an unknown code still gets a message and a way out', () => {
    const e = parseAuthLinkError('#error=server_error&error_code=unexpected_failure', '')!;
    expect(e.kind).toBe('invalid');
    expect(e.canResend).toBe(true);
  });
  test('no error keys: nothing to show', () => {
    expect(parseAuthLinkError('#section-2', '?next=/dashboard')).toBeNull();
  });
});

describe('email link success', () => {
  test('confirmation tokens are recognised with their type', () => {
    expect(parseAuthLinkSuccess('#access_token=a&refresh_token=b&type=signup')).toEqual({ type: 'signup' });
    expect(parseAuthLinkSuccess('#section-2')).toBeNull();
  });
});

describe('address cleanup', () => {
  test('auth keys are detected; ordinary anchors are not', () => {
    expect(hasAuthLinkParams('#access_token=a', '')).toBe(true);
    expect(hasAuthLinkParams('', '?error_code=otp_expired')).toBe(true);
    expect(hasAuthLinkParams('#pricing', '?next=/x')).toBe(false);
  });
  test('the cleaned address keeps ?next and drops the error and code keys', () => {
    expect(cleanAuthUrl('/auth', '?next=/green-loan&error=access_denied&error_code=otp_expired&code=abc')).toBe('/auth?next=%2Fgreen-loan');
    expect(cleanAuthUrl('/auth', '')).toBe('/auth');
  });
  test('confirmation emails return to /auth on the production domain', () => {
    expect(EMAIL_REDIRECT_URL).toBe('https://senseible.earth/auth');
  });
});

describe('resend failures', () => {
  test('rate limit, bad address, already confirmed, network', () => {
    expect(resendErrorMessage({ code: 'over_email_send_rate_limit', status: 429 })).toMatch(/Wait a minute/);
    expect(resendErrorMessage({ code: 'email_address_invalid' })).toMatch(/does not look right/);
    expect(resendErrorMessage({ message: 'Email already confirmed' })).toMatch(/Sign in/);
    expect(resendErrorMessage({ message: 'Failed to fetch' })).toMatch(/connection/);
  });
});

describe('email change links', () => {
  test('first confirmed link carries a message and is cleaned from the address bar', () => {
    const h = '#message=Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email';
    expect(parseAuthLinkMessage(h)).toContain('Confirmation link accepted');
    expect(hasAuthLinkParams(h, '')).toBe(true);
    expect(parseAuthLinkMessage('#access_token=x&type=email_change')).toBeNull();
  });
});
