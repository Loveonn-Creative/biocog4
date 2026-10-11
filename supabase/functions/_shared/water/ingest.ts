import type { ReasonCode, VolumeKind, WaterActivity, WaterBillInput } from './types.ts';
import { toM3 } from './units.ts';

const enc = new TextEncoder();
async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}

/** Identity of a bill without its volume: a changed volume is a new version of the same bill. */
export function billIdentity(b: WaterBillInput): string {
  return JSON.stringify([b.entity_id, b.site_id, b.supplier_id, b.billing_period_start, b.billing_period_end, b.volume_kind, b.source_document_ref]);
}

/** Idempotency key: hash of entity, site, supplier, period, volume kind, raw volume and document ref. */
export function idempotencyKey(b: WaterBillInput): Promise<string> {
  return sha256(JSON.stringify([b.entity_id, b.site_id, b.supplier_id, b.billing_period_start, b.billing_period_end, b.volume_kind, b.volume_raw, b.unit_raw, b.source_document_ref]));
}

export interface Validation { ok: boolean; reasons: ReasonCode[]; volume_m3: number | null; missing: string[] }

/**
 * Validation never discards a bill (I1). It reports reason codes; the bill is
 * stored either way and an INVALID_INPUT result is written when not ok.
 */
export function validateBill(b: WaterBillInput): Validation {
  const reasons: ReasonCode[] = [];
  const missing: string[] = [];
  if (!b.site_id) missing.push('site');
  if (!b.supplier_id) missing.push('supplier');
  if (!b.billing_period_start || !b.billing_period_end) missing.push('period');
  if (b.volume_raw === null || b.volume_raw === undefined || !Number.isFinite(b.volume_raw)) missing.push('volume');
  if (!b.unit_raw) missing.push('unit');
  if (b.billing_period_start && b.billing_period_end && b.billing_period_end < b.billing_period_start) missing.push('period');
  if (missing.length) reasons.push('MISSING_FIELD');

  let volume_m3: number | null = null;
  if (b.unit_raw && Number.isFinite(b.volume_raw as number)) {
    volume_m3 = toM3(b.volume_raw as number, b.unit_raw);
    if (volume_m3 === null) reasons.push('UNKNOWN_UNIT');
  }
  if (volume_m3 !== null && volume_m3 < 0 && !b.corrects_bill_id) reasons.push('NEGATIVE_VOLUME_UNMATCHED');
  return { ok: reasons.length === 0, reasons, volume_m3, missing };
}

export function activityFor(kind: VolumeKind): WaterActivity | null {
  return kind === 'SUPPLY' ? 'WATER_SUPPLY' : kind === 'WASTEWATER' ? 'WATER_WASTEWATER_TREATMENT' : null;
}
