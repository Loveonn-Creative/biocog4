// Months with no electricity bill between the first and the last one on
// record, from every record (verified or not), so a bill already uploaded is
// never asked for again. Months after the latest bill are not flagged: that
// bill may not be issued yet.

interface Row { scope: number; category: string; activity_date?: string | null; created_at: string }

const monthOf = (d: string | null | undefined) => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null);

export function missingElectricityMonths(rows: Row[]): string[] {
  const months = [...new Set(rows
    .filter((r) => r.scope === 2 && /electric/i.test(r.category))
    .map((r) => monthOf(r.activity_date) ?? monthOf(r.created_at))
    .filter((m): m is string => !!m))].sort();
  if (months.length < 2) return [];
  const out: string[] = [];
  let [y, m] = months[0].split('-').map(Number);
  const last = months[months.length - 1];
  for (let i = 0; i < 240; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key >= last) break;
    if (!months.includes(key)) out.push(key);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
