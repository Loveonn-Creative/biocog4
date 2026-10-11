// Whole calendar days from today to a date, counted in India time, so a
// countdown changes exactly once a day at midnight IST for every visitor.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const istDayNumber = (ms: number) => Math.floor((ms + IST_OFFSET_MS) / 86_400_000);

/** Days from today (IST) until `isoDate` (YYYY-MM-DD). 0 on the day itself, never negative. */
export function daysUntilIst(isoDate: string, now: number = Date.now()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d) / 86_400_000;
  return Math.max(0, target - istDayNumber(now));
}

/** Milliseconds until the next midnight in India, for scheduling a refresh. */
export function msUntilNextIstMidnight(now: number = Date.now()): number {
  return (istDayNumber(now) + 1) * 86_400_000 - IST_OFFSET_MS - now;
}
