import { useEffect, useRef } from 'react';

// One signal for "this user's records changed" (verified, deleted, uploaded),
// so every open view refetches from the database instead of keeping a stale
// copy. Works across tabs via BroadcastChannel where available.
const EVENT = 'senseible:records-changed';
const CHANNEL = 'senseible-records';

export function emitRecordsChanged(reason: string): void {
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } })); } catch { /* no window */ }
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ reason });
    bc.close();
  } catch { /* BroadcastChannel unsupported */ }
}

/** Non-hook form: runs `fn` whenever records change here or in another tab. Returns an unsubscribe function. */
export function subscribeRecordsChanged(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, fn);
  let bc: BroadcastChannel | null = null;
  try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = fn; } catch { bc = null; }
  return () => { window.removeEventListener(EVENT, fn); bc?.close(); };
}

/** Calls `onChange` whenever records change in this tab or another one. */
export function useRecordsChanged(onChange: () => void): void {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    const run = () => ref.current();
    window.addEventListener(EVENT, run);
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = run; } catch { bc = null; }
    return () => { window.removeEventListener(EVENT, run); bc?.close(); };
  }, []);
}
