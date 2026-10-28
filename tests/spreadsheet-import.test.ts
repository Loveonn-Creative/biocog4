import { describe, expect, test } from 'bun:test';
import * as XLSX from 'xlsx';
import { parseCsv, toCsv } from '../src/lib/import/csv';
import { parseDocType, unitProblem, DOC_TYPES } from '../src/lib/import/schema';
import { checkSheet, duplicateKey, gstinProblem, matchHeaders, parseAmount, parseImportDate, MAX_ROWS } from '../src/lib/import/validate';
import { readWorkbookRows, fileKind } from '../src/lib/import/readFile';
import { guideRows, templateCsv, templateHeader, TEMPLATE_NAMES } from '../src/lib/import/templates';
import { gstinCheckChar } from '../src/lib/indiaBusinessIds';
import { calculateEmissions } from '../supabase/functions/_shared/emissionFactors';

const NOW = new Date('2026-10-27T00:00:00Z');
const GOOD_GSTIN = '27AAPFU0939F1ZV';
const HEADER = templateHeader('activity');
const row = (o: Partial<Record<'date' | 'type' | 'quantity' | 'unit' | 'supplier' | 'gstin' | 'invoice' | 'amount' | 'notes', string>>) =>
  [o.date ?? '2026-04-30', o.type ?? 'Diesel', o.quantity ?? '100', o.unit ?? 'litre', o.supplier ?? 'Indian Oil', o.gstin ?? '', o.invoice ?? '', o.amount ?? '', o.notes ?? ''];
const check = (rows: string[][]) => {
  const r = checkSheet([HEADER, ...rows], NOW);
  if (!r.ok) throw new Error(r.message);
  return r.result;
};

describe('CSV', () => {
  test('reads quotes, escaped quotes, commas, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
    expect(parseCsv('a,b\nc,')).toEqual([['a', 'b'], ['c', '']]);
    expect(parseCsv('"multi\nline",2')).toEqual([['multi\nline', '2']]);
  });
  test('round-trips through toCsv', () => {
    const rows = [['Name', 'Note'], ['A, B', 'he said "ok"'], ['C', '']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('templates', () => {
  test('activity template has the agreed columns in order and no example rows', () => {
    expect(templateHeader('activity')).toEqual(['Date', 'Bill type', 'Quantity', 'Unit', 'Supplier name', 'Supplier GSTIN', 'Invoice number', 'Amount (INR)', 'Notes']);
    expect(parseCsv(templateCsv('activity'))).toHaveLength(1);
    expect(TEMPLATE_NAMES.activity).toBe('senseible-bills');
  });
  test('supplier template has the agreed columns', () => {
    expect(templateHeader('suppliers')).toEqual(['Name', 'GSTIN', 'Contact email', 'Category', 'Annual spend (INR)']);
  });
  test('a downloaded template is recognised on upload', () => {
    expect(matchHeaders(templateHeader('activity'))).toMatchObject({ ok: true, kind: 'activity' });
    expect(matchHeaders(templateHeader('suppliers'))).toMatchObject({ ok: true, kind: 'suppliers' });
    expect(matchHeaders(['Date', 'Document type', 'Quantity', 'Unit', 'Supplier name'])).toMatchObject({ ok: true, kind: 'activity' });
  });
  test('the units guide lists every document type', () => {
    const text = guideRows('activity').flat().join(' ');
    expect(text).toContain('Must match the bill type. See the units list below.');
    for (const k of Object.values(DOC_TYPES)) expect(text).toContain(k.label);
  });
});

describe('headers', () => {
  test('matches loose spellings and any column order', () => {
    const m = matchHeaders(['quantity', 'UNIT', 'document_type', 'Supplier Name', 'date']);
    expect(m).toMatchObject({ ok: true, kind: 'activity', columnIndex: { quantity: 0, unit: 1, type: 2, supplier: 3, date: 4 } });
  });
  test('names the missing required column', () => {
    const m = matchHeaders(['Date', 'Bill type', 'Quantity', 'Supplier name']);
    expect(m).toEqual({ ok: false, message: 'This file is missing the Unit column. Add it, or paste your rows into the template above.' });
    expect(matchHeaders(['Bill type', 'Unit', 'Supplier name'])).toEqual({ ok: false, message: 'This file is missing the Date and Quantity columns. Add them, or paste your rows into the template above.' });
    expect(matchHeaders(['foo'])).toEqual({ ok: false, message: 'We could not find a Bill type column. Download the template above and paste your rows into it.' });
  });
  test('rejects a file that matches neither template', () => {
    expect(matchHeaders(['foo', 'bar']).ok).toBe(false);
  });
});

describe('units follow the shared factor file', () => {
  test('each type accepts its own units and spellings', () => {
    expect(unitProblem('electricity', 'kWh')).toBeNull();
    expect(unitProblem('electricity', 'MWh')).toBeNull();
    expect(unitProblem('diesel', 'Ltrs')).toBeNull();
    expect(unitProblem('diesel', 'KL')).toBeNull();
    expect(unitProblem('lpg', 'kg')).toBeNull();
    expect(unitProblem('coal', 'tonne')).toBeNull();
    expect(unitProblem('png', 'SCM')).toBeNull();
    expect(unitProblem('freight', 'tonne-km')).toBeNull();
  });
  test('wrong units are named, and kVAh is never read as kWh', () => {
    expect(unitProblem('diesel', 'kg')).toBe('Diesel needs litre or kl.');
    expect(unitProblem('lpg', 'cylinder')).toBe('LPG is counted in kg. Enter the total kg (cylinders times the kg printed on each), then set Unit to kg.');
    expect(unitProblem('png', 'litre')).toBe('PNG is counted in scm. Enter the scm figure from the gas bill, then set Unit to scm.');
    expect(unitProblem('freight', 'tonne')).toBe('Freight is counted in tonne-km. Enter tonnes carried times km travelled, then set Unit to tonne-km.');
    expect(unitProblem('coal', 'bags')).toBe('Coal needs kg or tonne.');
    expect(unitProblem('electricity', 'kVAh')).toContain('kVAh is not kWh');
  });
  test('document types are read case-insensitively and unknown ones are rejected', () => {
    expect(parseDocType(' lpg ')).toBe('lpg');
    expect(parseDocType('Electricity')).toBe('electricity');
    expect(parseDocType('Furnace oil')).toBeNull();
  });
});

describe('numbers', () => {
  test('commas, spaces and a rupee sign are allowed; text is not', () => {
    expect(parseAmount('1,20,000')).toBe(120000);
    expect(parseAmount('₹ 4,500.50')).toBe(4500.5);
    expect(parseAmount('Rs. 10')).toBe(10);
    expect(parseAmount('ten')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1e3')).toBeNull();
  });
});

describe('row checks', () => {
  test('a complete row is ready and its estimate matches the server calculation', () => {
    const r = check([row({ quantity: '1,000', unit: 'kl', gstin: GOOD_GSTIN, invoice: 'INV-1', amount: '95,000' })]);
    expect(r.counts).toEqual({ ready: 1, fix: 0, duplicate: 0, total: 1 });
    const server = calculateEmissions(1000, 'kl', 1, 'FUEL', 'DIESEL');
    expect(r.rows[0].estimateKg).toBe(server && server.kind === 'emission' ? server.co2Kg : -1);
  });
  test('electricity uses the shared India grid factor', () => {
    const r = check([row({ type: 'Electricity', quantity: '1000', unit: 'kWh', supplier: 'MSEDCL' })]);
    expect(r.rows[0].estimateKg).toBe(710);
  });
  test('freight is ready but has no estimate in the preview', () => {
    const r = check([row({ type: 'Freight', quantity: '500', unit: 'tkm', supplier: 'VRL' })]);
    expect(r.rows[0].status).toBe('ready');
    expect(r.rows[0].estimateKg).toBeNull();
    expect(r.readyEstimateKg).toBeNull();
  });
  test('missing values are flagged, never filled or read as zero', () => {
    const r = check([row({ quantity: '', unit: '', supplier: '', date: '' })]);
    const msgs = r.rows[0].issues.map(i => i.message);
    expect(msgs).toEqual(expect.arrayContaining(['Date is missing.', 'Quantity is missing.', 'Unit is missing.', 'Supplier name is missing.']));
    expect(r.rows[0].values.quantity).toBe('');
    expect(r.rows[0].estimateKg).toBeNull();
  });
  test('zero and negative quantities need fixing', () => {
    const r = check([row({ quantity: '0' }), row({ quantity: '-4' }), row({ amount: '0' })]);
    expect(r.rows.map(x => x.status)).toEqual(['fix', 'fix', 'fix']);
    expect(r.rows[0].issues[0].message).toBe('Quantity must be more than 0.');
    expect(r.rows[2].issues[0]).toEqual({ field: 'amount', message: 'Amount must be more than 0, or leave it empty.' });
  });
  test('dates: YYYY-MM-DD or day-first DD/MM/YYYY and DD-MM-YYYY; impossible dates rejected', () => {
    expect(parseImportDate('30/05/2026', NOW)).toBe('2026-05-30');
    expect(parseImportDate('3-5-2026', NOW)).toBe('2026-05-03');
    expect(parseImportDate('2026-05-30', NOW)).toBe('2026-05-30');
    expect(parseImportDate('31/02/2026', NOW)).toBeNull();
    expect(parseImportDate('30/05-2026', NOW)).toBeNull();
    expect(parseImportDate('05/30/2026', NOW)).toBeNull();
    expect(parseImportDate('30 May 2026', NOW)).toBeNull();
    expect(parseImportDate('30/05/26', NOW)).toBeNull();
    const r = check([row({ date: '30/04/2026' }), row({ date: '2026-02-30' }), row({ date: '2027-06-01' }), row({ date: '31/02/2026' })]);
    expect(r.rows.map(x => x.status)).toEqual(['ready', 'fix', 'fix', 'fix']);
    expect(r.rows[3].issues[0].message).toBe('31/02/2026 is not a real date. Check the day and month.');
    expect(r.rows[1].issues[0].message).toBe('2026-02-30 is not a real date. Check the day and month.');
    expect(r.rows[2].issues[0].message).toBe('Use a bill date from 2000 up to next month.');
    expect(check([row({ date: '30 May 2026' })]).rows[0].issues[0].message).toBe('Write the date as DD/MM/YYYY or YYYY-MM-DD, for example 30/05/2026.');
    expect(check([row({ date: '01/01/1999' })]).rows[0].issues[0].message).toBe('Use a bill date from 2000 up to next month.');
  });
  test('the same bill with the date written two ways is a duplicate', () => {
    const r = check([row({ gstin: GOOD_GSTIN, invoice: 'A1', date: '2026-05-30' }), row({ gstin: GOOD_GSTIN, invoice: 'A1', date: '30/05/2026' })]);
    expect(r.rows[1].status).toBe('duplicate');
  });
  test('number cells with words explain what to write', () => {
    const r = check([row({ quantity: '850 litre' }), row({ amount: 'Rs 76k' })]);
    expect(r.rows[0].issues[0].message).toBe('Quantity should be a number only, like 850. Put the unit in the Unit column.');
    expect(r.rows[1].issues[0].message).toBe('Amount should be a number only, like 76500.');
  });
  test('GSTIN format and check character are checked', () => {
    const wrongCheck = GOOD_GSTIN.slice(0, 14) + (GOOD_GSTIN[14] === 'A' ? 'B' : 'A');
    const r = check([row({ gstin: GOOD_GSTIN }), row({ gstin: wrongCheck }), row({ gstin: '27ABC' })]);
    expect(r.rows.map(x => x.status)).toEqual(['ready', 'fix', 'fix']);
    expect(r.rows[1].issues[0].message).toBe('This GSTIN has a typo. Copy it again from the bill.');
    expect(r.rows[2].issues[0].message).toBe('A GSTIN has 15 characters, like 27AAPFU0939F1ZV. Copy it from the bill.');
  });
  test('a valid shape with an unknown state code names the state code', () => {
    // Shape and check character are fine, only the state code is unknown.
    const body = '45AAPFU0939F1Z';
    expect(gstinProblem(body + gstinCheckChar(body))).toBe('The first two digits should be the state code, like 27 for Maharashtra.');
    expect(gstinProblem('')).toBeNull();
    expect(gstinProblem(GOOD_GSTIN)).toBeNull();
  });
  test('unknown type and wrong unit need fixing', () => {
    const r = check([row({ type: 'Steam' }), row({ type: 'LPG', unit: 'cylinder' })]);
    expect(r.rows.map(x => x.status)).toEqual(['fix', 'fix']);
    expect(r.rows[0].issues[0].message).toBe('"Steam" is not a bill type we accept. Use Electricity, Diesel, Petrol, LPG, PNG, CNG, Coal or Freight.');
  });
  test('blank rows are skipped and line numbers match the sheet', () => {
    const r = check([row({}), ['', '', ''], row({ quantity: 'x' })]);
    expect(r.counts.total).toBe(2);
    expect(r.rows.map(x => x.line)).toEqual([2, 4]);
  });
});

describe('duplicates', () => {
  test('same GSTIN, invoice number and date is a duplicate of the first row', () => {
    const a = row({ gstin: GOOD_GSTIN, invoice: 'INV-9' });
    const b = row({ gstin: GOOD_GSTIN.toLowerCase(), invoice: 'inv-9', quantity: '200' });
    const c = row({ gstin: GOOD_GSTIN, invoice: 'INV-9', date: '2026-05-01' });
    const r = check([a, b, c]);
    expect(r.rows.map(x => x.status)).toEqual(['ready', 'duplicate', 'ready']);
    expect(r.rows[1].duplicateOf).toBe(2);
    expect(r.counts).toEqual({ ready: 2, fix: 0, duplicate: 1, total: 3 });
  });
  test('rows without a GSTIN or invoice number are not matched', () => {
    expect(duplicateKey('activity', { gstin: '', invoice: 'A', date: '2026-01-01' })).toBeNull();
    expect(duplicateKey('activity', { gstin: GOOD_GSTIN, invoice: '', date: '2026-01-01' })).toBeNull();
  });
  test('only ready rows count toward the estimate total', () => {
    const a = row({ gstin: GOOD_GSTIN, invoice: 'X', quantity: '100' });
    const r = check([a, a, row({ quantity: '0' })]);
    expect(r.readyEstimateKg).toBe(268);
  });
});

describe('supplier list', () => {
  const H = templateHeader('suppliers');
  const run = (rows: string[][]) => { const r = checkSheet([H, ...rows], NOW); if (!r.ok) throw new Error(r.message); return r.result; };
  test('needs a name and an email or GSTIN; spend must be positive', () => {
    const r = run([
      ['Shree Castings', GOOD_GSTIN, 'ops@shree.example', 'Castings', '12,00,000'],
      ['', GOOD_GSTIN, '', '', ''],
      ['No Contact Ltd', '', '', '', ''],
      ['Bad Mail', '', 'not-an-email', '', ''],
      ['Zero Spend', '', 'a@b.in', '', '0'],
    ]);
    expect(r.rows.map(x => x.status)).toEqual(['ready', 'fix', 'fix', 'fix', 'fix']);
    expect(r.rows[0].estimateKg).toBeUndefined();
    expect(r.rows[2].issues[0].message).toBe('Add their email or GSTIN.');
    expect(r.rows[4].issues[0].message).toBe('Annual spend must be more than 0, or leave it empty.');
  });
  test('same GSTIN and name is a duplicate; two units sharing a GSTIN are not', () => {
    const r = run([['Shree Castings', GOOD_GSTIN, '', '', ''], ['SHREE  CASTINGS.', GOOD_GSTIN, '', '', ''], ['Shree Castings Unit 2', GOOD_GSTIN, '', '', '']]);
    expect(r.rows.map(x => x.status)).toEqual(['ready', 'duplicate', 'ready']);
    expect(duplicateKey('suppliers', { name: 'A', gstin: '' })).toBeNull();
  });
});

describe('file limits', () => {
  test('more than 1000 rows is refused before checking', () => {
    const many = Array.from({ length: MAX_ROWS + 1 }, () => row({}));
    const r = checkSheet([HEADER, ...many], NOW);
    expect(r).toEqual({ ok: false, message: 'This file has 1,001 rows. Split it into files of 1,000 rows or fewer.' });
  });
  test('exactly 1000 rows is fine', () => {
    expect(checkSheet([HEADER, ...Array.from({ length: MAX_ROWS }, () => row({}))], NOW).ok).toBe(true);
  });
  test('empty and header-only files explain themselves', () => {
    expect(checkSheet([], NOW)).toEqual({ ok: false, message: 'This file is empty.' });
    expect(checkSheet([HEADER], NOW).ok).toBe(false);
  });
  test('only csv and xlsx names are accepted', () => {
    expect(fileKind('a.CSV')).toBe('csv');
    expect(fileKind('a.xlsx')).toBe('xlsx');
    expect(fileKind('a.pdf')).toBeNull();
  });
});

describe('Excel files', () => {
  test('date cells become YYYY-MM-DD and numbers become text', () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADER, [new Date(Date.UTC(2026, 3, 30, 12)), 'Diesel', 100, 'litre', 'Indian Oil']], { cellDates: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity data');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const rows = readWorkbookRows(XLSX, new Uint8Array(buf));
    expect(rows[1].slice(0, 5)).toEqual(['2026-04-30', 'Diesel', '100', 'litre', 'Indian Oil']);
    const r = checkSheet(rows, NOW);
    expect(r.ok && r.result.counts.ready).toBe(1);
  });
});

describe('fixing a row in place', () => {
  const lpg = { date: '2026-05-10', type: 'LPG', quantity: '4', unit: 'cylinder', supplier: 'HP Gas', gstin: '', invoice: 'HPG-118', amount: '', notes: '' };
  test('changing only the unit cannot make a ready row unless the quantity is confirmed or changed', async () => {
    const { applyRowFix, checkRecords } = await import('../src/lib/import/validate');
    const onlyUnit = applyRowFix(lpg, { quantity: '4', unit: 'kg' }, { quantityConfirmed: false });
    expect(onlyUnit.ok).toBe(false);
    if (onlyUnit.ok === false) expect(onlyUnit.message).toBe('You changed the unit. Check that 4 is in kg, or change the quantity.');
    // The row stays as it was, so it is still flagged.
    expect(checkRecords('activity', [{ line: 5, values: lpg }], NOW).rows[0].status).toBe('fix');
    const changed = applyRowFix(lpg, { quantity: '56.8', unit: 'kg' }, { quantityConfirmed: false });
    expect(changed.ok && checkRecords('activity', [{ line: 5, values: changed.values }], NOW).rows[0].status).toBe('ready');
    const confirmed = applyRowFix(lpg, { quantity: '4', unit: 'kg' }, { quantityConfirmed: true });
    expect(confirmed.ok).toBe(true);
  });
  test('the same guard covers freight, MWh and kVAh', async () => {
    const { applyRowFix } = await import('../src/lib/import/validate');
    expect(applyRowFix({ ...lpg, type: 'Freight', quantity: '12', unit: 'tonne' }, { quantity: '12', unit: 'tonne-km' }, { quantityConfirmed: false }).ok).toBe(false);
    expect(applyRowFix({ ...lpg, type: 'Electricity', quantity: '3100', unit: 'kVAh' }, { quantity: '3100', unit: 'kWh' }, { quantityConfirmed: false }).ok).toBe(false);
    expect(applyRowFix({ ...lpg, type: 'Electricity', quantity: '12.4', unit: 'units' }, { quantity: '12.4', unit: 'MWh' }, { quantityConfirmed: false }).ok).toBe(false);
    // A fix that does not touch the unit needs no confirmation.
    expect(applyRowFix({ ...lpg, quantity: '', unit: 'kg' }, { quantity: '20' }, { quantityConfirmed: false }).ok).toBe(true);
  });
  test('dates show the Indian way', async () => {
    const { displayDate } = await import('../src/lib/import/validate');
    expect(displayDate('2026-05-30')).toBe('30/05/2026');
    expect(displayDate('30-5-2026')).toBe('30/05/2026');
    expect(displayDate('soon')).toBe('soon');
  });
});
