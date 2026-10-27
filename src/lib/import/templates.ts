// The two import templates, built in the browser. Headers only, so no example
// row can be imported by mistake; the Excel file adds a sheet on how to fill it.
import { toCsv } from './csv';
import { COLUMNS, DOC_TYPE_KEYS, DOC_TYPES, type ImportKind } from './schema';

export const TEMPLATE_NAMES: Record<ImportKind, string> = {
  activity: 'senseible-activity-data',
  suppliers: 'senseible-supplier-list',
};

export const templateHeader = (kind: ImportKind) => COLUMNS[kind].map(c => c.label);

export const templateCsv = (kind: ImportKind) => toCsv([templateHeader(kind)]);

/** Rows for the "How to fill" sheet. */
export function guideRows(kind: ImportKind): string[][] {
  const rows: string[][] = [['Column', 'Required', 'What to enter']];
  for (const c of COLUMNS[kind]) rows.push([c.label, c.required ? 'Yes' : 'No', c.hint]);
  if (kind === 'activity') {
    rows.push([], ['Document type', 'Units accepted']);
    for (const k of DOC_TYPE_KEYS) rows.push([DOC_TYPES[k].label, DOC_TYPES[k].unitsShown]);
  }
  rows.push([], ['Leave a cell empty if you do not have the value. Empty is never read as 0.']);
  return rows;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadTemplate(kind: ImportKind, format: 'csv' | 'xlsx'): Promise<void> {
  const base = TEMPLATE_NAMES[kind];
  if (format === 'csv') {
    save(new Blob([templateCsv(kind)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
    return;
  }
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([templateHeader(kind)]);
  data['!cols'] = COLUMNS[kind].map(c => ({ wch: Math.max(14, c.label.length + 4) }));
  XLSX.utils.book_append_sheet(wb, data, kind === 'activity' ? 'Activity data' : 'Suppliers');
  const guide = XLSX.utils.aoa_to_sheet(guideRows(kind));
  guide['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, guide, kind === 'activity' ? 'Units' : 'How to fill');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${base}.xlsx`);
}
