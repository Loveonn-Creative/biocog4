// Saving business details to profiles. The database accepts company size only
// as micro, small or medium (profiles_size_check), or empty; an empty text box
// or a free-text size used to fail the whole save, so GSTIN and business name
// never saved either. 'large' needs pending migration 20261025100000; until it
// is applied the rest of the details still save.

export const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (<10 employees)' },
  { value: 'small', label: 'Small (10-50 employees)' },
  { value: 'medium', label: 'Medium (50-250 employees)' },
  { value: 'large', label: 'Large (>250 employees)' },
] as const;

const SIZE_VALUES = new Set<string>(COMPANY_SIZES.map((s) => s.value));

/** A size the database can hold, or null for "not set". Pure. */
export function normaliseSize(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return SIZE_VALUES.has(s) ? s : null;
}

/** Empty text becomes null; GSTIN is upper-cased with spaces removed. Pure. */
export function cleanProfileFields<T extends Record<string, unknown>>(fields: T): T {
  const out: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string') out[k] = v.trim() === '' ? null : v.trim();
  }
  if (typeof out.gstin === 'string') out.gstin = out.gstin.replace(/\s+/g, '').toUpperCase();
  if ('size' in out) out.size = normaliseSize(out.size);
  return out as T;
}

export const isSizeCheckError = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === '23514' && /profiles_size_check/.test(e.message ?? ''));

/**
 * The profiles columns for the fields a page changed, so a save never sends a
 * value the page only displayed (an older tab would overwrite a newer value).
 * Fields with no column (local-only settings) are left out. Pure.
 */
export function changedProfileColumns<T extends object>(
  values: T,
  changed: Iterable<keyof T>,
  columns: Partial<Record<keyof T, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of changed) {
    const column = columns[key];
    if (column) out[column] = values[key];
  }
  return out;
}

type Saver = (fields: Record<string, unknown>) => PromiseLike<{ error: { code?: string; message?: string } | null }>;

/**
 * Saves the details; if only the size is refused (a value the database does
 * not accept yet), saves everything else and reports that.
 */
export async function saveProfileFields(save: Saver, fields: Record<string, unknown>): Promise<{ ok: boolean; sizeSkipped: boolean; error?: string }> {
  const clean = cleanProfileFields(fields);
  const { error } = await save(clean);
  if (!error) return { ok: true, sizeSkipped: false };
  if (isSizeCheckError(error) && 'size' in clean) {
    const { size: _skip, ...rest } = clean;
    void _skip;
    const retry = await save(rest);
    if (!retry.error) return { ok: true, sizeSkipped: true };
    return { ok: false, sizeSkipped: false, error: retry.error.message };
  }
  return { ok: false, sizeSkipped: false, error: error.message };
}
