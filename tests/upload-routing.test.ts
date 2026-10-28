// Spreadsheets picked in the homepage or bulk upload box go to the /import
// row checker in the browser and never to extract-document; PDFs and photos
// keep their path.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { handOffSpreadsheet, isSpreadsheetFile, splitUploads, takeHandedOffSpreadsheet } from '../src/lib/import/handoff';

const f = (name: string, type: string) => ({ name, type });

describe('which path a file takes', () => {
  test('CSV and Excel files are spreadsheets, by name or type', () => {
    expect(isSpreadsheetFile(f('bills.csv', 'text/csv'))).toBe(true);
    expect(isSpreadsheetFile(f('bills.CSV', ''))).toBe(true);
    expect(isSpreadsheetFile(f('bills.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))).toBe(true);
    expect(isSpreadsheetFile(f('export', 'text/csv'))).toBe(true);
  });
  test('PDFs and photos are never spreadsheets, whatever their name', () => {
    for (const x of [f('bill.pdf', 'application/pdf'), f('bill.jpg', 'image/jpeg'), f('bill.heic', 'image/heic'), f('bill.png', 'image/png'), f('odd.csv', 'image/jpeg'), f('odd.xlsx', 'application/pdf')]) {
      expect(isSpreadsheetFile(x)).toBe(false);
    }
  });
  test('bulk upload keeps PDFs and photos for the reader and takes sheets out', () => {
    const files = [f('a.pdf', 'application/pdf'), f('b.csv', 'text/csv'), f('c.jpg', 'image/jpeg'), f('d.xlsx', '')];
    const { reader, sheets } = splitUploads(files);
    expect(reader.map((x) => x.name)).toEqual(['a.pdf', 'c.jpg']);
    expect(sheets.map((x) => x.name)).toEqual(['b.csv', 'd.xlsx']);
  });
  test('the handed-off file is read once and kept in memory only', () => {
    const file = new File(['a,b'], 'x.csv', { type: 'text/csv' });
    handOffSpreadsheet(file);
    expect(takeHandedOffSpreadsheet()).toBe(file);
    expect(takeHandedOffSpreadsheet()).toBeNull();
  });
});

describe('upload boxes (source checks)', () => {
  const index = readFileSync('src/pages/Index.tsx', 'utf8');
  const input = readFileSync('src/components/DocumentInput.tsx', 'utf8');
  const bulk = readFileSync('src/components/BulkUpload.tsx', 'utf8');
  test('the homepage box sends a sheet to /import before anything reaches processDocument', () => {
    const fn = index.slice(index.indexOf('const handleFileSelect = (file: File) => {'), index.indexOf('const pendingHandled'));
    expect(fn.indexOf('isSpreadsheetFile(file)')).toBeGreaterThan(0);
    expect(fn.indexOf('isSpreadsheetFile(file)')).toBeLessThan(fn.indexOf('processDocument(file)'));
    expect(fn).toMatch(/handOffSpreadsheet\(file\); navigate\('\/import'\); return;/);
    // A file passed from another page takes the same route.
    expect(index).toMatch(/state: null \}\);\n\s+handleFileSelect\(pending\);/);
  });
  test('the homepage box still takes PDFs and photos as before', () => {
    expect(input).toContain('accept={`image/*,application/pdf,${SPREADSHEET_ACCEPT}`}');
    expect(input).toContain('file.type.includes("image") || file.type === "application/pdf" || isSpreadsheetFile(file)');
  });
  test('bulk upload queues only reader files; sheets go to /import', () => {
    expect(bulk).toContain('const { reader: selectedFiles, sheets } = splitUploads(Array.from(e.target.files || []));');
    expect(bulk).toContain("handOffSpreadsheet(sheets[0]); navigate('/import');");
    expect(bulk).toContain('accept={`image/*,.pdf,${SPREADSHEET_ACCEPT}`}');
    expect(bulk).toMatch(/const newFiles: FileStatus\[\] = selectedFiles\.map/);
  });
  test('the import page never calls the invoice reader', () => {
    const page = readFileSync('src/pages/Import.tsx', 'utf8');
    expect(page).not.toContain('extract-document');
    expect(page).toContain('functions.invoke("import-records"');
  });
});
