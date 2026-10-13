import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { steelCbamPerTonne } from '../src/components/climate-finance/FinanceVisuals';
import { CBAM_SECTOR_COSTS } from '../src/data/cbamSectorCosts';

describe('/climate-finance claims', () => {
  test('the CBAM scrubber shows the same per-tonne cost as the /cbam-cost steel page', () => {
    const steel = CBAM_SECTOR_COSTS.find(s => s.sector.id === 'steel')!;
    const route = steel.routes.find(r => r.routeId === 'bf-bof')!;
    for (const { year, perTonne } of steelCbamPerTonne()) {
      expect(Math.round(perTonne)).toBe(Math.round(route.perTonne[year]));
    }
  });

  test('the unsourced "tariffs of 20–35%" claim is gone', () => {
    const page = readFileSync('src/pages/ClimateFinance.tsx', 'utf8');
    expect(page).not.toMatch(/20[–-]35%/);
    expect(page).toContain('priced at EU default values');
  });
});
