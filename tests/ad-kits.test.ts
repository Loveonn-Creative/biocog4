import { describe, expect, test } from 'bun:test';
import { callbackMessage, msmeKit, supplierKit, LENDER_CHECKLIST } from '../src/lib/leadMagnets/adKits';
import { estimateAnnual } from '../src/lib/leadMagnets/msmeCarbonReply';
import { supplierEvidencePlan } from '../src/lib/leadMagnets/supplierEvidence';

describe('ad landing kits', () => {
  test('MSME kit carries the estimate, labelled as an estimate, and the lender checklist', () => {
    const e = estimateAnnual({ kwhPerMonth: 4000, dieselLitresPerMonth: 300 })!;
    const kit = msmeKit(e, '/go/green-loan-a');
    const text = JSON.stringify(kit);
    expect(text).toContain(`About ${e.totalTonnes.toLocaleString('en-IN', { maximumFractionDigits: 1 })} tonnes CO2 a year`);
    expect(text).toContain('estimate');
    for (const item of LENDER_CHECKLIST) expect(text).toContain(item);
    expect(text).toContain('Lenders decide on loans');
    expect(text).not.toMatch(/guarantee|approved|eligible/i);
    expect(kit.footer).toContain('/go/green-loan-a');
  });

  test('MSME kit without numbers asks for them instead of inventing one', () => {
    expect(JSON.stringify(msmeKit(null, '/go/green-loan-b'))).toContain('Add your monthly units');
  });

  test('supplier kit has the plan, the reviewer questions and the request', () => {
    const plan = supplierEvidencePlan({ suppliers: 200, withData: 20, months: 6, pressure: 'assurance' });
    const kit = supplierKit(plan, 'assurance', '/go/suppliers-a');
    const text = JSON.stringify(kit);
    expect(text).toContain('180 to bring on in 6 months');
    expect(text).toContain('Energy bills for our Scope 3 reporting');
    expect(kit.sections.find((s) => s.heading === 'What reviewers will ask')!.lines).toHaveLength(3);
  });

  test('call request message names the page, industry and WhatsApp number', () => {
    const m = callbackMessage({ page: '/go/green-loan-a', industry: 'Textiles & apparel', whatsapp: '+91 98765 43210', summary: 'Estimate 38 t' });
    expect(m).toContain('10-minute call requested.');
    expect(m).toContain('Page: /go/green-loan-a');
    expect(m).toContain('Industry: Textiles & apparel');
    expect(m).toContain('WhatsApp: +91 98765 43210');
  });
});
