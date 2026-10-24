// Draft supplier data pack: what an EU importer asks an installation for, per
// CN code. Built from a suite workbook (computed SEE) or from per-good entries
// (supplier SEE with evidence, or the EU default value with the year's mark-up).
// The pack is "Draft, unverified" unless the workbook it came from is signed off.
import { INDIRECT_COUNTED, markupFor } from '../official';
import { defaultSeeFor, type Result } from './engine';
import type { Sheet } from './exports';
import { signOffDetail, verificationStatus } from './exports';
import type { Workbook } from './types';

export interface PackLine {
  cn: string; name: string; tonnes: number;
  seeDirect: number | null; seeIndirect: number | null;
  basis: 'actual' | 'default'; source: string;
  defaultSee: number | null; markup: number;
}

export interface PackHeader {
  installation: string; country: string; periodStart: string; periodEnd: string;
  buyer: string; status: string; signOff: string; workbookHash: string;
}

export interface QuickGood { cn: string; name: string; tonnes: number; basis: 'actual' | 'default'; seeDirect?: number; seeIndirect?: number; evidence?: string }

export const DRAFT_STATUS = 'Draft, unverified';

export function linesFromWorkbook(r: Result): PackLine[] {
  return r.goods.map((g) => {
    const pr = r.processes.find((p) => p.id === g.processId);
    const share = pr?.defaultShare ?? 0;
    return {
      cn: g.cn, name: g.name, tonnes: g.tonnes, seeDirect: g.seeDirect, seeIndirect: g.seeIndirect, basis: 'actual',
      source: share > 0 ? `Installation data; ${(share * 100).toFixed(1)}% of embedded emissions from precursor default values` : 'Installation data',
      defaultSee: g.defaultSee, markup: g.markup,
    };
  });
}

/** Per-good entry. Default basis takes the EU default SEE with the year's mark-up; nothing is filled in otherwise. */
export function lineFromQuick(g: QuickGood, country: string, year: number): PackLine {
  const d = g.cn ? defaultSeeFor(g.cn, country) : null;
  const mk = d ? markupFor(d.sector, year) : 0;
  const counted = d ? INDIRECT_COUNTED.includes(d.sector) : false;
  const defaultSee = d ? (counted ? d.total : d.direct) * (1 + mk) : null;
  if (g.basis === 'default') {
    return {
      cn: g.cn, name: g.name, tonnes: g.tonnes, basis: 'default',
      seeDirect: d ? d.direct * (1 + mk) : null, seeIndirect: d && d.indirectListed ? d.indirect * (1 + mk) : null,
      source: d ? `EU default value, ${d.source}, with ${Math.round(mk * 100)}% mark-up for ${year}` : 'No EU default value listed for this CN code',
      defaultSee, markup: mk,
    };
  }
  return {
    cn: g.cn, name: g.name, tonnes: g.tonnes, basis: 'actual',
    seeDirect: Number.isFinite(g.seeDirect) ? g.seeDirect! : null, seeIndirect: Number.isFinite(g.seeIndirect) ? g.seeIndirect! : null,
    source: g.evidence?.trim() ? `Installation data: ${g.evidence.trim()}` : 'Installation data (evidence not entered)',
    defaultSee, markup: mk,
  };
}

export function headerFromWorkbook(w: Workbook, buyer: string, workbookHash: string): PackHeader {
  const signed = Boolean(w.verification.internal.signedHash);
  return {
    installation: w.installation.nameEn, country: w.installation.country, periodStart: w.installation.periodStart, periodEnd: w.installation.periodEnd,
    buyer, status: signed ? verificationStatus(w) : DRAFT_STATUS, signOff: signed ? signOffDetail(w) : '', workbookHash,
  };
}

export function packIssues(lines: PackLine[]): string[] {
  const out: string[] = [];
  lines.forEach((l, k) => {
    const id = l.cn || `line ${k + 1}`;
    if (!/^\d{4,8}$/.test(l.cn)) out.push(`${id}: CN code needs 4 to 8 digits.`);
    if (!(l.tonnes > 0)) out.push(`${id}: tonnes missing.`);
    if (l.seeDirect === null) out.push(`${id}: SEE direct missing.`);
  });
  return out;
}

const n = (v: number | null, d = 4) => (v === null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

export function packSheets(h: PackHeader, lines: PackLine[]): Sheet[] {
  return [{
    name: 'Supplier_Pack',
    rows: [
      ['CBAM supplier data pack'],
      ['Status:', h.status],
      ...(h.signOff ? [['Signed off by:', h.signOff]] : []),
      ['Installation:', h.installation], ['Country:', h.country], ['Reporting period:', `${h.periodStart} to ${h.periodEnd}`],
      ['Prepared for:', h.buyer || 'not entered'],
      ...(h.workbookHash ? [['Workbook SHA-256:', h.workbookHash]] : []),
      [],
      ['CN code', 'Product', 'Tonnes', 'SEE direct (t CO2e/t)', 'SEE indirect (t CO2e/t)', 'Basis', 'Source', 'EU default incl. mark-up (t CO2e/t)'],
      ...lines.map((l) => [l.cn, l.name, n(l.tonnes, 3), n(l.seeDirect), n(l.seeIndirect), l.basis === 'actual' ? 'Actual' : 'Default value', l.source, n(l.defaultSee)]),
      [],
      ['SEE: specific embedded emissions per tonne of good. Indirect emissions count towards CBAM for cement and fertilisers.'],
    ],
  }];
}
