// Verification evidence gate and scoring. Pure, so the same rules run in the
// verify-carbon function (stored records) and in the browser for a guest's
// preview (records kept in their browser), and the website tests run it too.
// A preview never records or verifies anything.

import { isPublishedFactor, publishedFactorFor } from './emissionFactors.ts';
import { LOWER_QUALITY_BASES } from './electricityBill.ts';

export interface EmissionRecord {
  id: string;
  category: string;
  scope: number;
  co2_kg: number;
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  data_quality: string | null;
  verification_notes?: string | null;
  documents?: {
    vendor: string | null;
    invoice_number: string | null;
    amount: number | null;
    confidence: number | null;
    document_hash?: string | null;
    invoice_date?: string | null;
    currency?: string | null;
    cached_result?: unknown;
  };
}

export function validateEmission(emission: EmissionRecord): { valid: boolean; flags: string[]; confidence: number } {
  const flags: string[] = [];
  let confidence = 100;
  
  // Check for missing or invalid data
  if (!emission.activity_data || emission.activity_data <= 0) {
    flags.push('Missing or invalid activity data');
    confidence -= 20;
  }
  
  if (!emission.activity_unit) {
    flags.push('Missing activity unit');
    confidence -= 15;
  }
  
  if (!emission.emission_factor) {
    flags.push('Missing emission factor');
    confidence -= 10;
  }
  
  // Check for abnormal quantities (simple threshold check). A large HT
  // electricity bill is routinely above a million kWh (1,000 MWh), so grid
  // electricity is flagged only above 100 million kWh on one record.
  const highQuantity = emission.category === 'electricity' ? 100_000_000 : 1_000_000;
  if (emission.activity_data && emission.activity_data > highQuantity) {
    flags.push('Abnormally high quantity - requires verification');
    confidence -= 25;
  }
  
  // A quantity estimated (kVAh x printed power factor), read from a
  // handwritten bill or worked out from meter readings is verifiable (its
  // evidence is on file) but never ranks above a printed reading.
  let basis: unknown = null;
  try { basis = (JSON.parse(emission.verification_notes || 'null') as { basis?: unknown } | null)?.basis ?? null; } catch { /* legacy notes */ }
  if (typeof basis === 'string' && LOWER_QUALITY_BASES.has(basis)) {
    flags.push('Activity estimated or hand-read (labelled); lower data quality than a printed reading');
    confidence -= 5;
  }

  // Check document confidence if available
  if (emission.documents?.confidence !== null && emission.documents?.confidence !== undefined && emission.documents.confidence < 70) {
    flags.push('Low OCR confidence on source document');
    confidence -= 15;
  }
  
  // Cap confidence between 0 and 100
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    valid: confidence >= 80,
    flags,
    confidence
  };
}

export function calculateGreenwashingRisk(emissions: EmissionRecord[], validationResults: Map<string, { flags: string[]; confidence: number }>): { risk: 'low' | 'medium' | 'high'; factors: string[] } {
  let riskScore = 0;
  const factors: string[] = [];
  
  // Check for too many perfect numbers (suspicious)
  const perfectNumbers = emissions.filter(e => e.co2_kg === Math.round(e.co2_kg)).length;
  if (perfectNumbers / emissions.length > 0.8) {
    riskScore += 20;
    factors.push(`${Math.round((perfectNumbers / emissions.length) * 100)}% of values are round numbers — unusual for real-world data`);
  }
  
  // Check for missing documentation
  const noDocumentation = emissions.filter(e => !e.documents?.invoice_number).length;
  if (noDocumentation / emissions.length > 0.5) {
    riskScore += 30;
    factors.push(`${noDocumentation}/${emissions.length} records missing invoice documentation`);
  }
  
  // Check overall data quality
  let totalConfidence = 0;
  validationResults.forEach((result) => {
    totalConfidence += result.confidence;
  });
  const avgConfidence = totalConfidence / validationResults.size;
  
  if (avgConfidence < 60) {
    riskScore += 30;
    factors.push(`Average data confidence ${avgConfidence.toFixed(0)}% — below 60% threshold`);
  } else if (avgConfidence < 80) {
    riskScore += 15;
    factors.push(`Average data confidence ${avgConfidence.toFixed(0)}% — moderate quality`);
  }
  
  // Check for consistent emission factors. Grid electricity shares one
  // national factor by design, so it is left out of this check.
  const nonGrid = emissions.filter(e => e.category !== 'electricity');
  const factorSet = new Set(nonGrid.map(e => e.emission_factor));
  if (factorSet.size === 1 && nonGrid.length > 3) {
    riskScore += 10;
    factors.push('Identical emission factor across all records — suggests generic classification');
  }
  
  let risk: 'low' | 'medium' | 'high';
  if (riskScore >= 50) risk = 'high';
  else if (riskScore >= 25) risk = 'medium';
  else risk = 'low';
  
  if (factors.length === 0) factors.push('No specific risk triggers identified');
  
  return { risk, factors };
}

/**
 * What a record still needs before it can be verified. The same gate runs on
 * stored records and on a guest's browser-held preview. Pure.
 */
export function evidenceGaps(emission: EmissionRecord & { document_id?: string | null }, repairOnly: boolean): string[] {
  const fields: string[] = [];
  const doc = emission.documents;
  if (!emission.document_id || !doc) fields.push('source invoice');
  if (!doc?.document_hash) fields.push('document fingerprint');
  if (!Number.isInteger(emission.scope) || emission.scope < 1 || emission.scope > 3) fields.push('scope');
  // Scope 3 is verified line by line in the supplier evidence trail
  // (approved, sourced factors; reconciled, deduplicated invoices), not
  // here. Repair of an earlier result still runs: it creates nothing new.
  if (emission.scope === 3 && !repairOnly) fields.push('Scope 3 is verified in the supplier evidence trail');
  if (!emission.category || emission.category === 'other') fields.push('activity classification');
  if (!Number.isFinite(emission.activity_data) || emission.activity_data! <= 0) fields.push('activity quantity');
  if (!emission.activity_unit?.trim()) fields.push('activity unit');
  if (!Number.isFinite(emission.emission_factor) || emission.emission_factor! <= 0) fields.push('emission factor');
  if (!Number.isFinite(emission.co2_kg) || emission.co2_kg < 0) fields.push('calculated emissions');
  let provenance: Record<string, unknown> | null = null;
  try { provenance = JSON.parse(emission.verification_notes || 'null'); } catch { /* legacy notes */ }
  if (!provenance || typeof provenance.factorSource !== 'string' || !provenance.factorSource.trim()) fields.push('factor source');
  if (!provenance || typeof provenance.sourceDescription !== 'string' || !provenance.sourceDescription.trim()) fields.push('source line item');
  // A row written by the current methodology must carry its published
  // factor: the stored value is re-derived, not trusted. Earlier versions
  // keep their own factors and are not re-derived here; repair replays
  // an earlier result and creates nothing new.
  const published = provenance ? publishedFactorFor(provenance.factorSource as string) : null;
  if (!repairOnly && published !== null && Number.isFinite(emission.emission_factor) && !isPublishedFactor(provenance?.factorSource as string, emission.emission_factor!)) {
    fields.push('emission factor does not match the published factor for its source');
  }
  if (Number.isFinite(emission.activity_data) && Number.isFinite(emission.emission_factor) && Number.isFinite(emission.co2_kg) &&
    Math.abs(emission.activity_data! * emission.emission_factor! - emission.co2_kg) > Math.max(0.01, Math.abs(emission.co2_kg) * 0.001)) {
    fields.push('quantity × factor does not match stored emissions');
  }
  return fields;
}

export type PreviewOutcome = 'would_verify' | 'needs_review' | 'would_reject' | 'needs_inputs';

/** The guest preview: the same gate and scoring as a real verification, as a would-be outcome. */
export function previewVerification(rows: Array<EmissionRecord & { document_id?: string | null }>) {
  const missingInputs = rows.map((e) => ({ emissionId: e.id, fields: evidenceGaps(e, false) })).filter((m) => m.fields.length);
  const validation = new Map(rows.map((e) => [e.id, validateEmission(e)] as const));
  const { risk, factors } = calculateGreenwashingRisk(rows, validation);
  const validRatio = rows.length ? [...validation.values()].filter((v) => v.valid).length / rows.length : 0;
  const outcome: PreviewOutcome = missingInputs.length ? 'needs_inputs'
    : validRatio >= 0.8 && risk === 'low' ? 'would_verify'
    : validRatio >= 0.5 && risk !== 'high' ? 'needs_review' : 'would_reject';
  const scopeBreakdown = { scope1: 0, scope2: 0, scope3: 0 };
  for (const e of rows) if (e.scope === 1 || e.scope === 2 || e.scope === 3) scopeBreakdown[`scope${e.scope}` as 'scope1'] += Number.isFinite(e.co2_kg) ? e.co2_kg : 0;
  return {
    outcome, score: validRatio, greenwashingRisk: risk, riskFactors: factors,
    flags: [...new Set([...validation.values()].flatMap((v) => v.flags))],
    missingInputs, scopeBreakdown,
    totalCO2Kg: Math.round((scopeBreakdown.scope1 + scopeBreakdown.scope2 + scopeBreakdown.scope3) * 1000) / 1000,
  };
}
