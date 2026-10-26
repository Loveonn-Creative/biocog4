// Guest invoice reads: limits and file checks. Pure, so the website tests run
// it too. Guests are never stored on the server (extract-document); these
// limits keep "try as many as you like" from becoming an open AI bill.

import { detectFileKind } from './fileSignature.ts';

/** Invoices one device may read in a day without an account. */
export const GUEST_DAILY_SCANS = 30;
/** Backstop per network address, for scripts that mint new guest sessions. Shared office or mobile networks stay well under it. */
export const GUEST_IP_DAILY_SCANS = 300;
/** Largest file a guest may send, after base64 decoding. Photos are shrunk in the browser to fit. */
export const GUEST_MAX_BYTES = 2 * 1024 * 1024;
/** File types the reader accepts from guests. */
export const GUEST_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

export type GuestFileCheck = { ok: true; bytes: number } | { ok: false; status: 413 | 415; code: 'file_too_large' | 'unsupported_type'; message: string };

/** Decoded size of a base64 string without decoding it. */
export function base64Bytes(b64: string): number {
  const clean = b64.replace(/\s+/g, '');
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - pad);
}

export function guestFileCheck(imageBase64: string, mimeType: unknown): GuestFileCheck {
  const type = typeof mimeType === 'string' && mimeType ? mimeType.toLowerCase() : 'image/jpeg';
  if (!(GUEST_MIME_TYPES as readonly string[]).includes(type)) {
    return { ok: false, status: 415, code: 'unsupported_type', message: 'Upload a PDF or a photo (JPG, PNG, WEBP or HEIC) of the bill.' };
  }
  const bytes = base64Bytes(imageBase64);
  if (bytes > GUEST_MAX_BYTES) {
    return { ok: false, status: 413, code: 'file_too_large', message: `This file is ${(bytes / 1048576).toFixed(1)} MB. Without an account the limit is ${GUEST_MAX_BYTES / 1048576} MB; take a photo of the bill, or sign in for 15 MB.` };
  }
  if (!detectFileKind(imageBase64)) {
    return { ok: false, status: 415, code: 'unsupported_type', message: 'This file is not a PDF or a photo. Upload a PDF or a photo (JPG, PNG, WEBP or HEIC) of the bill.' };
  }
  return { ok: true, bytes };
}
