// Private download links for gated resources. A link carries the resource,
// a SHA-256 of the recipient's email (never the address) and an expiry,
// signed with HMAC-SHA256. Stateless, so the link works even before the leads
// table exists; when it does, downloads are counted against the lead.
// Web Crypto only: runs in Deno edge functions and in Bun tests.

const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The signing key is derived from a server secret with a fixed label, so the
// raw secret is never used directly and other uses of it are unaffected.
async function linkKey(secret: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const derived = new Uint8Array(await crypto.subtle.sign('HMAC', base, enc.encode('senseible-resource-link-v1')));
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export interface LinkClaims { r: string; h: string; x: number }

export async function signLink(claims: LinkClaims, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await linkKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** The claims when the signature is valid and the link has not expired; otherwise why not. */
export async function verifyLink(token: unknown, secret: string, nowMs: number):
  Promise<{ ok: true; claims: LinkClaims } | { ok: false; reason: 'invalid' | 'expired' }> {
  if (typeof token !== 'string' || token.length > 600 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return { ok: false, reason: 'invalid' };
  const [body, sig] = token.split('.');
  let valid = false;
  try {
    valid = await crypto.subtle.verify('HMAC', await linkKey(secret), fromB64url(sig), enc.encode(body));
  } catch { valid = false; }
  if (!valid) return { ok: false, reason: 'invalid' };
  let claims: LinkClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  } catch { return { ok: false, reason: 'invalid' }; }
  if (typeof claims?.r !== 'string' || typeof claims?.h !== 'string' || !/^[0-9a-f]{64}$/.test(claims.h) || typeof claims?.x !== 'number') return { ok: false, reason: 'invalid' };
  if (claims.x * 1000 < nowMs) return { ok: false, reason: 'expired' };
  return { ok: true, claims };
}
