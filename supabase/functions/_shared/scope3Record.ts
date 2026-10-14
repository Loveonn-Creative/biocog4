// Database side of the Scope 3 trail, shared by extract-document (seal and
// record on upload) and scope3-trail (recalculate after factors change).
// The maths is in ./scope3.ts; this file only reads and writes. Every write
// goes through the scope3_record_document function (service role), whose
// rules refuse anything the method would not produce.
//
// Until the pending migration 20261019100000_scope3_trail is applied the
// tables do not exist and every function here returns without doing anything.

import {
  canonicalJson, evaluateDocument, invoiceKeyMaterial, REASONS, SCOPE3_METHOD_VERSION,
  type Scope3Factor, type SealedDocument,
} from './scope3.ts';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the supabase-js client differs between Deno and the tests
type Client = any;

const MISSING = new Set(['42P01', 'PGRST205', 'PGRST202', '42883']);
export const scope3NotEnabled = (e: { code?: string } | null | undefined) => !!e && MISSING.has(e.code ?? '');

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

interface ExtractionRow { id: string; document_id: string; user_id: string; organization_id: string | null; extraction: SealedDocument }

/** Seal an invoice's OCR fields once (a second call for the same document reuses the first seal). */
export async function sealExtractionRow(client: Client, p: {
  documentId: string; userId: string; organizationId: string | null; documentHash: string;
  sealed: SealedDocument; model: string | null; sourcePath: string | null;
}): Promise<ExtractionRow | null> {
  const extraction_sha256 = await sha256Hex(canonicalJson(p.sealed));
  const row = {
    document_id: p.documentId, user_id: p.userId, organization_id: p.organizationId, document_hash: p.documentHash,
    extraction: p.sealed, extraction_sha256, model: p.model, method_version: SCOPE3_METHOD_VERSION, source_file_path: p.sourcePath,
  };
  const ins = await client.from('document_extractions').insert(row).select('id, document_id, user_id, organization_id, extraction').single();
  if (!ins.error) return ins.data as ExtractionRow;
  if (scope3NotEnabled(ins.error)) return null;
  if (ins.error.code === '23505') {
    const got = await client.from('document_extractions').select('id, document_id, user_id, organization_id, extraction').eq('document_id', p.documentId).maybeSingle();
    return (got.data as ExtractionRow) ?? null;
  }
  console.error('Scope 3: extraction not sealed:', ins.error.message);
  return null;
}

const isoDate = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Approved factors that could apply to this invoice: its supplier's own, and its country's. */
async function factorsFor(client: Client, doc: SealedDocument): Promise<Scope3Factor[] | null> {
  const geos = ['IN', 'GLOBAL', ...(doc.supplierGstin ? [`SUPPLIER:${doc.supplierGstin}`] : [])];
  const { data, error } = await client.from('scope3_factors')
    .select('id, factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, source_name, source_ref, publication_year, valid_from, valid_to')
    .eq('status', 'approved').in('geography', geos);
  if (error) { if (!scope3NotEnabled(error)) console.error('Scope 3: factors not read:', error.message); return null; }
  return (data ?? []).map((f: Record<string, unknown>) => ({
    id: f.id as string, factorKey: f.factor_key as string, version: f.version as string, scope3Category: Number(f.scope3_category),
    materialKey: f.material_key as string, geography: f.geography as string, unit: f.unit as string, kgPerUnit: Number(f.kg_co2e_per_unit),
    dataClass: f.data_class as Scope3Factor['dataClass'], sourceName: f.source_name as string, sourceRef: f.source_ref as string,
    publicationYear: Number(f.publication_year), validFrom: isoDate(f.valid_from), validTo: f.valid_to ? isoDate(f.valid_to) : null,
  }));
}

/** Evaluate one sealed invoice with the current approved factors and record it. */
export async function recordExtraction(client: Client, ext: ExtractionRow): Promise<{ status: string; written: number } | null> {
  const doc = ext.extraction;
  const factors = await factorsFor(client, doc);
  if (!factors) return null;
  const { checks, lines } = evaluateDocument(doc, factors);
  const keyMaterial = invoiceKeyMaterial(doc);
  const payloadLines = await Promise.all(lines.map(async (r) => {
    const src = doc.lines[r.lineIndex];
    const f = r.factor;
    const row = {
      line_index: r.lineIndex,
      supplier_gstin: doc.supplierGstin, supplier_name: doc.vendor, invoice_number: doc.invoiceNumber, invoice_date: doc.date,
      description: src.description || '(no description)', hsn_code: src.hsn, quantity: src.quantity, unit: src.unit, line_total: src.total,
      source_page: src.sourcePage, source_text: src.sourceText, logistics: src.logistics,
      scope: r.scope, scope3_category: r.scope3Category, classification_method: r.classificationMethod, classification_basis: r.classificationBasis,
      material_key: r.materialKey,
      factor_id: r.kgCo2e !== null ? f!.id : null,
      factor_key: r.kgCo2e !== null ? f!.factorKey : null, factor_version: r.kgCo2e !== null ? f!.version : null,
      factor_value: r.kgCo2e !== null ? f!.kgPerUnit : null, factor_unit: r.kgCo2e !== null ? f!.unit : null,
      factor_source: r.kgCo2e !== null ? `${f!.sourceName}, ${f!.sourceRef} (${f!.publicationYear})` : null,
      factor_geography: r.kgCo2e !== null ? f!.geography : null, factor_material: r.kgCo2e !== null ? f!.materialKey : null,
      data_class: r.kgCo2e !== null ? r.dataClass : 'unverified',
      activity_qty: r.activityQty, activity_unit: r.activityUnit, formula: r.formula, kg_co2e: r.kgCo2e,
      status: r.status, reasons: r.reasons, next_action: r.nextAction, checks: r.checks, confidence: r.confidence,
    };
    return { ...row, inputs_sha256: await sha256Hex(canonicalJson({ row, method: SCOPE3_METHOD_VERSION, reconciliation: checks })) };
  }));
  const { data, error } = await client.rpc('scope3_record_document', { p: {
    document_id: ext.document_id, extraction_id: ext.id, user_id: ext.user_id, organization_id: ext.organization_id,
    invoice_key: keyMaterial ? await sha256Hex(keyMaterial) : null,
    reconciliation: { ...checks, reasons: checks.reasons.map((code) => ({ code, label: REASONS[code]?.label ?? code })) },
    method_version: SCOPE3_METHOD_VERSION, lines: payloadLines,
  } });
  if (error) { if (!scope3NotEnabled(error)) console.error('Scope 3: not recorded:', error.message); return null; }
  return { status: data?.status, written: data?.written ?? 0 };
}

/** Upload path: seal, then record. Never throws; the upload response does not depend on it. */
export async function sealAndRecord(client: Client, p: Parameters<typeof sealExtractionRow>[1]): Promise<void> {
  try {
    const ext = await sealExtractionRow(client, p);
    if (ext) await recordExtraction(client, ext);
  } catch (e) {
    console.error('Scope 3 trail error:', e instanceof Error ? e.message : e);
  }
}
