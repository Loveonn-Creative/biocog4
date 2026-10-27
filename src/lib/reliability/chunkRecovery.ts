// After a deploy, a visitor holding the previous index.html asks for code
// chunks that no longer exist, and the app shows a blank screen. Reload to pick
// up the new build; never loop. The guard is per page: a second deploy, or a
// second page needing new code, still reloads; the same page failing again
// within a minute does not (that page is broken, so the error screen shows).
const KEY = "senseible:chunk-reload-at";
const PATH_KEY = "senseible:chunk-reload-path";
const WINDOW_MS = 60_000;
let reloading = false;

/** Whether a reload for this page is allowed (pure, for tests). */
export function mayReload(lastAt: number, lastPath: string | null, path: string, now: number): boolean {
  return !(now - lastAt < WINDOW_MS && lastPath === path);
}

/** True once a reload for a new build has started, so screens can wait instead of flashing an error. */
export const isReloadingForNewBuild = () => reloading;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

/** Reloads the page, at most once a minute for the same page. Returns true when a reload was started. */
export function reloadOnceForNewBuild(): boolean {
  if (reloading) return true;
  const path = window.location.pathname + window.location.search;
  try {
    if (!mayReload(Number(sessionStorage.getItem(KEY) || 0), sessionStorage.getItem(PATH_KEY), path, Date.now())) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
    sessionStorage.setItem(PATH_KEY, path);
  } catch {
    // Storage blocked: still safe, because a failed reload lands on the error screen, not a loop.
  }
  reloading = true;
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
