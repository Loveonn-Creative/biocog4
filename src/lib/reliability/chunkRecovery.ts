// After a deploy, a visitor holding the previous index.html asks for code
// chunks that no longer exist, and the app shows a blank screen. Reload once
// to pick up the new build; never loop.
const KEY = "senseible:chunk-reload-at";
const WINDOW_MS = 60_000;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

/** Reloads the page at most once a minute. Returns true when a reload was started. */
export function reloadOnceForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked: still safe, because a failed reload lands on the error screen, not a loop.
  }
  window.location.reload();
  return true;
}

/** True on the page load that reloadOnceForNewBuild just started. */
export function justReloadedForNewBuild(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 15_000;
  } catch {
    return false;
  }
}

export function installChunkRecovery(): void {
  // Vite fires this when a preload or dynamic import fails.
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForNewBuild()) event.preventDefault();
  });
}
