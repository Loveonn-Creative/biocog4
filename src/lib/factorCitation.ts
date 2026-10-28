// The factor source a report prints for a record: the published citation
// stored with it (verification_notes.factorCitation, written by the reader
// from emissionFactors.ts), else the stored source key for records saved
// before citations were kept. Pure.

/** The citation stored in an emission row's verification notes, or null. */
export function factorCitationOf(verificationNotes: unknown): string | null {
  if (typeof verificationNotes !== 'string' || !verificationNotes) return null;
  try {
    const notes = JSON.parse(verificationNotes) as { factorCitation?: unknown } | null;
    const c = notes && typeof notes === 'object' ? notes.factorCitation : null;
    if (typeof c !== 'string' || !c.trim()) return null;
    // v1.1 stored "BIOCOG_MVR_INDIA v1.0 (unchanged)" for diesel, petrol and
    // coal: a method name, not a publication, so the source key is shown.
    return /^BIOCOG_MVR_INDIA\b/.test(c.trim()) ? null : c.trim();
  } catch {
    return null;
  }
}

/** The distinct factor sources a report lists, citation first, in record order. */
export function reportFactorSources(rows: Array<{ factorSource: string | null; factorCitation?: string | null }>): string[] {
  return [...new Set(rows.map((r) => r.factorCitation || r.factorSource).filter(Boolean) as string[])];
}
