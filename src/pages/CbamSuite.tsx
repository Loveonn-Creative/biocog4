import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calculator, Package, RotateCcw, Upload } from 'lucide-react';
import { MinimalNav } from '@/components/MinimalNav';
import { SEOHead } from '@/components/SEOHead';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { useSession } from '@/hooks/useSession';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { compute, isFrozen, reportHash, sha256Hex } from '@/lib/cbam/suite/engine';
import { downloadPdf, downloadText, downloadXlsx, reportSheets, verifierSheets } from '@/lib/cbam/suite/exports';
import { emptyWorkbook, sampleWorkbook, uid } from '@/lib/cbam/suite/sample';
import { loadWorkbook, parseWorkbookFile, saveWorkbook } from '@/lib/cbam/suite/storage';
import type { Workbook } from '@/lib/cbam/suite/types';
import { PlantFlow } from '@/components/cbam-suite/PlantFlow';
import { ElectricityPanel, PlantPanel, PrecursorsPanel, ProcessesPanel, ReportPanel, ResultsPanel, StreamsPanel, VerifyPanel, type Edit } from '@/components/cbam-suite/panels';
import { Pill } from '@/components/cbam-suite/ui';
import '@/components/cbam-suite/suite.css';

// /cbam-suite: an installation's CBAM model, kept on this device (IndexedDB).
// Engine and sources: src/lib/cbam/suite/. Nothing here is sent to a server
// except the optional read of the signed-in user's own verified records.

const STEPS = [
  { id: 'plant', label: 'Plant' },
  { id: 'fuels', label: 'Fuels' },
  { id: 'processes', label: 'Goods' },
  { id: 'precursors', label: 'Precursors' },
  { id: 'electricity', label: 'Electricity' },
  { id: 'results', label: 'Results' },
  { id: 'report', label: 'Report' },
  { id: 'verify', label: 'Verify' },
] as const;
type StepId = typeof STEPS[number]['id'];

const slug = (s: string) => (s || 'installation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export default function CbamSuite() {
  const meta = STATIC_PAGE_META['/cbam-suite'];
  const reduce = useReducedMotion();
  const { user, isAuthenticated } = useSession();
  const [w, setW] = useState<Workbook | null>(null);
  const [step, setStep] = useState<StepId>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return (STEPS.find((s) => s.id === h)?.id ?? 'plant') as StepId;
  });
  const [hash, setHash] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { let live = true; void loadWorkbook().then((x) => { if (live) setW(x ?? sampleWorkbook()); }); return () => { live = false; }; }, []);
  useEffect(() => { if (!w) return; const id = setTimeout(() => { void saveWorkbook(w); }, 400); return () => clearTimeout(id); }, [w]);
  useEffect(() => { if (!w) return; let live = true; void reportHash(w).then((h) => { if (live) setHash(h); }); return () => { live = false; }; }, [w]);
  useEffect(() => { if (typeof window !== 'undefined') history.replaceState(null, '', `#${step}`); }, [step]);
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(id); }, [msg]);

  const r = useMemo(() => (w ? compute(w) : null), [w]);
  const locked = w ? isFrozen(w) : false;

  const edit: Edit = useCallback((fn, action) => {
    setW((cur) => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      fn(d);
      const at = new Date().toISOString();
      d.updatedAt = at;
      if (action) d.log = [...d.log, { at, action }];
      return d;
    });
  }, []);

  const replace = (next: Workbook, action: string, h?: string) => {
    const at = new Date().toISOString();
    setW({ ...next, log: [...next.log, { at, action, hash: h }] });
  };

  if (!w || !r) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title={meta.title} description={meta.description} canonical="/cbam-suite" />
        <MinimalNav />
      </div>
    );
  }

  const name = slug(w.installation.nameEn);
  const exportsGo = {
    report: async () => { const h = await reportHash(w); await downloadXlsx(reportSheets(w, r, h), `cbam-report-${name}.xlsx`); edit(() => {}, 'Exported operator emissions report'); },
    pdf: async () => { const h = await reportHash(w); await downloadPdf(w, r, h, `cbam-summary-${name}.pdf`); edit(() => {}, 'Exported PDF summary'); },
    verifier: async () => { const h = await reportHash(w); await downloadXlsx([...verifierSheets(w, r, h), ...reportSheets(w, r, h)], `cbam-verifier-pack-${name}.xlsx`); edit(() => {}, 'Exported verifier pack'); },
    json: async () => {
      const text = JSON.stringify({ workbook: w }, null, 2);
      const h = await sha256Hex(text);
      downloadText(text, `cbam-workbook-${name}.json`);
      edit(() => {}, `Exported workbook file, SHA-256 ${h}`);
      setMsg({ tone: 'ok', text: `Saved. File SHA-256 ${h}` });
    },
  };

  const onImportFile = async (f: File) => {
    try {
      const text = await f.text();
      const h = await sha256Hex(text);
      const next = parseWorkbookFile(text);
      replace(next, `Imported workbook file ${f.name}, SHA-256 ${h}`, h);
      setMsg({ tone: 'ok', text: `Opened ${f.name}. SHA-256 ${h}` });
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : 'Could not open this file.' });
    }
  };

  // Read-only: the signed-in user's own verified scope 1 and 2 records in the
  // reporting period. Scope 1 becomes measured source streams; scope 2 kWh
  // goes to the only process, or is reported back for the user to split.
  const importVerified = async () => {
    if (!user) return;
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.from('emissions').select('scope, category, co2_kg, activity_data, activity_unit, documents(invoice_date)').eq('user_id', user.id).eq('verified', true).in('scope', [1, 2]);
      if (error) throw error;
      const { periodStart, periodEnd } = w.installation;
      const rows = (data ?? []).filter((x) => { const d = (x.documents as { invoice_date?: string | null } | null)?.invoice_date; return !d || (d >= periodStart && d <= periodEnd); });
      const s1 = new Map<string, { kg: number; n: number }>();
      let kwh = 0, n2 = 0;
      for (const x of rows) {
        if (x.scope === 1) { const k = x.category || 'Fuel'; const c = s1.get(k) ?? { kg: 0, n: 0 }; c.kg += Number(x.co2_kg) || 0; c.n += 1; s1.set(k, c); }
        else if (x.scope === 2) { const u = (x.activity_unit ?? '').toLowerCase(); const a = Number(x.activity_data) || 0; if (u === 'kwh') { kwh += a; n2 += 1; } else if (u === 'mwh') { kwh += a * 1000; n2 += 1; } }
      }
      if (!s1.size && !kwh) { setMsg({ tone: 'bad', text: 'No verified scope 1 or 2 records in this reporting period.' }); return; }
      const mwh = kwh / 1000;
      edit((d) => {
        for (const [cat, c] of s1) {
          d.streams.push({ id: uid(), name: `${cat} (verified records)`, method: 'measured', ad: NaN, adUnit: 't', measuredTco2e: Number((c.kg / 1000).toFixed(6)), factorSource: `Senseible verified records: ${c.n} item${c.n > 1 ? 's' : ''}, scope 1, ${periodStart} to ${periodEnd}`, evidence: 'Senseible verified records', allocations: d.processes.length === 1 ? [{ processId: d.processes[0].id, share: 1 }] : [] });
        }
        if (mwh > 0 && d.processes.length === 1 && !d.processes[0].electricity.mwh) {
          d.processes[0].electricity.mwh = Number(mwh.toFixed(6));
          d.processes[0].electricity.evidence = `Senseible verified records: ${n2} electricity item${n2 > 1 ? 's' : ''}`;
        }
      }, `Imported verified records: ${s1.size} scope 1 group(s), ${mwh.toFixed(3)} MWh scope 2`);
      setMsg({ tone: 'ok', text: `Added ${s1.size} fuel group${s1.size === 1 ? '' : 's'}${mwh ? `, ${mwh.toLocaleString('en-IN', { maximumFractionDigits: 3 })} MWh electricity${w.processes.length === 1 ? '' : ' to split by process'}` : ''}.` });
    } catch {
      setMsg({ tone: 'bad', text: 'Could not read your records. Try again.' });
    }
  };

  const sign = async () => {
    const h = await reportHash(w);
    edit((d) => { d.verification.internal.signedHash = h; }, `Signed off (${w.verification.mode === 'senseible' ? 'Senseible' : 'external verifier'}) by ${w.verification.internal.reviewerName}, report SHA-256 ${h}`);
  };
  const reopen = () => edit((d) => { d.verification.internal.signedHash = undefined; }, 'Reopened after sign-off');

  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (k: number) => { const s = STEPS[Math.max(0, Math.min(STEPS.length - 1, k))]; setStep(s.id); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };
  const errors = r.issues.filter((i) => i.level === 'error').length;
  const props = { w, r, edit, locked };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SEOHead title={meta.title} description={meta.description} canonical="/cbam-suite" />
      <MinimalNav />
      <main className="container mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {w.sample && <Pill tone="warn">Sample plant, illustrative numbers</Pill>}
            {locked ? <Pill tone="ok">Signed off</Pill> : errors ? <Pill tone="bad">{errors} to fix</Pill> : <Pill tone="muted">Draft</Pill>}
            <span className="text-xs text-muted-foreground">Saved on this device</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{w.installation.nameEn || 'Your plant'}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {w.sample ? (
              <button type="button" onClick={() => replace(emptyWorkbook(), 'Started a new plant')} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">Start my plant <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button type="button" onClick={() => { if (window.confirm('Replace this workbook with the sample plant? Export it first to keep it.')) replace(sampleWorkbook(), 'Loaded sample plant'); }} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /> Sample plant</button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Upload className="h-4 w-4" /> Open file</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.target.value = ''; }} />
            <Link to="/cbam-suite/supplier-pack" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Package className="h-4 w-4" /> Supplier pack</Link>
            <Link to="/cbam-calculator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Calculator className="h-4 w-4" /> Quick estimate</Link>
          </div>
          <AnimatePresence>
            {msg && (
              <motion.p role="status" initial={reduce ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`break-all rounded-xl border px-3 py-2 text-xs ${msg.tone === 'ok' ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}>{msg.text}</motion.p>
            )}
          </AnimatePresence>
        </header>

        <section className="mt-6" aria-label="Plant flow">
          <PlantFlow w={w} r={r} />
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>Direct <b className="font-mono text-foreground">{r.totals.direct.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</b> t CO2e</span>
            <span>Indirect <b className="font-mono text-foreground">{r.totals.indirect.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</b> t CO2e</span>
          </div>
        </section>

        <nav aria-label="Steps" className="sticky top-0 z-30 -mx-4 mt-6 border-b border-border bg-background/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2">
          <ol className="grid grid-cols-4 gap-1 sm:flex sm:justify-between">
            {STEPS.map((s, k) => {
              const bad = r.issues.some((i) => i.level === 'error' && stepOfRef(i.ref, i.code) === s.id);
              return (
                <li key={s.id} className="sm:flex-1">
                  <button type="button" onClick={() => go(k)} aria-current={step === s.id ? 'step' : undefined} className={`relative w-full rounded-full px-2 py-1.5 text-xs font-semibold transition sm:text-sm ${step === s.id ? 'text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                    {step === s.id && <motion.span layoutId="cbam-step" className="absolute inset-0 rounded-full bg-foreground" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="relative">{s.label}{bad && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive align-middle" aria-label="has errors" />}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <AnimatePresence mode="wait">
          <motion.section key={step} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="mt-6" aria-label={STEPS[idx].label}>
            {step === 'plant' && <PlantPanel {...props} />}
            {step === 'fuels' && <StreamsPanel {...props} canImport={isAuthenticated} onImport={() => void importVerified()} />}
            {step === 'processes' && <ProcessesPanel {...props} />}
            {step === 'precursors' && <PrecursorsPanel {...props} />}
            {step === 'electricity' && <ElectricityPanel {...props} />}
            {step === 'results' && <ResultsPanel r={r} />}
            {step === 'report' && <ReportPanel r={r} onReport={() => void exportsGo.report()} onPdf={() => void exportsGo.pdf()} onVerifierPack={() => void exportsGo.verifier()} onJson={() => void exportsGo.json()} />}
            {step === 'verify' && <VerifyPanel w={w} r={r} edit={edit} hash={hash} onSign={() => void sign()} onReopen={reopen} />}
          </motion.section>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> {idx > 0 ? STEPS[idx - 1].label : 'Back'}</button>
          {idx < STEPS.length - 1 ? (
            <button type="button" onClick={() => go(idx + 1)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">{STEPS[idx + 1].label} <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <Link to="/cbam-suite/supplier-pack" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">Supplier pack <ArrowRight className="h-4 w-4" /></Link>
          )}
        </div>

        {w.log.length > 0 && (
          <details className="mt-10 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Change log ({w.log.length})</summary>
            <ol className="mt-2 grid max-h-64 gap-1 overflow-auto font-mono">
              {[...w.log].reverse().map((l, k) => <li key={k} className="break-all">{l.at.replace('T', ' ').slice(0, 19)}  {l.action}</li>)}
            </ol>
          </details>
        )}
      </main>
    </div>
  );
}

function stepOfRef(ref: string, code: string): StepId {
  if (ref === 'installation') return 'plant';
  if (ref.startsWith('stream:')) return 'fuels';
  if (code.startsWith('prec') || code.startsWith('bm')) return 'precursors';
  if (code.startsWith('elec')) return 'electricity';
  return 'processes';
}
