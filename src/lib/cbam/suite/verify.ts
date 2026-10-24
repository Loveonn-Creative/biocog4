// Verification support. Two modes:
// - external: a verifier the client appoints; we record their details,
//   accreditation and opinion.
// - senseible: Senseible's in-house verifier runs the same checks and signs off.
//   Labelled "Verified by Senseible" (owner, 24 Oct 2026) with reviewer name,
//   role and sign-off SHA-256; never called accredited.
// Checks and thresholds from the Commission's guidance on CBAM verification and
// accreditation (24 Aug 2026): materiality 5% of the specific embedded emissions
// per good (CN code) and 5% of the specific embedded free allocation; a physical
// site visit for the first verification, virtual only when every condition holds.
import type { ProcessResult } from './engine';
import type { InternalReview, Workbook } from './types';

export const MATERIALITY = 0.05;
export const VERIFICATION_SOURCE = 'Guidance on CBAM verification and accreditation for verifiers and national accreditation bodies (European Commission, 24 August 2026)';

export interface Check { id: string; area: string; text: string }

export const CHECKS: Check[] = [
  { id: 'boundary', area: 'Scope', text: 'Installation boundary, production processes and routes match the monitoring plan and the site.' },
  { id: 'streams-docs', area: 'Data', text: 'Each source stream traced to invoices, weighbridge or meter records for a sample of months.' },
  { id: 'ad-reconcile', area: 'Data', text: 'Fuel and material quantities reconciled with purchases and stock changes over the period.' },
  { id: 'factors', area: 'Data', text: 'NCV, emission factors and carbon contents from lab analyses or justified defaults; sources recorded.' },
  { id: 'meters', area: 'Data', text: 'Measuring instruments calibrated and within the stated uncertainty.' },
  { id: 'activity', area: 'Production', text: 'Tonnes produced per CN code reconciled with production logs and dispatch or sales records.' },
  { id: 'precursors', area: 'Precursors', text: 'Precursor quantities reconciled; supplier SEE taken from verified reports, otherwise defaults with the year\'s mark-up.' },
  { id: 'electricity', area: 'Electricity', text: 'Electricity consumption from meters or bills; emission factor source (D.4) and any D.4.3 evidence checked.' },
  { id: 'recalc', area: 'Calculation', text: 'Attributed emissions and SEE re-performed independently from the source data.' },
  { id: 'controls', area: 'Controls', text: 'Data flow and control activities (four-eyes review, version control) work as described.' },
  { id: 'carbon-price', area: 'Carbon price', text: 'Any carbon price claimed is certified by a person independent of the declarant and of the authorities.' },
];

export interface MaterialityRow { processId: string; name: string; see: number; impactPerT: number; share: number; material: boolean }

/** Unresolved misstatements per process as a share of its SEE (direct + indirect). */
export function materiality(review: InternalReview, processes: ProcessResult[]): MaterialityRow[] {
  return processes.map((p) => {
    const open = review.misstatements.filter((m) => !m.resolved && m.where === p.id);
    const impact = open.reduce((a, m) => a + Math.abs(Number.isFinite(m.impactTco2e) ? m.impactTco2e : 0), 0);
    const impactPerT = p.activity > 0 ? impact / p.activity : 0;
    const see = p.seeDirect + p.seeIndirect;
    const share = see > 0 ? impactPerT / see : impactPerT > 0 ? Infinity : 0;
    return { processId: p.id, name: p.name, see, impactPerT, share, material: share > MATERIALITY };
  });
}

export interface ReviewReadiness { ready: boolean; missing: string[] }

export function reviewReadiness(w: Workbook, rows: MaterialityRow[], blockingErrors: number): ReviewReadiness {
  const r = w.verification.internal;
  const missing: string[] = [];
  if (blockingErrors > 0) missing.push(`${blockingErrors} calculation error${blockingErrors > 1 ? 's' : ''} to fix`);
  const unchecked = CHECKS.filter((c) => !r.checklist[c.id]).length;
  if (unchecked) missing.push(`${unchecked} check${unchecked > 1 ? 's' : ''} open`);
  if (!r.siteVisit) missing.push('site visit type');
  if (r.siteVisit !== 'physical' && r.siteVisit && !r.siteVisitJustification.trim()) missing.push('reason for no physical visit');
  if (rows.some((x) => x.material)) missing.push('material misstatements unresolved');
  if (r.misstatements.some((m) => !m.resolved)) missing.push('every misstatement corrected or explained');
  if (!r.reviewerName.trim() || !r.reviewerRole.trim()) missing.push('reviewer name and role');
  if (!r.date) missing.push('review date');
  return { ready: missing.length === 0, missing };
}

export const INTERNAL_LABEL = 'Verified by Senseible';
