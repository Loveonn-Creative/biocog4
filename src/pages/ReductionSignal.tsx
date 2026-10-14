import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { useSession } from '@/hooks/useSession';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import {
  computeEfficiencySignal, computeFuelSwitchSignal, ENERGY_LABEL, ENERGY_UNIT, MAX_SEC_DEVIATION, periodDays,
  type Energy, type Fuel, type GridFactor, type Lever, type Period, type ReductionSignal as Signal,
} from '../../supabase/functions/_shared/reductionSignal';

type Evidence = 'fuel_invoice' | 'energy_bill' | 'sub_meter' | 'production_log';
type Tri = 'yes' | 'no' | 'unsure';
type Phase = 'baseline' | 'project';
interface Row { key: number; phase: Phase; periodStart: string; periodEnd: string; oldFuelQty: string; newEnergyQty: string; energyQty: string; outputQty: string; evidence: Evidence }
interface Draft {
  id: string | null; name: string; equipment: string; startedOn: string;
  oldFuel: Fuel; newEnergy: Energy; carrier: Energy; outputUnit: string;
  accuracy: string; registered: Tri; retired: Tri; additionality: 'not_assessed' | 'passed_with_evidence'; rows: Row[];
}
interface SavedProject {
  id: string; lever: Lever; name: string; equipment: string | null; started_on: string; old_fuel: Fuel | null; new_energy: Energy | null;
  energy_carrier: Energy | null; output_unit: string | null; meter_accuracy_pct: number; registered_elsewhere: boolean | null;
  old_equipment_retired: boolean | null; additionality: Draft['additionality'];
  periods: Array<{ phase: Phase; period_start: string; period_end: string; old_fuel_qty: number | null; new_energy_qty: number | null; energy_qty: number | null; output_qty: number | null; evidence: Evidence }>;
}

const OLD_FUELS: Fuel[] = ['DIESEL', 'FURNACE_OIL', 'KEROSENE', 'LPG', 'PNG'];
const NEW_ENERGY: Energy[] = ['PNG', 'LPG', 'GRID_ELECTRICITY'];
const CARRIERS: Energy[] = ['GRID_ELECTRICITY', 'DIESEL', 'FURNACE_OIL', 'KEROSENE', 'LPG', 'PNG'];
const EVIDENCE: Array<{ id: Evidence; label: string }> = [
  { id: 'fuel_invoice', label: 'Fuel invoice' }, { id: 'energy_bill', label: 'Energy bill' },
  { id: 'sub_meter', label: 'Sub-meter' }, { id: 'production_log', label: 'Production log' },
];
const LEVERS: Array<{ id: Lever; label: string; line: string }> = [
  { id: 'fuel_switch', label: 'Fuel switch', line: 'A boiler, furnace or kiln moved to a lower-carbon fuel.' },
  { id: 'energy_efficiency', label: 'Energy efficiency', line: 'The same output now takes less energy.' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const monthOf = (y: number, m: number) => ({ periodStart: iso(new Date(Date.UTC(y, m, 1))), periodEnd: iso(new Date(Date.UTC(y, m + 1, 0))) });
const monthAfter = (end: string) => { const d = new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return monthOf(d.getUTCFullYear(), d.getUTCMonth()); };
const q = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) || Number(s) < 0 ? null : Number(s));
const tri = (v: boolean | null): Tri => (v === true ? 'yes' : v === false ? 'no' : 'unsure');
const fromTri = (v: Tri) => (v === 'yes' ? true : v === 'no' ? false : null);
const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d });
const unitLabel = (e: Energy) => (ENERGY_UNIT[e] === 'litre' ? 'litres' : ENERGY_UNIT[e]);

function blankDraft(lever: Lever): Draft {
  const now = new Date();
  const started = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)));
  return {
    id: null, name: '', equipment: '', startedOn: started, oldFuel: 'DIESEL', newEnergy: 'PNG', carrier: 'GRID_ELECTRICITY',
    outputUnit: lever === 'energy_efficiency' ? 'tonne' : '', accuracy: '1', registered: 'unsure', retired: 'unsure', additionality: 'not_assessed', rows: [],
  };
}

/** Rolls a number toward its new value, or jumps there when motion is reduced. */
function useRolling(value: number) {
  const [shown, setShown] = useState(value);
  const raf = useRef(0);
  const last = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(value); last.current = value; return; }
    const from = last.current, t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700); const v = from + (value - from) * (1 - Math.pow(1 - k, 3));
      last.current = v; setShown(v); if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return shown;
}

/**
 * Fuel switch: the equipment is fed by two lines. Before the change the old
 * fuel flows; once readings after the change exist, the valve turns and the
 * new energy flows instead. The counter is the old fuel the change displaced.
 */
function SwapVisual({ oldFuel, newEnergy, switched, displaced }: { oldFuel: Fuel; newEnergy: Energy; switched: boolean; displaced: number }) {
  const shown = useRolling(displaced);
  const grid = newEnergy === 'GRID_ELECTRICITY';
  return (
    <div className="relative">
      <svg viewBox="0 0 400 250" className="h-auto w-full" role="img"
        aria-label={switched ? `${ENERGY_LABEL[newEnergy]} now feeds the equipment in place of ${ENERGY_LABEL[oldFuel].toLowerCase()}` : `${ENERGY_LABEL[oldFuel]} feeds the equipment`}>
        {/* Old fuel drum */}
        <g transform="translate(26 34)">
          <rect width="62" height="74" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .5)" strokeWidth="2" />
          <path d="M0 18 H62 M0 56 H62" stroke="hsl(var(--foreground) / .25)" strokeWidth="2" />
          <rect x="6" y="22" width="50" height="46" rx="3" className="rs-level" style={{ transform: `scaleY(${switched ? 0.18 : 1})` }} fill="hsl(var(--foreground) / .28)" />
          <text x="31" y="94" textAnchor="middle" className="fill-muted-foreground text-[11px]">{ENERGY_LABEL[oldFuel]}</text>
        </g>
        {/* New energy source */}
        <g transform="translate(26 150)">
          {grid ? (
            <g stroke="hsl(var(--primary))" strokeWidth="2.2" fill="none" strokeLinejoin="round">
              <path d="M31 4 L14 70 M31 4 L48 70 M20 46 H42 M24 28 H38 M8 16 H54" />
            </g>
          ) : (
            <g>
              <rect x={newEnergy === 'LPG' ? 14 : 0} width={newEnergy === 'LPG' ? 34 : 62} height="70" rx={newEnergy === 'LPG' ? 16 : 6} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
              {newEnergy === 'PNG' && <path d="M0 24 H62 M0 46 H62" stroke="hsl(var(--primary) / .35)" strokeWidth="2" />}
            </g>
          )}
          <text x="31" y="88" textAnchor="middle" className="fill-muted-foreground text-[11px]">{ENERGY_LABEL[newEnergy]}</text>
        </g>
        {/* Feed lines into the valve */}
        <path d="M88 71 H150 V118" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M88 185 H150 V132" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M88 71 H150 V118" fill="none" className={`rs-flow ${switched ? 'rs-flow-off' : ''}`} stroke="hsl(var(--foreground) / .55)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M88 185 H150 V132" fill="none" className={`rs-flow ${switched ? '' : 'rs-flow-off'}`} stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* The valve turns at the change */}
        <g transform="translate(150 125)">
          <circle r="13" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .6)" strokeWidth="2" />
          <path d="M0 -9 V9" className="rs-valve" style={{ transform: `rotate(${switched ? 180 : 0}deg)` }} stroke="hsl(var(--primary))" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M0 -9 L-3 -4 M0 -9 L3 -4" className="rs-valve" style={{ transform: `rotate(${switched ? 180 : 0}deg)` }} stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <path d="M163 125 H232" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
        <path d="M163 125 H232" fill="none" className="rs-flow" stroke={switched ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / .55)'} strokeWidth="3" strokeLinecap="round" />
        {/* The equipment */}
        <g transform="translate(232 70)">
          <rect width="120" height="110" rx="14" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .5)" strokeWidth="2" />
          <rect x="34" y="-34" width="18" height="36" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .5)" strokeWidth="2" />
          {switched && grid
            ? <path d="M30 70 l8 -12 l8 12 l8 -12 l8 12 l8 -12 l8 12 l8 -12" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M54 84 c-10 -10 -4 -22 4 -30 c0 10 10 12 8 22 c4 -4 4 -10 2 -14 c10 8 10 22 -2 26 Z" className="rs-flame" fill={switched ? 'hsl(var(--primary))' : '#f4a21a'} />}
          <text x="60" y="102" textAnchor="middle" className="fill-muted-foreground text-[11px]">Equipment</text>
        </g>
      </svg>
      <p className="absolute right-2 top-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur tabular-nums">
        <b>{fmt(shown)}</b> {unitLabel(oldFuel)} of {ENERGY_LABEL[oldFuel].toLowerCase()} displaced
      </p>
    </div>
  );
}

interface BandPoint { key: string; phase: Phase; sec: number; excluded: boolean }
/**
 * Efficiency: each period's energy per unit of output, in time order. The band
 * is the baseline average +/-10% (the method's stability limit); periods after
 * the change sit below it when the same output takes less energy.
 */
function BandVisual({ points, mean, unit, outputUnit, saved }: { points: BandPoint[]; mean: number; unit: string; outputUnit: string; saved: number }) {
  const shown = useRolling(saved);
  const W = 400, H = 250, L = 46, R = 12, T = 22, B = 34;
  // The scale follows the counted periods; a period left out for its output sits at the edge.
  const counted = points.filter((p) => !p.excluded).map((p) => p.sec);
  const ref = mean > 0 ? mean : Math.max(...counted, 1);
  const max = Math.min(ref * 2, Math.max(ref * 1.25, ...counted));
  const min = Math.max(0, Math.min(ref * 0.6, ...counted));
  const y = (v: number) => T + (H - T - B) * (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min || 1));
  const n = points.length;
  const x = (i: number) => L + ((W - L - R) * (n <= 1 ? 0.5 : i / (n - 1)));
  const firstAfter = points.findIndex((p) => p.phase === 'project');
  const cut = firstAfter > 0 ? (x(firstAfter - 1) + x(firstAfter)) / 2 : null;
  const hasBand = mean > 0;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={hasBand ? `Energy per ${outputUnit} by period; the band is the baseline average plus or minus ten percent` : `Add periods to see energy per ${outputUnit}`}>
        <path d={`M${L} ${T} V${H - B} H${W - R}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <text x={L} y={T - 8} className="fill-muted-foreground text-[10px]">{unit} per {outputUnit || 'unit'}</text>
        {hasBand && (
          <g>
            <rect x={L} y={y(mean * (1 + MAX_SEC_DEVIATION))} width={W - L - R} height={y(mean * (1 - MAX_SEC_DEVIATION)) - y(mean * (1 + MAX_SEC_DEVIATION))}
              className="rs-band" fill="hsl(var(--primary) / .1)" />
            <path d={`M${L} ${y(mean)} H${W - R}`} className="rs-draw" pathLength={1} stroke="hsl(var(--primary) / .6)" strokeDasharray="1" strokeWidth="1.5" fill="none" />
            <text x={L - 6} y={y(mean) + 3} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{fmt(mean, mean < 10 ? 2 : 0)}</text>
          </g>
        )}
        {cut !== null && (
          <g>
            <path d={`M${cut} ${T - 6} V${H - B}`} stroke="hsl(var(--foreground) / .45)" strokeDasharray="3 4" />
            <text x={cut} y={H - B + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">change</text>
          </g>
        )}
        {points.map((p, i) => (
          <g key={p.key} transform={`translate(${x(i)} ${y(p.sec)})`}><g className="rs-dot" style={{ animationDelay: `${Math.min(i, 24) * 30}ms` }}>
            {p.excluded ? (
              <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" />
            ) : p.phase === 'baseline' ? (
              <circle r="4.5" fill="hsl(var(--card))" stroke="hsl(var(--foreground) / .6)" strokeWidth="1.8" />
            ) : (
              <circle r="5" fill="hsl(var(--primary))" />
            )}
          </g></g>
        ))}
        {!n && <text x={(W + L) / 2} y={H / 2} textAnchor="middle" className="fill-muted-foreground text-[12px]">Add periods to see energy per {outputUnit || 'unit'}</text>}
      </svg>
      <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-foreground tabular-nums"><b>{fmt(shown)}</b> {unit} saved</span>
        <span>Band: baseline average ±10%</span>
      </p>
    </div>
  );
}

export default function ReductionSignal() {
  const { user, isLoading: sessionLoading } = useSession();
  const [params, setParams] = useSearchParams();
  const lever: Lever = params.get('lever') === 'energy_efficiency' ? 'energy_efficiency' : 'fuel_switch';
  const [drafts, setDrafts] = useState<Record<Lever, Draft>>(() => ({ fuel_switch: blankDraft('fuel_switch'), energy_efficiency: blankDraft('energy_efficiency') }));
  const [saved, setSaved] = useState<SavedProject[]>([]);
  const [factor, setFactor] = useState<GridFactor | null>(null);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const keyRef = useRef(1);
  const d = drafts[lever];
  const patch = (p: Partial<Draft>) => setDrafts((all) => ({ ...all, [lever]: { ...all[lever], ...p } }));
  const setLever = (l: Lever) => setParams((s) => { const n = new URLSearchParams(s); n.set('lever', l); return n; }, { replace: true });

  const toDraft = (p: SavedProject): Draft => ({
    id: p.id, name: p.name ?? '', equipment: p.equipment ?? '', startedOn: p.started_on,
    oldFuel: p.old_fuel ?? 'DIESEL', newEnergy: p.new_energy ?? 'PNG', carrier: p.energy_carrier ?? 'GRID_ELECTRICITY', outputUnit: p.output_unit ?? '',
    accuracy: String(p.meter_accuracy_pct ?? 1), registered: tri(p.registered_elsewhere), retired: tri(p.old_equipment_retired), additionality: p.additionality,
    rows: (p.periods ?? []).map((r) => ({
      key: keyRef.current++, phase: r.phase, periodStart: r.period_start, periodEnd: r.period_end, evidence: r.evidence,
      oldFuelQty: r.old_fuel_qty == null ? '' : String(r.old_fuel_qty), newEnergyQty: r.new_energy_qty == null ? '' : String(r.new_energy_qty),
      energyQty: r.energy_qty == null ? '' : String(r.energy_qty), outputQty: r.output_qty == null ? '' : String(r.output_qty),
    })),
  });

  // The grid factor is public; signed-in users also get their saved projects.
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
      const res = await supabase.functions.invoke('reduction-signal', { body: { action: 'load' } });
      if (cancelled) return;
      if (res.error) { if ((await getFunctionErrorMessage(res.error, '')).includes('not switched on')) setEnabled(false); return; }
      const projects: SavedProject[] = Array.isArray(res.data?.projects) ? res.data.projects : [];
      setSaved(projects);
      setDrafts((all) => {
        const next = { ...all };
        for (const l of ['fuel_switch', 'energy_efficiency'] as Lever[]) {
          const latest = [...projects].reverse().find((p) => p.lever === l);
          if (latest && !all[l].id && !all[l].rows.length) next[l] = toDraft(latest);
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const periodsFor = (phase: Phase): Period[] => d.rows.filter((r) => r.phase === phase).map((r) => ({
    periodStart: r.periodStart, periodEnd: r.periodEnd, oldFuelQty: q(r.oldFuelQty), newEnergyQty: q(r.newEnergyQty), energyQty: q(r.energyQty), outputQty: q(r.outputQty),
  }));
  const signal: Signal = useMemo(() => {
    const common = {
      startedOn: d.startedOn, baseline: periodsFor('baseline'), project: periodsFor('project'), meterAccuracyPct: Number(d.accuracy), factor,
      registeredElsewhere: fromTri(d.registered), oldEquipmentRetired: fromTri(d.retired), additionality: d.additionality,
    };
    return lever === 'fuel_switch'
      ? computeFuelSwitchSignal({ ...common, oldFuel: d.oldFuel, newEnergy: d.newEnergy })
      : computeEfficiencySignal({ ...common, carrier: d.carrier, outputUnit: d.outputUnit });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- periodsFor reads d
  }, [lever, d, factor]);

  // Efficiency band: energy per unit for each period with both figures, in date order.
  const band = useMemo(() => {
    const excluded = new Set(signal.periods.filter((p) => p.excluded).map((p) => p.periodStart));
    const pts = d.rows
      .filter((r) => q(r.energyQty) !== null && (q(r.outputQty) ?? 0) > 0 && isDate(r.periodStart))
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
      .map((r) => ({ key: String(r.key), phase: r.phase, sec: q(r.energyQty)! / q(r.outputQty)!, excluded: r.phase === 'project' && excluded.has(r.periodStart) }));
    const base = d.rows.filter((r) => r.phase === 'baseline' && q(r.energyQty) !== null && (q(r.outputQty) ?? 0) > 0);
    const out = base.reduce((a, r) => a + q(r.outputQty)!, 0);
    return { pts, mean: out > 0 ? base.reduce((a, r) => a + q(r.energyQty)!, 0) / out : 0 };
  }, [d.rows, signal.periods]);

  const earned = signal.checks.filter((c) => c.pass).length;
  const after = d.rows.filter((r) => r.phase === 'project');
  const before = d.rows.filter((r) => r.phase === 'baseline');
  const unitOf = (e: Energy) => unitLabel(e);

  const setRow = (key: number, p: Partial<Row>) => patch({ rows: d.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) });
  const defaultEvidence: Evidence = lever === 'fuel_switch' ? 'fuel_invoice' : 'energy_bill';
  const blankRow = (phase: Phase, span: { periodStart: string; periodEnd: string }, evidence: Evidence = defaultEvidence): Row =>
    ({ key: keyRef.current++, phase, ...span, oldFuelQty: '', newEnergyQty: '', energyQty: '', outputQty: '', evidence });
  /** Twelve calendar months ending before the month of the change. */
  const fillBaseline = () => {
    if (!isDate(d.startedOn)) return;
    const s = new Date(`${d.startedOn}T00:00:00Z`);
    const have = new Set(before.map((r) => r.periodStart));
    const add = Array.from({ length: 12 }, (_, i) => monthOf(s.getUTCFullYear(), s.getUTCMonth() - 12 + i)).filter((m) => !have.has(m.periodStart)).map((m) => blankRow('baseline', m));
    patch({ rows: [...d.rows, ...add].sort((a, b) => a.periodStart.localeCompare(b.periodStart)) });
  };
  const addAfter = () => {
    const last = after[after.length - 1];
    let next = last && isDate(last.periodEnd) ? monthAfter(last.periodEnd) : null;
    if (!next && isDate(d.startedOn)) { const s = new Date(`${d.startedOn}T00:00:00Z`); next = { periodStart: d.startedOn, periodEnd: monthOf(s.getUTCFullYear(), s.getUTCMonth()).periodEnd }; }
    if (next) patch({ rows: [...d.rows, blankRow('project', next, last?.evidence ?? defaultEvidence)] });
  };
  const addBefore = () => {
    const first = before[0];
    if (!first) { fillBaseline(); return; }
    const s = new Date(`${first.periodStart}T00:00:00Z`);
    patch({ rows: [blankRow('baseline', monthOf(s.getUTCFullYear(), s.getUTCMonth() - 1), first.evidence), ...d.rows] });
  };

  const save = async () => {
    setSaving(true);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('reduction-signal', { body: { action: 'save', project: {
        id: d.id ?? undefined, lever, name: d.name, equipment: d.equipment, startedOn: d.startedOn, region: 'IN',
        oldFuel: d.oldFuel, newEnergy: d.newEnergy, energyCarrier: d.carrier, outputUnit: d.outputUnit, meterAccuracyPct: Number(d.accuracy),
        registeredElsewhere: fromTri(d.registered), oldEquipmentRetired: fromTri(d.retired), additionality: d.additionality,
      }, periods: d.rows.map((r) => ({ phase: r.phase, periodStart: r.periodStart, periodEnd: r.periodEnd, evidence: r.evidence, oldFuelQty: r.oldFuelQty, newEnergyQty: r.newEnergyQty, energyQty: r.energyQty, outputQty: r.outputQty })) } });
      if (error) { toast.error(await getFunctionErrorMessage(error, 'Could not save the signal.')); return; }
      if (data?.project?.id) {
        patch({ id: data.project.id });
        setSaved((ps) => (ps.some((p) => p.id === data.project.id) ? ps : [...ps, { ...data.project, periods: [] }]));
      }
      toast.success(data?.signal?.status === 'ready' ? 'Signal saved and ready for the credit process.' : 'Saved. The signal updates as checks are completed.');
    } finally { setSaving(false); }
  };

  const mine = saved.filter((p) => p.lever === lever);
  const field = 'w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2';
  const cell = 'w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm';
  const qtyInputs = (r: Row) => {
    const out = <input inputMode="decimal" aria-label={`Output (${d.outputUnit || 'units'})`} placeholder={`Output${d.outputUnit ? ` (${d.outputUnit})` : ''}`} value={r.outputQty} onChange={(e) => setRow(r.key, { outputQty: e.target.value })} className={`${cell} text-right font-mono`} />;
    if (lever === 'energy_efficiency') return (<>
      <input inputMode="decimal" aria-label={`Energy used (${unitOf(d.carrier)})`} placeholder={`Energy (${unitOf(d.carrier)})`} value={r.energyQty} onChange={(e) => setRow(r.key, { energyQty: e.target.value })} className={`${cell} text-right font-mono`} />
      {out}
    </>);
    if (r.phase === 'baseline') return (<>
      <input inputMode="decimal" aria-label={`${ENERGY_LABEL[d.oldFuel]} used (${unitOf(d.oldFuel)})`} placeholder={`${ENERGY_LABEL[d.oldFuel]} (${unitOf(d.oldFuel)})`} value={r.oldFuelQty} onChange={(e) => setRow(r.key, { oldFuelQty: e.target.value })} className={`${cell} text-right font-mono`} />
      {out}
    </>);
    return (<>
      <input inputMode="decimal" aria-label={`${ENERGY_LABEL[d.newEnergy]} used (${unitOf(d.newEnergy)})`} placeholder={`${ENERGY_LABEL[d.newEnergy]} (${unitOf(d.newEnergy)})`} value={r.newEnergyQty} onChange={(e) => setRow(r.key, { newEnergyQty: e.target.value })} className={`${cell} text-right font-mono`} />
      <input inputMode="decimal" aria-label={`${ENERGY_LABEL[d.oldFuel]} still used (${unitOf(d.oldFuel)})`} placeholder="Still burned" value={r.oldFuelQty} onChange={(e) => setRow(r.key, { oldFuelQty: e.target.value })} className={`${cell} text-right font-mono`} />
      <span className="col-span-2">{out}</span>
    </>);
  };
  const rowList = (rows: Row[]) => (
    <ul className="grid gap-2">
      {rows.map((r) => {
        const days = isDate(r.periodStart) && isDate(r.periodEnd) ? periodDays(r.periodStart, r.periodEnd) : 0;
        return (
          <li key={r.key} className="sol-row grid grid-cols-2 gap-2 rounded-xl border border-border p-2">
            <input type="date" aria-label="From" value={r.periodStart} onChange={(e) => setRow(r.key, { periodStart: e.target.value })} className={cell} />
            <input type="date" aria-label={`To (${days} days)`} value={r.periodEnd} onChange={(e) => setRow(r.key, { periodEnd: e.target.value })} className={cell} />
            {qtyInputs(r)}
            <select aria-label="Evidence" value={r.evidence} onChange={(e) => setRow(r.key, { evidence: e.target.value as Evidence })} className={cell}>
              {EVIDENCE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <button type="button" onClick={() => patch({ rows: d.rows.filter((x) => x.key !== r.key) })} aria-label="Remove this period" className="justify-self-end rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-destructive">Remove</button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <Helmet><title>Fuel Switch and Efficiency Signal | Senseible</title><meta name="robots" content="noindex" /></Helmet>
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Reduction signal · beta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Fuel switch and efficiency</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Show what changed with the bills and logs you already keep: a year before the change, then each period after it. Every check you complete lights a step; when all pass, the signal is ready for the offline credit process. It is a signal, not a credit.</p>

        <div role="tablist" aria-label="What changed" className="mt-6 inline-grid grid-cols-2 gap-1 rounded-full border border-border bg-muted/40 p-1">
          {LEVERS.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={lever === l.id} onClick={() => setLever(l.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${lever === l.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{l.label}</button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{LEVERS.find((l) => l.id === lever)!.line}</p>
        {!enabled && <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">Saving is not switched on yet. You can still prepare and preview the signal here.</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left: what the change does, and the checks */}
          <section aria-label="Progress" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-4">
              {lever === 'fuel_switch'
                ? <SwapVisual oldFuel={d.oldFuel} newEnergy={d.newEnergy} switched={signal.periods.length > 0} displaced={signal.quantitySaved} />
                : <BandVisual points={band.pts} mean={band.mean} unit={unitOf(d.carrier)} outputUnit={d.outputUnit.trim()} saved={Math.max(0, signal.quantitySaved)} />}
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

          {/* Right: the project, its periods and the result */}
          <section aria-label="Your project" className="grid min-w-0 grid-cols-1 gap-6">
            {mine.length > 1 && (
              <label className="grid min-w-0 gap-1 text-sm">Your {lever === 'fuel_switch' ? 'fuel switches' : 'efficiency projects'}
                <select value={d.id ?? ''} onChange={(e) => { const p = mine.find((x) => x.id === e.target.value); setDrafts((all) => ({ ...all, [lever]: p ? toDraft(p) : blankDraft(lever) })); }} className={field}>
                  {mine.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="">New project</option>
                </select>
              </label>
            )}
            <div className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="grid min-w-0 gap-1 text-sm">Name<input value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder={lever === 'fuel_switch' ? 'Boiler 2 to PNG' : 'Compressor upgrade'} className={field} /></label>
              <label className="grid min-w-0 gap-1 text-sm">Equipment<input value={d.equipment} onChange={(e) => patch({ equipment: e.target.value })} placeholder={lever === 'fuel_switch' ? 'Steam boiler' : 'Air compressor'} className={field} /></label>
              {lever === 'fuel_switch' ? (<>
                <label className="grid min-w-0 gap-1 text-sm">Old fuel
                  <select value={d.oldFuel} onChange={(e) => patch({ oldFuel: e.target.value as Fuel })} className={field}>{OLD_FUELS.map((f) => <option key={f} value={f}>{ENERGY_LABEL[f]}</option>)}</select>
                </label>
                <label className="grid min-w-0 gap-1 text-sm">New energy
                  <select value={d.newEnergy} onChange={(e) => patch({ newEnergy: e.target.value as Energy })} className={field}>{NEW_ENERGY.filter((e) => e !== d.oldFuel).map((e) => <option key={e} value={e}>{ENERGY_LABEL[e]}</option>)}</select>
                </label>
              </>) : (
                <label className="grid min-w-0 gap-1 text-sm">Energy measured
                  <select value={d.carrier} onChange={(e) => patch({ carrier: e.target.value as Energy })} className={field}>{CARRIERS.map((e) => <option key={e} value={e}>{ENERGY_LABEL[e]} ({unitOf(e)})</option>)}</select>
                </label>
              )}
              <label className="grid min-w-0 gap-1 text-sm">Output unit{lever === 'fuel_switch' ? ' (optional)' : ''}<input value={d.outputUnit} onChange={(e) => patch({ outputUnit: e.target.value })} placeholder="tonne" maxLength={40} className={field} /></label>
              <label className="grid min-w-0 gap-1 text-sm">Changed on<input type="date" value={d.startedOn} onChange={(e) => patch({ startedOn: e.target.value })} className={field} /></label>
              <label className="grid min-w-0 gap-1 text-sm">Meter or measurement accuracy
                <select value={d.accuracy} onChange={(e) => patch({ accuracy: e.target.value })} className={field}>
                  <option value="0.5">Within 0.5%</option><option value="1">Within 1%</option><option value="2">Within 2%</option><option value="5">Within 5%</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">Replaced equipment scrapped or idle?
                <select value={d.retired} onChange={(e) => patch({ retired: e.target.value as Tri })} className={field}>
                  <option value="unsure">Not confirmed yet</option><option value="yes">Yes, not used anywhere</option><option value="no">No, it runs elsewhere</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">Registered under another carbon programme?
                <select value={d.registered} onChange={(e) => patch({ registered: e.target.value as Tri })} className={field}>
                  <option value="unsure">Not sure yet</option><option value="no">No</option><option value="yes">Yes</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">Additionality
                <select value={d.additionality} onChange={(e) => patch({ additionality: e.target.value as Draft['additionality'] })} className={field}>
                  <option value="not_assessed">Not assessed yet</option><option value="passed_with_evidence">Assessed, with evidence on file</option>
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Before the change</h2><span className="text-xs text-muted-foreground">{signal.baselineDays} days counted</span></div>
              {before.length ? rowList(before) : <p className="text-sm text-muted-foreground">A year of {lever === 'fuel_switch' ? `${ENERGY_LABEL[d.oldFuel].toLowerCase()} use` : 'energy and output'} before the change sets the baseline.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {before.length < 12 && <button type="button" onClick={fillBaseline} className="rounded-full border border-dashed border-primary/60 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">+ Add the 12 months before</button>}
                {before.length > 0 && <button type="button" onClick={addBefore} className="rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50">+ An earlier month</button>}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">After the change</h2><span className="text-xs text-muted-foreground">{signal.monitoringDays} days counted</span></div>
              {after.length ? rowList(after) : <p className="text-sm text-muted-foreground">{lever === 'fuel_switch' ? `Add the ${ENERGY_LABEL[d.newEnergy].toLowerCase()} used in each period, and any ${ENERGY_LABEL[d.oldFuel].toLowerCase()} still burned.` : 'Add energy and output for each period since the change.'}</p>}
              <button type="button" onClick={addAfter} className="mt-3 rounded-full border border-dashed border-primary/60 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">+ Add the next period</button>
            </div>

            <div className={`rounded-3xl border p-5 ${signal.status === 'ready' ? 'sol-ready border-primary bg-primary/5' : 'border-border bg-card'}`} aria-live="polite">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your signal</p>
              {signal.status === 'ready' ? (
                <>
                  <p className="mt-1 text-4xl font-semibold tabular-nums">{signal.conservativeTco2e} <span className="text-base font-normal">tCO₂e (conservative)</span></p>
                  <p className="text-sm text-muted-foreground">Central {signal.centralTco2e} tCO₂e ({signal.baselineTco2e} baseline less {signal.projectTco2e} after), {signal.conservativeDeductionPct}% lower for the conservative bounds · <span className="whitespace-nowrap">{signal.monitoringStart} to {signal.monitoringEnd}</span></p>
                </>
              ) : signal.status === 'invalid' && signal.periods.length ? (
                <p className="mt-1 text-lg font-medium">{signal.checks.find((c) => !c.pass && ['reduction', 'not_double_counted', 'no_leakage', 'no_overlap', 'output_range'].includes(c.id))?.detail ?? 'Complete the steps on the left to build the signal.'}</p>
              ) : (
                <p className="mt-1 text-lg font-medium">{signal.status === 'withheld'
                  ? `${fmt(Math.max(0, signal.quantitySaved))} ${signal.quantityUnit === 'litre' ? 'litres' : signal.quantityUnit} ${lever === 'fuel_switch' ? 'displaced' : 'saved'}. Tonnes appear when every check is complete.`
                  : 'Complete the steps on the left to build the signal.'}</p>
              )}
              {signal.notes.length > 0 && <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">{signal.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
              <p className="mt-3 text-xs text-muted-foreground">Method {signal.method.id} v{signal.method.version}: {signal.method.basis}. A signal for the offline credit process, not a credit.</p>
              {sessionLoading ? null : user ? (
                <button type="button" onClick={() => { void save(); }} disabled={saving || !enabled} className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? 'Saving...' : 'Save project and signal'}</button>
              ) : (
                <Link to="/auth" state={{ returnTo: `/reduction-signal?lever=${lever}` }} className="mt-4 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Sign in to save</Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Have rooftop solar? <Link to="/solar-signal" className="font-medium text-primary underline-offset-4 hover:underline">Open the solar signal</Link></p>
          </section>
        </div>
      </main>
    </div>
  );
}
