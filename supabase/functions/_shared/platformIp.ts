/**
 * The caller's address as Cloudflare saw it (cf-connecting-ip is set by the
 * edge and cannot be supplied by the client). Used for abuse caps on public
 * functions; falls back to the proxy headers, then 'unknown'.
 */
export function platformIp(headers: Headers): string {
  return headers.get('cf-connecting-ip')?.trim()
    || headers.get('x-real-ip')?.trim()
    || headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown';
}
