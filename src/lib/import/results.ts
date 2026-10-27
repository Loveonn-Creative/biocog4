// Final status of every row after an import, so the result screen lists each
// row once and the counts add up to the file. A row is "saved" only when the
// import-records function said so. Pure, so it is unit tested.
import type { CheckedRow } from "./validate";

export type Outcome =
  | { line: number; status: "saved"; documentId: string; emissions: number }
  | { line: number; status: "duplicate"; reason: string }
  | { line: number; status: "invalid"; reason: string }
  | { line: number; status: "failed"; reason: string; code?: string };
export type FinalStatus = "saved" | "duplicate" | "fix" | "failed";
export interface FinalRow { line: number; status: FinalStatus; reason: string }
/** Every row of the file, each with one final status, so the counts add up to the file. */
export interface SaveSummary { rows: FinalRow[]; counts: Record<FinalStatus, number>; error: string | null }

export const NOT_SAVED = "Not saved. Try again.";

/** Final status of every row: the browser's check for rows not sent, the server's answer for rows sent. */
export function finalRows(all: CheckedRow[], outcomes: Map<number, Outcome>, unsentReason: string): FinalRow[] {
  return all.map((r): FinalRow => {
    if (r.status === "fix") return { line: r.line, status: "fix", reason: r.issues.map(i => i.message).join(" ") };
    if (r.status === "duplicate") return { line: r.line, status: "duplicate", reason: `Same bill as row ${r.duplicateOf}.` };
    const o = outcomes.get(r.line);
    if (!o) return { line: r.line, status: "failed", reason: unsentReason };
    if (o.status === "saved") return { line: r.line, status: "saved", reason: o.emissions ? "" : "Saved. No carbon figure for freight yet." };
    if (o.status === "invalid") return { line: r.line, status: "fix", reason: o.reason };
    return { line: r.line, status: o.status, reason: o.reason };
  });
}
