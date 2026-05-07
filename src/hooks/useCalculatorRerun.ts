import { useEffect } from "react";

const KEY = (slug: string) => `calc-rerun:${slug}`;

export const stashRerun = (slug: string, inputs: unknown) => {
  try { sessionStorage.setItem(KEY(slug), JSON.stringify(inputs)); } catch { /* ignore */ }
};

/**
 * On mount, if a rerun payload was stashed (via History page "Re-run"),
 * pass it to the calculator's `applyInputs` callback once and clear the stash.
 */
export const useCalculatorRerun = (slug: string, applyInputs: (inputs: Record<string, unknown>) => void) => {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY(slug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      sessionStorage.removeItem(KEY(slug));
      applyInputs(parsed);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
};
