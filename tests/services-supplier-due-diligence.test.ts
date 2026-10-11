import { describe, expect, test } from 'bun:test';
import {
  buildNet, cell, heatmap, laws, levelOf, settle, summarise, COMMODITIES, DECAY, EUDR, UFLPA_SECTORS,
  type SupplyInput,
} from '../src/components/services/supplier-due-diligence/logic';

const base: SupplyInput = { markets: ['india'], de1000: false, commodities: [], xinjiang: 'no', drc: 'no' };
const law = (i: Partial<SupplyInput>, id: string) => laws({ ...base, ...i }).find(l => l.id === id)!;

describe('supplier due diligence: laws', () => {
  test('LkSG direct with 1,000+ employees in Germany, else asked by German buyers', () => {
    expect(law({ de1000: true }, 'lksg').status).toBe('applies');
    expect(law({ markets: ['de'] }, 'lksg').status).toBe('asked');
    expect(law({ markets: ['us'] }, 'lksg').status).toBe('none');
  });
  test('UFLPA only for the US; Xinjiang yes applies, with the 21 June 2022 date', () => {
    const l = law({ markets: ['us'], xinjiang: 'yes' }, 'uflpa');
    expect(l.status).toBe('applies');
    expect(l.why).toContain('21 June 2022');
    expect(law({ markets: ['eu'], xinjiang: 'yes' }, 'uflpa').status).toBe('none');
    expect(law({ markets: ['us'], xinjiang: 'unsure' }, 'uflpa').status).toBe('prepare');
    expect(law({ markets: ['us'], commodities: ['cotton'] }, 'uflpa').status).toBe('prepare');
    expect(law({ markets: ['us'], commodities: ['cocoa'] }, 'uflpa').status).toBe('none');
  });
  test('EUDR for listed commodities into the EU only', () => {
    expect(law({ markets: ['de'], commodities: ['cocoa'] }, 'eudr').status).toBe('applies');
    expect(law({ markets: ['us'], commodities: ['cocoa'] }, 'eudr').status).toBe('none');
    expect(law({ markets: ['eu'], commodities: ['cotton'] }, 'eudr').status).toBe('none');
  });
  test('conflict minerals for 3TG; cobalt and mica screened by buyers', () => {
    expect(law({ commodities: ['3tg'] }, 'conflict').status).toBe('asked');
    expect(law({ commodities: ['mica'] }, 'conflict').why).toContain('not 3TG');
    expect(law({ commodities: ['soya'] }, 'conflict').status).toBe('none');
  });
  test('CSDDD is future-dated and only via EU buyers', () => {
    expect(law({ markets: ['eu'] }, 'csddd').why).toContain('July 2028');
    expect(law({ markets: ['eu'] }, 'csddd').status).toBe('prepare');
    expect(law({ markets: ['india'] }, 'csddd').status).toBe('none');
  });
});

describe('supplier due diligence: heatmap rule table', () => {
  test('forced labour follows UFLPA sector and Xinjiang link', () => {
    expect(cell('cotton', 'forced', { ...base, xinjiang: 'yes' })).toBe('high');
    expect(cell('cotton', 'forced', base)).toBe('medium');
    expect(cell('cocoa', 'forced', { ...base, xinjiang: 'yes' })).toBe('medium');
    expect(cell('cocoa', 'forced', base)).toBe('low');
  });
  test('conflict follows minerals and DRC link; mica never high', () => {
    expect(cell('3tg', 'conflict', { ...base, drc: 'yes' })).toBe('high');
    expect(cell('cobalt', 'conflict', { ...base, drc: 'yes' })).toBe('high');
    expect(cell('mica', 'conflict', { ...base, drc: 'yes' })).toBe('medium');
    expect(cell('3tg', 'conflict', base)).toBe('medium');
    expect(cell('cotton', 'conflict', { ...base, drc: 'yes' })).toBe('low');
  });
  test('deforestation only for EUDR commodities, high when sold into the EU', () => {
    for (const c of EUDR) expect(cell(c, 'deforestation', { ...base, markets: ['eu'] })).toBe('high');
    for (const c of UFLPA_SECTORS) expect(cell(c, 'deforestation', { ...base, markets: ['eu'] })).toBe('low');
  });
  test('"not sure" is a traceability gap', () => {
    expect(cell('cotton', 'trace', { ...base, xinjiang: 'unsure' })).toBe('high');
    expect(cell('3tg', 'trace', { ...base, drc: 'unsure' })).toBe('high');
    expect(cell('soya', 'trace', { ...base, xinjiang: 'unsure' })).toBe('medium');
    expect(cell('soya', 'trace', base)).toBe('low');
    // "Not sure" never raises the forced-labour finding itself.
    expect(cell('cotton', 'forced', { ...base, xinjiang: 'unsure' })).toBe('medium');
  });
  test('one row per selected commodity, every cell set', () => {
    const rows = heatmap({ ...base, commodities: COMMODITIES });
    expect(rows.length).toBe(16);
    for (const r of rows) expect(Object.keys(r.cells).length).toBe(4);
  });
});

describe('supplier due diligence: headline and network', () => {
  test('headline names rules and the first high-risk area', () => {
    const s = summarise({ markets: ['de', 'us'], de1000: false, commodities: ['cotton'], xinjiang: 'yes', drc: 'no' });
    expect(s.headline).toBe('3 rules reach your supply chain: LkSG via buyers, UFLPA, CSDDD. 1 high-risk area, starting with Cotton forced labour.');
    expect(summarise(base).headline).toContain('No supply-chain rule');
    expect(s.summary).not.toMatch(/\d{2}[A-Z]{5}\d{4}/); // no GSTIN-like strings
  });
  test('risk diffuses towards you, decaying each hop, one tier per tick', () => {
    const net = buildNet({ ...base, markets: ['us'], commodities: ['cotton'], xinjiang: 'yes' });
    const r = settle(net);
    // Xinjiang (1) -> cotton (own risk high = 1) -> tier 1 (0.85) -> you (0.7225).
    expect(r[3]).toBeCloseTo(1);
    expect(r[4]).toBeCloseTo(DECAY);
    expect(r[net.you]).toBeCloseTo(DECAY * DECAY);
    expect(levelOf(r[net.you])).toBe('high');
    // Mica is not linked to the DRC origin, so its node stays at its own (medium) level.
    const mica = settle(buildNet({ ...base, commodities: ['mica'], drc: 'yes' }));
    expect(levelOf(mica[3])).toBe('medium');
  });
  test('more than six inputs fold into a "+n more" node', () => {
    const net = buildNet({ ...base, commodities: COMMODITIES });
    expect(net.label).toContain('+11 more');
  });
});
