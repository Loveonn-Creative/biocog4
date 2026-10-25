import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { justReloadedForNewBuild } from "@/lib/reliability/chunkRecovery";

// A fresh open, or our own reload after a deploy; not Back/Forward or a manual refresh.
const freshLoad = () => {
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  return !nav || nav.type === "navigate" || (nav.type === "reload" && justReloadedForNewBuild());
};

/**
 * A new page opens at its top, or at the #section its link names; the router
 * otherwise keeps the previous page's scroll offset, so a link from far down
 * one page landed near the bottom of the next. Back and forward are left to
 * the browser's own scroll restoration. Query-string changes on the same page
 * (filters, tabs) do not scroll. The first load also counts as POP, so a
 * #section on it (a shared link, or the reload after a deploy) is honoured
 * here: the browser's own jump runs before lazy content exists.
 */
export const ScrollManager = () => {
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType();
  const firstKey = useRef<string | null>(key);

  useLayoutEffect(() => {
    // True only until the first navigation, so Back to that entry later keeps the browser's restore.
    const initial = key === firstKey.current;
    if (!initial) firstKey.current = null;
    if (initial && type === "POP" && !freshLoad()) return;
    if (type === "POP" && !(initial && hash)) return;
    if (!initial) window.scrollTo(0, 0);
    if (!hash) return;
    if (initial && document.readyState !== "complete") {
      // On a reload the browser would put back the old offset after load, undoing the jump.
      history.scrollRestoration = "manual";
      window.addEventListener("load", () => setTimeout(() => { history.scrollRestoration = "auto"; }, 0), { once: true });
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let raf = 0;
    // The section may render a few frames later (lazy content).
    const find = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
      else if (++tries < 120) raf = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key only tells the first load apart; query changes must not scroll
  }, [pathname, hash, type]);

  return null;
};
