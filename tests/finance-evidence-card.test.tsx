import { describe, expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let detail = { available: false, enabled: false };
const entries = [
  { id: '1', emission_id: 'e1', document_hash: 'h1', vendor: 'TATA Power', invoice_date: '2025-04-30', amount: 12000, currency: 'INR', scope: 2,
    activity_data: 1500, activity_unit: 'kWh', emission_factor: 0.71, factor_source: 'CEA', methodology_version: 'v1', co2_kg: 1065, verification_status: 'verified', created_at: '2025-05-01' },
  { id: '2', emission_id: 'e2', document_hash: 'h2', vendor: 'TATA Power', invoice_date: '2025-06-30', amount: 11000, currency: 'INR', scope: 2,
    activity_data: 1400, activity_unit: 'kWh', emission_factor: 0.71, factor_source: 'CEA', methodology_version: 'v1', co2_kg: 994, verification_status: 'verified', created_at: '2025-07-01' },
  { id: '3', emission_id: 'e3', document_hash: 'h3', vendor: 'HPCL', invoice_date: '2025-06-12', amount: 9000, currency: 'INR', scope: 1,
    activity_data: 100, activity_unit: 'L', emission_factor: 2.68, factor_source: 'IPCC', methodology_version: 'v1', co2_kg: 268, verification_status: 'verified', created_at: '2025-06-13' },
];
mock.module('@/hooks/useComplianceLedger', () => ({ useComplianceLedger: () => ({ entries, isLoading: false }) }));
mock.module('@/hooks/useWorkspace', () => ({ useWorkspace: () => ({ scope: { kind: 'personal', userId: 'u' }, ready: false }) }));
mock.module('@/integrations/supabase/client', () => ({ supabase: {} }));
mock.module('@/hooks/useFinanceDetail', () => ({ useFinanceDetail: () => ({ ...detail, setEnabled: () => {} }) }));

const { FinanceEvidenceCard } = await import('../src/components/dashboard/FinanceEvidenceCard');
const render = () => renderToStaticMarkup(<MemoryRouter><FinanceEvidenceCard /></MemoryRouter>);

describe('FinanceEvidenceCard', () => {
  test('locked for Snapshot and Essential: shape only, no figures', () => {
    detail = { available: false, enabled: false };
    const html = render();
    expect(html).toContain('Opens on Pro');
    expect(html).not.toContain('Electricity billed');
    expect(html).not.toContain('kWh');
    expect(html).not.toContain('TATA Power');
  });
  test('Pro or Scale with the switch off points to Settings, no figures', () => {
    detail = { available: true, enabled: false };
    const html = render();
    expect(html).toContain('Turn on Finance detail');
    expect(html).not.toContain('kWh');
  });
  test('detail view for Pro and Scale with the switch on', () => {
    detail = { available: true, enabled: true };
    const html = render();
    expect(html).toContain('2,900 kWh');
    expect(html).toContain('0.71 kg/kWh');
    expect(html).toContain('May 2025'); // missing electricity month
    expect(html).toContain('Largest supplier share');
  });
});
