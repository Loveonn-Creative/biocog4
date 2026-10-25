import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Calculator, FileSpreadsheet, FileText } from 'lucide-react';
import { MinimalNav } from '@/components/MinimalNav';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { compute, reportHash, reportingYear } from '@/lib/cbam/suite/engine';
import { downloadXlsx } from '@/lib/cbam/suite/exports';
import { loadWorkbook } from '@/lib/cbam/suite/storage';
import { DRAFT_STATUS, headerFromWorkbook, lineFromQuick, linesFromWorkbook, packIssues, packSheets, type PackHeader, type PackLine, type QuickGood } from '@/lib/cbam/suite/supplierPack';
import type { Workbook } from '@/lib/cbam/suite/types';
import { AddButton, Field, NumInput, Pill, RemoveButton, Select, TextInput, t } from '@/components/cbam-suite/ui';

// /cbam-suite/supplier-pack: the per-CN data an EU buyer asks for, as a draft
// pack. From the suite workbook on this device, or entered per good.

const blankGood = (): QuickGood => ({ cn: '', name: '', tonnes: NaN, basis: 'default' });

export default function CbamSupplierPack() {
  const meta = STATIC_PAGE_META['/cbam-suite/supplier-pack'];
  const reduce = useReducedMotion();
  const [wb, setWb] = useState<Workbook | null>(null);
  const [mode, setMode] = useState<'suite' | 'quick'>('quick');
  const [buyer, setBuyer] = useState('');
  const [hash, setHash] = useState('');
  const [plant, setPlant] = useState({ name: '', country: 'IN', start: '2026-01-01', end: '2026-12-31' });
  const [goods, setGoods] = useState<QuickGood[]>([blankGood()]);

  useEffect(() => { void loadWorkbook().then((w) => { if (w && !w.sample && w.processes.length) { setWb(w); setMode('suite'); } }); }, []);
  useEffect(() => { if (wb) void reportHash(wb).then(setHash); }, [wb]);

  const year = Number(plant.start.slice(0, 4)) || 2026;
  const { header, lines } = useMemo((): { header: PackHeader; lines: PackLine[] } => {
    if (mode === 'suite' && wb) return { header: headerFromWorkbook(wb, buyer, hash), lines: linesFromWorkbook(compute(wb)) };
    return {
      header: { installation: plant.name, country: plant.country, periodStart: plant.start, periodEnd: plant.end, buyer, status: DRAFT_STATUS, signOff: '', workbookHash: '' },
      lines: goods.map((g) => lineFromQuick(g, plant.country, year)),
    };
  }, [mode, wb, buyer, hash, plant, goods, year]);
  const issues = packIssues(lines);
  const draft = header.status === DRAFT_STATUS;
  const file = (header.installation || 'installation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  const setGood = (k: number, fn: (g: QuickGood) => void) => setGoods((gs) => gs.map((g, i) => { if (i !== k) return g; const c = { ...g }; fn(c); return c; }));

  const pdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 48;
    const line = (s: string, size = 10, gap = 14) => { doc.setFontSize(size); for (const part of doc.splitTextToSize(s, 515)) { if (y > 790) { doc.addPage(); y = 48; } doc.text(part, 40, y); y += gap; } };
    line('CBAM supplier data pack', 16, 22);
    line(header.status, 11, 16);
    if (header.signOff) line(header.signOff, 8, 11);
    line(`${header.installation} (${header.country}), ${header.periodStart} to ${header.periodEnd}`);
    line(`Prepared for: ${header.buyer || 'not entered'}`, 10, 20);
    for (const l of lines) {
      line(`CN ${l.cn}  ${l.name}  |  ${t(l.tonnes, 3)} t`, 11, 16);
      line(`SEE direct ${t(l.seeDirect, 4)}  |  indirect ${t(l.seeIndirect, 4)} t CO2e/t  |  ${l.basis === 'actual' ? 'Actual' : 'Default value'}`);
      line(l.source, 8, 18);
    }
    if (header.workbookHash) line(`Workbook SHA-256 ${header.workbookHash}`, 8, 11);
    doc.save(`cbam-supplier-pack-${file}.pdf`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical="/cbam-suite/supplier-pack"
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'CBAM Suite', url: '/cbam-suite' }, { name: 'Supplier data pack', url: '/cbam-suite/supplier-pack' }]} />
      <MinimalNav />
      <main className="container mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link to="/cbam-suite" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> CBAM Suite</Link>
          <Link to="/cbam-calculator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Calculator className="h-4 w-4" /> Quick estimate</Link>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Supplier data pack</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">The numbers your EU buyer needs, per CN code, with where each one comes from.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid content-start gap-4">
            {wb && (
              <div className="inline-flex w-fit rounded-full border border-border bg-card p-1 text-sm">
                {(['suite', 'quick'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-4 py-1.5 font-semibold transition ${mode === m ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>{m === 'suite' ? 'From my suite' : 'Enter goods'}</button>
                ))}
              </div>
            )}
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <Field label="Buyer"><TextInput value={buyer} onChange={setBuyer} placeholder="EU importer name" /></Field>
              {mode === 'quick' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Installation"><TextInput value={plant.name} onChange={(v) => setPlant((p) => ({ ...p, name: v }))} /></Field>
                  <Field label="Country" hint="ISO code"><TextInput value={plant.country} onChange={(v) => setPlant((p) => ({ ...p, country: v.toUpperCase().slice(0, 2) }))} /></Field>
                  <Field label="Period start"><input type="date" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={plant.start} onChange={(e) => setPlant((p) => ({ ...p, start: e.target.value }))} /></Field>
                  <Field label="Period end"><input type="date" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={plant.end} onChange={(e) => setPlant((p) => ({ ...p, end: e.target.value }))} /></Field>
                </div>
              )}
              {mode === 'suite' && wb && <p className="text-sm">{wb.installation.nameEn} <span className="text-muted-foreground">· {lines.length} good{lines.length === 1 ? '' : 's'} · year {reportingYear(wb)}</span></p>}
            </div>

            {mode === 'quick' && goods.map((g, k) => {
              const l = lines[k];
              return (
                <div key={k} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_7rem_auto]">
                    <Field label="CN code"><input className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm" value={g.cn} onChange={(e) => setGood(k, (x) => { x.cn = e.target.value.replace(/\D/g, '').slice(0, 8); })} /></Field>
                    <Field label="Product"><TextInput value={g.name} onChange={(v) => setGood(k, (x) => { x.name = v; })} /></Field>
                    <Field label="Tonnes"><NumInput value={g.tonnes} onChange={(v) => setGood(k, (x) => { x.tonnes = v ?? NaN; })} /></Field>
                    <RemoveButton label="Remove good" disabled={goods.length === 1} onClick={() => setGoods((gs) => gs.filter((_, i) => i !== k))} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <Field label="Basis"><Select value={g.basis} onChange={(v) => setGood(k, (x) => { x.basis = v; })} options={[{ value: 'default', label: 'EU default value' }, { value: 'actual', label: 'Our measured data' }]} /></Field>
                    {g.basis === 'actual' ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Field label="SEE direct" hint="t/t"><NumInput value={g.seeDirect} onChange={(v) => setGood(k, (x) => { x.seeDirect = v; })} /></Field>
                        <Field label="SEE indirect" hint="t/t"><NumInput value={g.seeIndirect} onChange={(v) => setGood(k, (x) => { x.seeIndirect = v; })} /></Field>
                        <Field label="Evidence" className="col-span-2 sm:col-span-1"><TextInput value={g.evidence} placeholder="Report ref." onChange={(v) => setGood(k, (x) => { x.evidence = v; })} /></Field>
                      </div>
                    ) : (
                      <p className="self-end pb-2 text-xs text-muted-foreground">{l?.defaultSee !== null && l ? `${t(l.seeDirect, 4)} direct · ${t(l.seeIndirect, 4)} indirect, incl. ${Math.round(l.markup * 100)}% mark-up` : g.cn.length >= 4 ? 'No EU default for this code.' : ''}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {mode === 'quick' && <div><AddButton onClick={() => setGoods((gs) => [...gs, blankGood()])}>Add good</AddButton></div>}
            {mode === 'suite' && !wb && <p className="text-sm text-muted-foreground">No workbook on this device yet. <Link to="/cbam-suite" className="font-semibold text-primary">Build one</Link>.</p>}
          </div>

          {/* The pack assembles as goods are completed: one sheet per CN code drops onto the stack. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative rounded-3xl border border-border bg-muted/40 p-4 sm:p-6">
              <motion.div key={draft ? 'draft' : 'signed'} initial={reduce ? false : { scale: 1.6, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className={`absolute -right-2 -top-3 z-10 rounded-lg border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider ${draft ? 'border-warning bg-background text-warning' : 'border-success bg-background text-success'}`}>
                {draft ? DRAFT_STATUS : header.status}
              </motion.div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pack</p>
              <p className="mt-1 truncate font-semibold">{header.installation || 'Installation'}{header.buyer && <span className="font-normal text-muted-foreground"> → {header.buyer}</span>}</p>
              <ul className="relative mt-4 grid gap-2">
                <AnimatePresence initial={false}>
                  {lines.map((l, k) => {
                    const ok = l.seeDirect !== null && l.tonnes > 0 && /^\d{4,8}$/.test(l.cn);
                    return (
                      <motion.li key={`${k}-${l.cn}`} layout={!reduce} initial={reduce ? false : { y: -24, opacity: 0, rotate: k % 2 ? 2 : -2 }} animate={{ y: 0, opacity: ok ? 1 : 0.45, rotate: 0 }} exit={{ opacity: 0, x: 30 }}
                        className="rounded-xl border border-border bg-card p-3 shadow-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-xs">CN {l.cn || '…'}</span>
                          <Pill tone={l.basis === 'actual' ? 'brand' : 'warn'}>{l.basis === 'actual' ? 'Actual' : 'Default'}</Pill>
                        </div>
                        <p className="truncate text-sm font-semibold">{l.name || 'Product'}</p>
                        <p className="font-mono text-xs text-muted-foreground">{t(l.seeDirect, 3)} + {t(l.seeIndirect, 3)} t CO2e/t · {t(l.tonnes, 0)} t</p>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
              {issues.length > 0 && <ul className="mt-3 grid gap-0.5 text-xs text-muted-foreground">{issues.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={issues.length > 0} onClick={() => void downloadXlsx(packSheets(header, lines), `cbam-supplier-pack-${file}.xlsx`)} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" /> .xlsx</button>
                <button type="button" disabled={issues.length > 0} onClick={() => void pdf()} className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><FileText className="h-4 w-4" /> .pdf</button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
