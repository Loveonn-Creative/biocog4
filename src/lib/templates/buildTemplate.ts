// Builds each /templates file in the browser. xlsx is loaded only when the
// reader clicks Download, so the page itself stays light.
import {
  REGISTER_FUELS, REGISTER_GRID, REGISTER_MONTHS, supplierLetter,
  type LetterInputs, type TemplateDoc,
} from '@/data/templates';

type Cell = string | number | { t: 'n'; f: string };
const fx = (f: string): Cell => ({ t: 'n', f });

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Column letter for a zero-based index (0 -> A, 26 -> AA). */
export function col(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Rows for the register sheet: inputs, then kg CO2 formulas per row and a year total. */
export function registerRows(): Cell[][] {
  const inputs = [...REGISTER_FUELS.map(f => `${f.label} (${f.unit})`), `${REGISTER_GRID.label} (kWh)`];
  const n = inputs.length;
  const s1Col = col(1 + n), s2Col = col(2 + n);
  const head: Cell[] = ['Month', ...inputs, 'Scope 1 kg CO2', 'Scope 2 kg CO2', 'Total kg CO2'];
  const body: Cell[][] = REGISTER_MONTHS.map((m, i) => {
    const r = i + 2;
    // Factors live on the Factors sheet, rows 2..n+1, column C.
    const s1 = REGISTER_FUELS.map((_, k) => `N(${col(1 + k)}${r})*Factors!$C$${k + 2}`).join('+');
    const s2 = `N(${col(n)}${r})*Factors!$C$${n + 1}`;
    return [m, ...Array<Cell>(n).fill(''), fx(s1), fx(s2), fx(`${s1Col}${r}+${s2Col}${r}`)];
  });
  const last = REGISTER_MONTHS.length + 1;
  const total: Cell[] = ['Year total', ...Array.from({ length: n + 3 }, (_, k) => fx(`SUM(${col(1 + k)}2:${col(1 + k)}${last})`))];
  return [head, ...body, total];
}

export function factorRows(): Cell[][] {
  return [
    ['Fuel or energy', 'Unit', 'kg CO2 per unit', 'Source'],
    ...REGISTER_FUELS.map(f => [f.label, f.unit, f.factor, f.source]),
    [REGISTER_GRID.label, REGISTER_GRID.unit, REGISTER_GRID.factor, REGISTER_GRID.source],
  ];
}

/** Questionnaire-style rows: section, field, example, how to fill, who fills it, answer column. */
export function fieldRows(t: TemplateDoc): Cell[][] {
  return [
    ['Section', 'Field', 'Example', 'How to fill it', 'Filled by', 'Your answer'],
    ...t.sections.flatMap(s => s.fields.map(f => [s.name, f.label, f.example, f.hint ?? '', f.by === 'buyer' ? 'Buyer' : 'Supplier', ''])),
  ];
}

const aboutRows = (t: TemplateDoc): Cell[][] => [
  [t.name],
  [t.answer],
  [''],
  ['Who it is for', t.whoFor],
  ['What it saves', t.saves],
  [''],
  ['Sources'],
  ...t.sources.map(s => [s.label, s.url]),
  [''],
  ['Made by Senseible. Upload your bills at https://senseible.earth to fill the emissions figures automatically.'],
];

export async function downloadTemplate(t: TemplateDoc, letter?: LetterInputs): Promise<void> {
  if (t.format === 'txt') {
    const text = supplierLetter(letter ?? { buyer: '', supplier: '', period: '', replyBy: '' });
    triggerDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), t.fileName);
    return;
  }
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const sheet = (rows: Cell[][], widths: number[]) => {
    // Formula cells are written after the grid, with a cached 0 (correct while the
    // inputs are blank) so the writer keeps them; spreadsheets recalculate on edit.
    const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => (typeof c === 'object' ? 0 : c))));
    rows.forEach((r, ri) => r.forEach((c, ci) => {
      if (typeof c === 'object') ws[XLSX.utils.encode_cell({ r: ri, c: ci })] = { t: 'n', v: 0, f: c.f };
    }));
    ws['!cols'] = widths.map(wch => ({ wch }));
    return ws;
  };
  if (t.slug === 'monthly-emissions-register') {
    const rows = registerRows();
    XLSX.utils.book_append_sheet(wb, sheet(rows, [12, ...rows[0].slice(1).map(() => 16)]), 'Register');
    XLSX.utils.book_append_sheet(wb, sheet(factorRows(), [22, 8, 16, 70]), 'Factors');
  } else {
    XLSX.utils.book_append_sheet(wb, sheet(fieldRows(t), [22, 34, 40, 50, 10, 30]), t.tab);
  }
  XLSX.utils.book_append_sheet(wb, sheet(aboutRows(t), [28, 90]), 'About');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), t.fileName);
}
