import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { checkForNewBuild, isStaleBuild } from '@/lib/reliability/newBuild';

// On the next route change after a newer build went live, load that page fresh
// (see lib/reliability/newBuild.ts). The first render never reloads.
export function NewBuildReload() {
  const { pathname, search, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (isStaleBuild()) { window.location.assign(pathname + search + hash); return; }
    // Look for a newer build in the background so the next click loads it whole.
    void checkForNewBuild();
  }, [pathname, search, hash]);
  return null;
}
