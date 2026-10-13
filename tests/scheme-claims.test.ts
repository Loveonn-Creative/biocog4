import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { formatForCCTS } from '../src/lib/govComplianceAdapter';

// Every app file that renders or exports a verification record.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|json)$/.test(f) ? [p] : [];
  });
}
const APP = ['src/pages', 'src/components', 'src/lib'].flatMap(files)
  .filter((p) => !/src\/pages\/services|src\/components\/(home|services)|calculators/.test(p));
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

describe('CCTS / CBAM claims need a documented review', () => {
  test('no app screen, report or export prints the legacy "CCTS Eligible" or "CBAM Compliant" marks', () => {
    const hits = APP.filter((p) => /CCTS Eligible|CBAM Compliant|CCTS eligibility confirmed/i.test(stripComments(readFileSync(p, 'utf8'))));
    expect(hits).toEqual([]);
  });

  test('the CCTS export states platform verification, not scheme eligibility', () => {
    const [row] = formatForCCTS([{ gstin: null, scope: 2, emission_category: 'electricity', co2_kg: 1000, activity_data: 1, activity_unit: 'kWh', emission_factor: 0.7, factor_source: 'CEA', verification_score: 0.9, verified_at: null, methodology_version: 'v1.1', document_hash: 'h', fiscal_year: null, fiscal_quarter: null, verification_status: 'verified' } as any]);
    expect(Object.keys(row)).not.toContain('CCTS Eligible');
    expect(row['Platform Verification']).toBe('Verified');
  });

  test('partner compliance signals accept only "not assessed" for CBAM and CCTS', () => {
    const src = readFileSync('src/components/partner/ComplianceSignals.tsx', 'utf8');
    expect(src).toContain("cbamStatus: 'not_assessed';");
    expect(src).toContain("cctsStatus: 'not_assessed';");
  });

  test('the reviewed record is titled Independently Reviewed, not a compliance certificate', () => {
    const src = readFileSync('src/pages/Reports.tsx', 'utf8');
    expect(src).toContain("'INDEPENDENTLY REVIEWED'");
    expect(src).not.toMatch(/COMPLIANCE CERTIFICATE|This is to certify|Compliant with Indian/);
  });
});
