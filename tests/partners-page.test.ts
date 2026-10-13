import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// The redesign changes presentation only: every partner type, benefit and
// reason from the previous page is still on it.
const page = readFileSync('src/pages/Partners.tsx', 'utf8');

describe('/partners keeps its content', () => {
  test.each([
    'Carbon Credit Buyers', 'Banks & Financial Institutions', 'ERP & Accounting Platforms', 'Climate Finance Providers',
    'Pre-verified credits with AI-powered MRV', 'Verified carbon data for green lending', 'REST API for carbon data', 'Blended finance structures',
    'MRV-Grade Verification', 'India-First, Global-Ready', 'Real-Time Intelligence', 'partners@senseible.earth',
  ])('%s', (text) => {
    expect(page).toContain(text);
  });
  test('every partner type says what flows along its lane', () => {
    expect((page.match(/flow: \{ label:/g) || []).length).toBe(4);
  });
});
