// Captured before anything else runs (first import in main.tsx), so the auth
// client clearing the address bar cannot hide what an email link brought.
import { hasAuthLinkParams } from './authLink';

const snap = typeof window === 'undefined'
  ? { hash: '', search: '', pathname: '/' }
  : { hash: window.location.hash, search: window.location.search, pathname: window.location.pathname };
let consumed = false;

/** The address the page was opened with, once; later calls get an empty result. */
export function takeAuthLinkSnapshot(): { hash: string; search: string; pathname: string } | null {
  if (consumed || !hasAuthLinkParams(snap.hash, snap.search)) return null;
  consumed = true;
  return snap;
}

/** Peek without consuming (for routing decisions). */
export function peekAuthLinkSnapshot(): { hash: string; search: string; pathname: string } | null {
  return !consumed && hasAuthLinkParams(snap.hash, snap.search) ? snap : null;
}
