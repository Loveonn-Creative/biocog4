import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isStaleBuild } from '@/lib/reliability/newBuild';

// On the next route change after a newer build went live, load that page fresh
// (see lib/reliability/newBuild.ts). The first render never reloads.
export function NewBuildReload() {
  const { pathname, search, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (isStaleBuild()) window.location.assign(pathname + search + hash);
  }, [pathname, search, hash]);
  return null;
}
