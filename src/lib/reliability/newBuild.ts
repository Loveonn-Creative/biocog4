// A tab left open (or restored by a phone browser) keeps running the build it
// first loaded, so two devices can show different prices or wording after a
// deploy. Each build writes /version.json with its id; when the tab becomes
// visible again (at most every 5 minutes) we compare it with the id compiled
// into this bundle. If a newer build is live, the next in-app navigation loads
// the new page with a full reload. Never reloads in the middle of a page, so an
// upload or a payment in progress is not interrupted.

declare const __BUILD_ID__: string;

const CHECK_EVERY_MS = 5 * 60_000;
let lastCheck = 0;
let stale = false;

export const currentBuildId = (): string => (typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev');

/** True when a newer build id was seen on the server. */
export const isStaleBuild = () => stale;

export function isNewerBuild(live: unknown, current: string): boolean {
  return current !== 'dev' && typeof live === 'string' && live.length > 0 && live !== current;
}

export async function checkForNewBuild(now = Date.now(), fetcher: typeof fetch = fetch): Promise<boolean> {
  if (stale || currentBuildId() === 'dev' || now - lastCheck < CHECK_EVERY_MS) return stale;
  lastCheck = now;
  try {
    const res = await fetcher('/version.json', { cache: 'no-store' });
    if (!res.ok) return stale;
    const body = await res.json();
    stale = isNewerBuild(body?.build, currentBuildId());
  } catch {
    // Offline or blocked: keep the current build.
  }
  return stale;
}

export function installNewBuildCheck(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForNewBuild();
  });
}
