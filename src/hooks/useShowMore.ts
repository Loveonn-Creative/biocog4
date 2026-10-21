import { useState } from 'react';

// Long record lists open with the first few rows; the rest stay one tap away,
// so an account with hundreds of documents never loses access to its evidence.

export const INITIAL_ROWS = 6;

export function useShowMore<T>(items: T[], initial = INITIAL_ROWS) {
  const [all, setAll] = useState(false);
  return {
    visible: all ? items : items.slice(0, initial),
    hidden: Math.max(0, items.length - initial),
    all,
    toggle: () => setAll((v) => !v),
    reset: () => setAll(false),
  };
}
