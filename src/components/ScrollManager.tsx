import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * A new page opens at its top, or at the #section its link names; the router
 * otherwise keeps the previous page's scroll offset, so a link from far down
 * one page landed near the bottom of the next. Back and forward are left to
 * the browser's own scroll restoration. Query-string changes on the same page
 * (filters, tabs) do not scroll.
 */
export const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();

  useLayoutEffect(() => {
    if (type === "POP") return;
    window.scrollTo(0, 0);
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let raf = 0;
    // The section may render a few frames later (lazy content).
    const find = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
      else if (++tries < 40) raf = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash, type]);

  return null;
};
