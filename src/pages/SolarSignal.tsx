import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { useSession } from '@/hooks/useSession';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import { computeSolarSignal, periodDays, SOLAR_METHOD, type EvidenceKind, type GridFactor, type SolarReading } from '../../supabase/functions/_shared/solarSignal';

const EVIDENCE: Array<{ id: EvidenceKind; label: string }> = [
  { id: 'net_meter_bill', label: 'Net-meter bill' },
  { id: 'generation_meter', label: 'Generation meter' },
  { id: 'inverter_export', label: 'Inverter export' },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthAfter = (end: string) => {
  const d = new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1);
  const s = iso(d); const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { periodStart: s, periodEnd: iso(e) };
};
const PANELS = 12;

/** The rooftop: panels light up month by month, the sun walks across the year. */
function Rooftop({ litMonths, sunAt, kwh }: { litMonths: number; sunAt: number; kwh: number }) {
  const [shown, setShown] = useState(kwh);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(kwh); return; }
    const from = shown, t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 600); setShown(from + (kwh - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) raf.current = requestAnimationFrame(step); };
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- roll from last shown
  }, [kwh]);
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, sunAt)));
  const sx = 200 + 160 * Math.cos(angle), sy = 150 - 110 * Math.sin(angle);
  return (
    <div className="relative">
      <svg viewBox="0 0 400 250" className="h-auto w-full" role="img" aria-label={`${litMonths} of 12 months of readings`}>
        <path d="M40 150 A 160 110 0 0 1 360 150" fill="none" stroke="hsl(var(--border))" strokeDasharray="3 6" />
        <g className="sol-sun" style={{ transform: `translate(${sx}px, ${sy}px)` }}>
          <circle r="16" fill="#f4c45a" />
          {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0 -22 V -28" stroke="#f4a21a" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${i * 45})`} />)}
        </g>
        <path d="M90 245 V 168 L 200 118 L 310 168 V 245 Z" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .5)" strokeWidth="2" strokeLinejoin="round" />
        <rect x="182" y="200" width="36" height="45" rx="3" fill="hsl(var(--muted))" />
        {Array.from({ length: PANELS }, (_, i) => {
          const col = i % 6, row = Math.floor(i / 6);
          const x = 112 + col * 30 + row * 0, y = 152 - (col < 3 ? col : 5 - col) * 0 + row * 18;
          const lit = i < litMonths;
          return (
            <g key={i} transform={`translate(${x} ${y - (row ? 0 : 0)}) skewY(${col < 3 ? -24 : 24})`}>
              <rect width="26" height="15" rx="2" className={`sol-panel ${lit ? 'sol-panel-on' : ''}`} style={{ transitionDelay: `${i * 40}ms` }} />
              <path d="M13 0 V15 M0 7.5 H26" stroke="hsl(var(--background))" strokeOpacity=".5" />
            </g>
          );
        })}
      </svg>
      <p className="absolute right-2 top-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur tabular-nums">
        <b>{Math.round(shown).toLocaleString('en-IN')}</b> kWh counted
      </p>
    </div>
  );
}

export default function SolarSignal() {
  const { user, isLoading: sessionLoading } = useSession();
  const [capacity, setCapacity] = useState('10');
  const [commissioned, setCommissioned] = useState('2025-04-01');
  const [accuracy, setAccuracy] = useState('1');
  const [registered, setRegistered] = useState<'no' | 'yes' | 'unsure'>('unsure');
  const [additionality, setAdditionality] = useState<'not_assessed' | 'passed_with_evidence'>('not_assessed');
  const [readings, setReadings] = useState<Array<SolarReading & { key: number }>>([{ key: 1, periodStart: '2025-04-01', periodEnd: '2025-04-30', kwh: NaN, evidence: 'net_meter_bill' }]);
  const [factor, setFactor] = useState<GridFactor | null>(null);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const keyRef = useRef(2);

  // Load the factor (public) and, for signed-in users, their saved system.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.from('grid_emission_factors' as never).select('*').eq('region', 'IN').eq('kind', 'combined_margin').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!cancelled && !error && data) {
        const f = data as { kg_per_kwh: number; region: string; source: string; version: string };
        setFactor({ kgPerKwh: Number(f.kg_per_kwh), kind: 'combined_margin', region: f.region, source: f.source, version: f.version });
      }
      if (!user) return;
      const res = await supabase.functions.invoke('solar-signal', { body: { action: 'load' } });
      if (cancelled) return;
      if (res.error) { if ((await getFunctionErrorMessage(res.error, '')).includes('not switched on')) setEnabled(false); return; }
      const { asset, readings: saved } = res.data ?? {};
      if (asset) {
        setCapacity(String(asset.capacity_kwp)); setCommissioned(asset.commissioned_on); setAccuracy(String(asset.meter_accuracy_pct));
        setRegistered(asset.registered_elsewhere === true ? 'yes' : asset.registered_elsewhere === false ? 'no' : 'unsure');
        setAdditionality(asset.additionality);
      }
      if (Array.isArray(saved) && saved.length) {
        setReadings(saved.map((r: { period_start: string; period_end: string; kwh: number; evidence: EvidenceKind }) => ({ key: keyRef.current++, periodStart: r.period_start, periodEnd: r.period_end, kwh: Number(r.kwh), evidence: r.evidence })));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const signal = useMemo(() => computeSolarSignal({
    capacityKwp: Number(capacity), commissionedOn: commissioned, meterAccuracyPct: Number(accuracy),
    readings: readings.filter((r) => Number.isFinite(r.kwh)), factor,
    registeredElsewhere: registered === 'yes' ? true : registered === 'no' ? false : null, additionality,
  }), [capacity, commissioned, accuracy, readings, factor, registered, additionality]);

  const litMonths = Math.min(PANELS, Math.round(signal.coveredDays / 30.4));
  const latest = signal.monitoringEnd ? new Date(`${signal.monitoringEnd}T00:00:00Z`).getUTCMonth() : -1;
  const sunAt = latest < 0 ? 0 : ((latest + 9) % 12) / 11; // April (FY start) at sunrise, March at sunset
  const earned = signal.checks.filter((c) => c.pass).length;

  const setReading = (key: number, patch: Partial<SolarReading>) => setReadings((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addMonth = () => setReadings((rs) => {
    const last = rs[rs.length - 1];
    const next = last && /^\d{4}-\d{2}-\d{2}$/.test(last.periodEnd) ? monthAfter(last.periodEnd) : { periodStart: commissioned, periodEnd: commissioned };
    return [...rs, { key: keyRef.current++, ...next, kwh: NaN, evidence: last?.evidence ?? 'net_meter_bill' }];
  });

  const save = async () => {
    setSaving(true);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('solar-signal', { body: { action: 'save', asset: {
        capacityKwp: Number(capacity), commissionedOn: commissioned, meterAccuracyPct: Number(accuracy), region: 'IN',
        registeredElsewhere: registered === 'yes' ? true : registered === 'no' ? false : null, additionality,
      }, readings: readings.filter((r) => Number.isFinite(r.kwh)).map(({ key: _k, ...r }) => r) } });
      if (error) { toast.error(await getFunctionErrorMessage(error, 'Could not save the signal.')); return; }
      toast.success(data?.signal?.status === 'ready' ? 'Signal saved and ready for the credit process.' : 'Saved. The signal updates as checks are completed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <Helmet><title>Rooftop Solar Signal | Senseible</title><meta name="robots" content="noindex" /></Helmet>
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Reduction signal · beta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Rooftop solar signal</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Add your system and its metered generation month by month. Each check you complete lights a step; when all are done, the signal is ready for the offline credit process. It is a signal, not a credit.</p>
        {!enabled && <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">Saving is not switched on yet. You can still prepare and preview the signal here.</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left: the rooftop and the quest */}
          <section aria-label="Progress" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-4">
              <Rooftop litMonths={litMonths} sunAt={sunAt} kwh={signal.eligibleKwh} />
            </div>
            <ol className="mt-5 grid gap-2" aria-label={`${earned} of ${signal.checks.length} checks complete`}>
              {signal.checks.map((c, i) => (
                <li key={c.id} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${c.pass ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                  <span key={String(c.pass)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${c.pass ? 'sol-stamp bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {c.pass ? <svg viewBox="0 0 20 20" className="h-4 w-4"><path d="M4 10.5 L8 14.5 L16 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
                  </span>
                  <span className="min-w-0"><span className="block text-sm font-medium">{c.label}</span><span className="block text-xs text-muted-foreground">{c.detail}</span></span>
                </li>
              ))}
            </ol>
          </section>

          {/* Right: inputs and the result */}
          <section aria-label="Your system" className="grid min-w-0 grid-cols-1 gap-6">
            <div className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="grid min-w-0 gap-1 text-sm">System size (kWp)<input value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="decimal" className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2" /></label>
              <label className="grid min-w-0 gap-1 text-sm">Commissioned on<input type="date" value={commissioned} onChange={(e) => setCommissioned(e.target.value)} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2" /></label>
              <label className="grid min-w-0 gap-1 text-sm">Meter accuracy class
                <select value={accuracy} onChange={(e) => setAccuracy(e.target.value)} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2">
                  <option value="0.5">Class 0.5</option><option value="1">Class 1.0</option><option value="2">Class 2.0</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">Registered under another carbon programme?
                <select value={registered} onChange={(e) => setRegistered(e.target.value as typeof registered)} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2">
                  <option value="unsure">Not sure yet</option><option value="no">No</option><option value="yes">Yes</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm sm:col-span-2">Additionality
                <select value={additionality} onChange={(e) => setAdditionality(e.target.value as typeof additionality)} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2">
                  <option value="not_assessed">Not assessed yet</option><option value="passed_with_evidence">Assessed, with evidence on file</option>
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">Metered generation</h2><span className="text-xs text-muted-foreground">{signal.coveredDays} days counted</span></div>
              <ul className="grid gap-2">
                {readings.map((r) => {
                  const days = /^\d{4}-\d{2}-\d{2}$/.test(r.periodStart) && /^\d{4}-\d{2}-\d{2}$/.test(r.periodEnd) ? periodDays(r.periodStart, r.periodEnd) : 0;
                  return (
                    <li key={r.key} className="sol-row grid grid-cols-2 gap-2 rounded-xl border border-border p-2">
                      <input type="date" aria-label="From" value={r.periodStart} onChange={(e) => setReading(r.key, { periodStart: e.target.value })} className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
                      <input type="date" aria-label="To" value={r.periodEnd} onChange={(e) => setReading(r.key, { periodEnd: e.target.value })} className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
                      <input inputMode="decimal" aria-label={`kWh for ${days} days`} placeholder="kWh" value={Number.isFinite(r.kwh) ? String(r.kwh) : ''} onChange={(e) => setReading(r.key, { kwh: e.target.value === '' ? NaN : Number(e.target.value) })} className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-right font-mono text-sm" />
                      <select aria-label="Evidence" value={r.evidence} onChange={(e) => setReading(r.key, { evidence: e.target.value as EvidenceKind })} className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                        {EVIDENCE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                      <button type="button" onClick={() => setReadings((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove this reading" className="justify-self-end rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-destructive">Remove</button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={addMonth} className="mt-3 rounded-full border border-dashed border-primary/60 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">+ Add the next month</button>
            </div>

            <div className={`rounded-3xl border p-5 ${signal.status === 'ready' ? 'sol-ready border-primary bg-primary/5' : 'border-border bg-card'}`} aria-live="polite">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your signal</p>
              {signal.status === 'ready' ? (
                <>
                  <p className="mt-1 text-4xl font-semibold tabular-nums">{signal.conservativeTco2e} <span className="text-base font-normal">tCO₂e (conservative)</span></p>
                  <p className="text-sm text-muted-foreground">Central {signal.centralTco2e} tCO₂e, less {signal.uncertaintyPct}% for meter accuracy · <span className="whitespace-nowrap">{signal.monitoringStart} to {signal.monitoringEnd}</span></p>
                </>
              ) : (
                <p className="mt-1 text-lg font-medium">{signal.status === 'withheld' ? `${signal.eligibleKwh.toLocaleString('en-IN')} kWh counted. Tonnes appear when every check is complete.` : 'Complete the steps on the left to build the signal.'}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Method {SOLAR_METHOD.id} v{SOLAR_METHOD.version}: {SOLAR_METHOD.basis}. A signal for the offline credit process, not a credit.</p>
              {sessionLoading ? null : user ? (
                <button type="button" onClick={() => { void save(); }} disabled={saving || !enabled} className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? 'Saving...' : 'Save system and signal'}</button>
              ) : (
                <Link to="/auth" state={{ returnTo: '/solar-signal' }} className="mt-4 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Sign in to save</Link>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
