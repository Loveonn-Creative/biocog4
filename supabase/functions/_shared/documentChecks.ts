// Which notes on a read document are information and which are checks a
// person should act on. Shared by the reader and the result screen so the
// "Checks" count only moves when the document itself is weaker, not when
// the AI phrases a unit differently. Pure, no imports.

/** Notes that explain how a value was read; they are not problems. */
const INFO_NOTES: RegExp[] = [
  /read as kWh \(electricity billing unit\)$/i,
  /printed kWh read as grid electricity$/i,
  /^Billed consumption .* taken from the printed units on the bill$/i,
  /^India grid factor used: no country is set in Settings$/i,
  /^Avoided emissions from green items are reported separately and not netted$/i,
];

export function isInfoNote(flag: string): boolean {
  return INFO_NOTES.some((re) => re.test(flag.trim()));
}

/** Splits a document's notes into checks (counted) and information (listed, not counted). */
export function splitDocumentNotes(flags: readonly string[]): { checks: string[]; info: string[] } {
  const checks: string[] = [];
  const info: string[] = [];
  for (const f of flags) (isInfoNote(f) ? info : checks).push(f);
  return { checks, info };
}
