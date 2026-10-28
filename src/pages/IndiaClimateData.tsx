import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { analyticsEvents } from '@/lib/analytics';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy, Download } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { prefersReducedMotion } from '@/components/services/motion/kit';
import {
  CAPACITY_2026, CAPACITY_TOTAL_MW, CBAM_COUNTS_INDIRECT, CBAM_GOODS, CCTS_SECTORS, DATASETS, DATA_PATH, DATA_UPDATED,
  FUEL_CONVERSIONS, GAS_FACTS, GRID_MARGINS_2025_26, GRID_MARGIN_SOURCE, GRID_SERIES, GRID_SOURCE, SENSEIBLE_GRID_FACTOR, cbamWithMarkup,
  type CbamSector, type DataSource,
} from '@/data/indiaClimateData';
import './dataHub.css';

// India climate data. Pattern: the data is the page. Each dataset carries its
// own interaction: the grid factor line draws in and can be scrubbed year by
// year; generation flips between FY 2013-14 and FY 2025-26; capacity and
// generation stack side by side; CCTS targets add the draft steel schedule on
// a toggle; CBAM values recompute by product and import year; fuels convert
// both ways. Reduced motion shows every final state, still.

const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const ds = (id: string) => DATASETS.find((d) => d.id === id)!;
const UPDATED_LABEL = new Date(`${DATA_UPDATED}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function downloadCsv(id: string) {
  const d = ds(id);
  const url = URL.createObjectURL(new Blob([d.csv()], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `senseible-${id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  analyticsEvents.resourceDownload(`india-data-${id}`, 'csv', 'india-climate-data');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Sources({ sources, note }: { sources: DataSource[]; note?: string }) {
  return (
    <details className="dh-source mt-4 text-sm text-muted-foreground">
      <summary className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">Source</summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((s) => (
          <li key={s.url + s.where}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{s.label}</a>, {s.where}.
          </li>
        ))}
      </ul>
      {note && <p className="mt-2">{note}</p>}
    </details>
  );
}

function Dataset({ id, kicker, title, lede, children, note, extraSources = [] }: { id: string; kicker: string; title: string; lede: ReactNode; children: ReactNode; note?: string; extraSources?: DataSource[] }) {
  const d = ds(id);
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 md:py-20" aria-labelledby={`${id}-h`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{kicker}</p>
            <h2 id={`${id}-h`} className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h2>
            <p className="mt-3 text-muted-foreground">{lede}</p>
          </div>
          <button type="button" onClick={() => downloadCsv(id)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Download className="h-4 w-4" aria-hidden="true" /> CSV
          </button>
        </div>
        <div className="mt-8">{children}</div>
        <Sources sources={[...extraSources, ...d.sources]} note={note} />
      </div>
    </section>
  );
}

function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, seen };
}

// ---------------------------------------------------------------------------
// Hero: the grid factor line draws in; the latest value counts down to 0.675.

const PAD = { l: 40, r: 14, t: 16, b: 30 };
const YMIN = 0.65, YMAX = 0.80;

function HeroChart() {
  const last = GRID_SERIES.length - 1;
  const [sel, setSel] = useState(last);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? GRID_SERIES[last].factor : GRID_SERIES[0].factor));
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [len, setLen] = useState(2000);
  // Drawn at the container's real width so axis text stays 11px on every screen.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(Math.min(320, Math.max(200, W * 0.42)));
  const xAt = (i: number) => PAD.l + (i / (GRID_SERIES.length - 1)) * (W - PAD.l - PAD.r);
  const yAt = (v: number) => PAD.t + (1 - (v - YMIN) / (YMAX - YMIN)) * (H - PAD.t - PAD.b);
  const step = W < 520 ? 4 : 2;

  const d = useMemo(() => GRID_SERIES.map((y, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(y.factor).toFixed(1)}`).join(' '), [W, H]); // eslint-disable-line react-hooks/exhaustive-deps
  const area = `${d} L${xAt(last).toFixed(1)},${H - PAD.b} L${xAt(0).toFixed(1)},${H - PAD.b} Z`;

  useEffect(() => { if (pathRef.current) setLen(Math.ceil(pathRef.current.getTotalLength())); }, [d]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const from = GRID_SERIES[0].factor, to = GRID_SERIES[last].factor, start = performance.now() + 200, dur = 1800;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      setShown(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [last]);

  const pick = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * last);
    setSel(Math.min(last, Math.max(0, i)));
  };

  const y = GRID_SERIES[sel];
  const isLatest = sel === last;
  const value = isLatest ? shown : y.factor;

  return (
    <div ref={boxRef}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight md:text-7xl" aria-live="polite">{value.toFixed(3)}</p>
        <p className="pb-2 text-sm text-muted-foreground">t CO2 per MWh of grid electricity<br /><span className="font-medium text-foreground">FY {y.fy}</span>{isLatest ? ', the lowest since the series began' : ''}</p>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="dh-hero-chart mt-6 h-auto w-full"
        role="img"
        aria-label={`India grid emission factor from FY 2013-14 (${GRID_SERIES[0].factor}) to FY 2025-26 (${GRID_SERIES[last].factor}) t CO2 per MWh`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setSel(last)}
      >
        {[0.65, 0.70, 0.75, 0.80].map((t) => (
          <g key={t}>
            <line className="dh-gridline" x1={PAD.l} x2={W - PAD.r} y1={yAt(t)} y2={yAt(t)} />
            <text x={PAD.l - 8} y={yAt(t) + 4} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        {GRID_SERIES.map((g, i) => ((i % step === 0 && last - i >= step / 2) || i === last) && (
          <text key={g.fy} x={xAt(i)} y={H - 10} textAnchor={i === last ? 'end' : i === 0 ? 'start' : 'middle'}>{g.fy.slice(2)}</text>
        ))}
        <path className="dh-area dh-fade" d={area} />
        <path ref={pathRef} className="dh-trend dh-draw" d={d} style={{ ['--len' as string]: len }} />
        <line className="dh-cross" x1={xAt(sel)} x2={xAt(sel)} y1={PAD.t} y2={H - PAD.b} />
        <circle className="dh-dot" cx={xAt(sel)} cy={yAt(y.factor)} r={6} />
      </svg>
      <label className="mt-3 block text-sm text-muted-foreground">
        <span className="sr-only">Choose a financial year</span>
        <input
          type="range" min={0} max={last} step={1} value={sel}
          onChange={(e) => setSel(Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
          aria-valuetext={`FY ${y.fy}: ${y.factor} t CO2 per MWh`}
        />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Then and now: one toggle, the generation bar and the CO2 total re-draw.

function ThenNow() {
  const first = GRID_SERIES[0], latest = GRID_SERIES[GRID_SERIES.length - 1];
  const [now, setNow] = useState(true);
  const y = now ? latest : first;
  const max = latest.totalBU;
  const reShare = (y.reBU / y.totalBU) * 100;
  return (
    <div>
      <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Year">
        {[first, latest].map((g) => (
          <button key={g.fy} type="button" aria-pressed={(g === latest) === now} onClick={() => setNow(g === latest)} className="dh-chip rounded-full border border-transparent px-4 py-1.5 text-sm font-medium">FY {g.fy}</button>
        ))}
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Net generation, billion units</p>
          <div className="mt-2 h-10 w-full rounded-md bg-muted/60">
            <div className="dh-bar flex h-full overflow-hidden rounded-md" style={{ width: `${(y.totalBU / max) * 100}%` }}>
              <div className="h-full" style={{ flexGrow: y.totalBU - y.reBU, background: 'var(--dh-alt)' }} />
              <div className="h-full border-l-2 border-card" style={{ flexGrow: y.reBU, background: 'var(--dh-s6)' }} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--dh-alt)' }} />Other sources {fmt(y.totalBU - y.reBU)} BU</span>
            <span className="inline-flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--dh-s6)' }} />Renewables {fmt(y.reBU)} BU ({reShare.toFixed(1)}%)</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <div><dt className="text-sm text-muted-foreground">Power-sector CO2</dt><dd className="font-mono text-3xl font-semibold tabular-nums">{fmt(y.co2Mt)} <span className="text-base font-normal text-muted-foreground">Mt</span></dd></div>
          <div><dt className="text-sm text-muted-foreground">Grid factor</dt><dd className="font-mono text-3xl font-semibold tabular-nums">{y.factor.toFixed(3)}</dd></div>
        </dl>
      </div>
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Generation grew {Math.round((latest.totalBU / first.totalBU - 1) * 100)}% and emissions {Math.round((latest.co2Mt / first.co2Mt - 1) * 100)}%. Renewables grew almost six times. That gap is why each unit now carries less CO2.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capacity against generation: two stacks fill on scroll.

const CAP_COLOURS: Record<string, string> = { coal: 'var(--dh-s1)', other: 'var(--dh-s2)', gas: 'var(--dh-s3)', nuclear: 'var(--dh-s4)', hydro: 'var(--dh-s5)', re: 'var(--dh-s6)' };
const CAP_ORDER = ['coal', 'other', 'gas', 'nuclear', 'hydro', 're'];

function CapacityVsGeneration() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const latest = GRID_SERIES[GRID_SERIES.length - 1];
  const slices = CAP_ORDER.map((k) => CAPACITY_2026.find((c) => c.key === k)!);
  const reCap = (CAPACITY_2026.find((c) => c.key === 're')!.mw / CAPACITY_TOTAL_MW) * 100;
  const reGen = (latest.reBU / latest.totalBU) * 100;
  return (
    <div ref={ref}>
      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between text-sm"><span className="font-medium">Installed capacity, 31 March 2026</span><span className="text-muted-foreground">{fmt(CAPACITY_TOTAL_MW)} MW</span></div>
          <div className="mt-2 flex h-9 w-full gap-[2px] overflow-hidden rounded-md">
            {slices.map((s) => <div key={s.key} className="dh-seg h-full" style={{ flexGrow: seen ? s.mw : 0.0001, flexBasis: 0, background: CAP_COLOURS[s.key] }} title={`${s.label}: ${fmt(s.mw)} MW`} />)}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm"><span className="font-medium">Net generation, FY 2025-26</span><span className="text-muted-foreground">{fmt(latest.totalBU)} BU</span></div>
          <div className="mt-2 flex h-9 w-full gap-[2px] overflow-hidden rounded-md">
            <div className="dh-seg h-full" style={{ flexGrow: seen ? latest.totalBU - latest.reBU : 0.0001, flexBasis: 0, background: 'var(--dh-alt)' }} title={`Other sources: ${fmt(latest.totalBU - latest.reBU)} BU`} />
            <div className="dh-seg h-full" style={{ flexGrow: seen ? latest.reBU : 0.0001, flexBasis: 0, background: 'var(--dh-s6)' }} title={`Renewables: ${fmt(latest.reBU)} BU`} />
          </div>
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 md:grid-cols-3">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CAP_COLOURS[s.key] }} />{s.label} <span className="ml-auto font-mono tabular-nums text-muted-foreground sm:ml-0">{fmt(s.mw)} MW · {((s.mw / CAPACITY_TOTAL_MW) * 100).toFixed(1)}%</span></li>
        ))}
        <li className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'var(--dh-alt)' }} />Other sources (generation bar)</li>
      </ul>
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">Renewables are {reCap.toFixed(1)}% of capacity but {reGen.toFixed(1)}% of the electricity. Solar and wind run fewer hours than coal, so capacity overstates what they supply.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CCTS: plants with intensity targets; the draft steel schedule on a toggle.

function CctsTargets() {
  const [withDraft, setWithDraft] = useState(false);
  const { ref, seen } = useInView<HTMLDivElement>();
  const rows = CCTS_SECTORS.filter((s) => withDraft || !s.draft);
  const max = Math.max(...CCTS_SECTORS.map((s) => s.plants));
  const total = rows.reduce((a, s) => a + s.plants, 0);
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-mono text-4xl font-semibold tabular-nums">{fmt(total)} <span className="text-base font-normal text-muted-foreground">plants</span></p>
        <button type="button" aria-pressed={withDraft} onClick={() => setWithDraft((v) => !v)} className="dh-chip rounded-full border border-border px-4 py-1.5 text-sm font-medium">
          {withDraft ? 'Including' : 'Add'} the draft steel targets
        </button>
      </div>
      <ul className="mt-6 space-y-2.5">
        {rows.map((s) => (
          <li key={s.sector} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr]">
            <span className="truncate">{s.sector}{s.draft ? ' (draft)' : ''}</span>
            <span className="flex items-center gap-2">
              <span className={`dh-bar block h-5 rounded-r ${s.draft ? 'dh-hatch' : ''}`} style={{ width: seen ? `${(s.plants / max) * 85}%` : '0%', background: s.draft ? undefined : 'var(--dh-line)' }} />
              <span className="font-mono tabular-nums">{s.plants}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">Every target is a GHG emission intensity, tonnes CO2e per tonne of product, against a 2023-24 baseline. A plant not listed has no target, but its buyers can still ask for its energy data.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CBAM: pick a product and a year; the value with mark-up recomputes.

const SECTORS: CbamSector[] = ['Iron and steel', 'Aluminium', 'Cement', 'Fertilisers', 'Hydrogen'];

function CbamValues() {
  const [cn, setCn] = useState('7214 20 00');
  const [year, setYear] = useState<2026 | 2027 | 2028>(2026);
  const g = CBAM_GOODS.find((x) => x.cn === cn)!;
  const counted = CBAM_COUNTS_INDIRECT.includes(g.sector) ? g.total : g.direct;
  const withMark = cbamWithMarkup(g, year);
  const scale = Math.max(...CBAM_GOODS.filter((x) => x.sector !== 'Hydrogen').map((x) => cbamWithMarkup(x, 2028)));
  const barMax = g.sector === 'Hydrogen' ? cbamWithMarkup(g, 2028) : scale;
  return (
    <div className="grid gap-8 md:grid-cols-5">
      <div className="space-y-4 md:col-span-2">
        <label className="block text-sm font-medium">
          Product
          <select value={cn} onChange={(e) => setCn(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-base">
            {SECTORS.map((s) => (
              <optgroup key={s} label={s}>
                {CBAM_GOODS.filter((x) => x.sector === s).map((x) => <option key={x.cn} value={x.cn}>{x.name} (CN {x.cn})</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div>
          <p className="text-sm font-medium">Year of import</p>
          <div className="mt-1.5 inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Year of import">
            {([2026, 2027, 2028] as const).map((y) => (
              <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className="dh-chip rounded-full border border-transparent px-4 py-1.5 text-sm font-medium">{y === 2028 ? '2028 on' : y}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="md:col-span-3">
        <p className="text-sm text-muted-foreground">Default value the EU importer uses without actual data</p>
        <p className="mt-1 font-mono text-5xl font-semibold tabular-nums" aria-live="polite">{withMark.toFixed(3)} <span className="text-base font-normal text-muted-foreground">t CO2e per tonne</span></p>
        <div className="mt-4 flex h-6 w-full gap-[2px] overflow-hidden rounded-md bg-muted/60" aria-hidden="true">
          <div className="dh-bar h-full" style={{ width: `${(counted / barMax) * 100}%`, background: 'var(--dh-line)' }} />
          <div className="dh-bar h-full dh-hatch" style={{ width: `${((withMark - counted) / barMax) * 100}%` }} />
        </div>
        <p className="mt-3 text-sm">
          {fmt(counted, 3)} listed{g.indirect !== null && CBAM_COUNTS_INDIRECT.includes(g.sector) ? ` (${fmt(g.direct, 3)} direct + ${fmt(g.indirect, 3)} indirect)` : ', direct emissions only'} plus a {g.sector === 'Fertilisers' ? '1%' : `${Math.round((year - 2025) * 10)}%`} mark-up.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">A plant with verified actual data usually comes in lower, and only a verified figure lets the importer use it.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fuels: tonnes to litres and back, at 29.5 C or corrected to 15 C.

function FuelConverter() {
  const [key, setKey] = useState('diesel');
  const [at15, setAt15] = useState(true);
  const [tonnes, setTonnes] = useState('10');
  const [litres, setLitres] = useState('');
  const f = FUEL_CONVERSIONS.find((x) => x.key === key)!;
  const perTonne = f.klPerTonne * 1000 * (at15 ? f.to15C : 1);
  const t = Number(tonnes);
  const l = Number(litres);
  const shownLitres = tonnes !== '' && Number.isFinite(t) ? fmt(t * perTonne) : litres;
  const shownTonnes = litres !== '' && tonnes === '' && Number.isFinite(l) ? fmt(l / perTonne, 3) : tonnes;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fuel">
          {FUEL_CONVERSIONS.map((x) => (
            <button key={x.key} type="button" aria-pressed={key === x.key} onClick={() => setKey(x.key)} className="dh-chip rounded-full border border-border px-3 py-1.5 text-sm">{x.fuel}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Tonnes
            <input inputMode="decimal" value={shownTonnes} onChange={(e) => { setTonnes(e.target.value); setLitres(''); }} className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 font-mono text-base tabular-nums" />
          </label>
          <label className="text-sm font-medium">Litres
            <input inputMode="decimal" value={shownLitres} onChange={(e) => { setLitres(e.target.value.replace(/,/g, '')); setTonnes(''); }} className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 font-mono text-base tabular-nums" />
          </label>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Temperature basis">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" aria-pressed={at15 === v} onClick={() => setAt15(v)} className="dh-chip rounded-full border border-transparent px-4 py-1.5 text-sm font-medium">{v ? 'At 15 C (bulk invoices)' : 'At 29.5 C (PPAC table)'}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">1 tonne of {f.fuel.toLowerCase()}</p>
        <p className="mt-1 font-mono text-5xl font-semibold tabular-nums">{fmt(perTonne)} <span className="text-base font-normal text-muted-foreground">litres</span></p>
        <p className="mt-2 text-sm text-muted-foreground">{fmt(f.klPerTonne, 4)} kilolitres at 29.5 C; multiply by {f.to15C} for volume at 15 C. A density on your invoice or test certificate beats any table.</p>
        <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          {GAS_FACTS.map((g) => (
            <div key={g.label} className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted-foreground">{g.label}</dt><dd className="font-medium">{g.value}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CiteThis() {
  const [copied, setCopied] = useState(false);
  const text = `Senseible, India climate data (updated ${UPDATED_LABEL}), https://senseible.earth${DATA_PATH}. Figures from CEA, BEE, the European Commission and PPAC as listed with each dataset.`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the text stays selectable */ }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium">Cite this page</p>
      <p className="mt-2 select-all text-sm text-muted-foreground">{text}</p>
      <button type="button" onClick={copy} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied ? 'Copied' : 'Copy citation'}
      </button>
    </div>
  );
}

export default function IndiaClimateData() {
  const meta = STATIC_PAGE_META[DATA_PATH];
  return (
    <div className="dh-root min-h-screen overflow-x-hidden bg-background text-foreground">
      <SEOHead title={meta.title} description={meta.description} canonical={DATA_PATH} breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'India climate data', url: DATA_PATH }]} />
      <Navigation />

      <header className="pb-14 pt-28 md:pb-20 md:pt-36">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">India climate data · updated {UPDATED_LABEL}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">A unit of India's grid power now carries {Math.round((1 - GRID_SERIES[GRID_SERIES.length - 1].factor / GRID_SERIES[0].factor) * 100)}% less CO2 than in FY 2013‑14. Here is the data.</h1>
          <div className="mt-10"><HeroChart /></div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            CEA's weighted average including renewables. FY 2025-26 margins: operating {GRID_MARGINS_2025_26.om}, build {GRID_MARGINS_2025_26.bm}, combined {GRID_MARGINS_2025_26.cm}. Senseible's calculator uses {SENSEIBLE_GRID_FACTOR.value.toFixed(3)}, the FY {SENSEIBLE_GRID_FACTOR.fy} figure.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadCsv('grid-emission-factor')} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"><Download className="h-4 w-4" aria-hidden="true" />Download the series</button>
            <a href="#cbam-default-values-india" className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium hover:border-primary/60">CBAM values for Indian goods</a>
          </div>
          <Sources sources={[GRID_SOURCE, GRID_MARGIN_SOURCE]} note="From FY 2022-23 the figures are adjusted for cross-border trade and include power fed in by grid-connected captive plants." />
        </div>
      </header>

      <Dataset id="installed-capacity" extraSources={[GRID_SOURCE]} kicker="Why the line falls" title="Generation nearly doubled. Emissions did not." lede="Flip between the first and latest year in CEA's series." note="From FY 2022-23, CEA adjusts totals for cross-border trade and includes power that grid-connected captive plants feed in, so early and recent years are not built in exactly the same way.">
        <ThenNow />
        <div className="mt-14"><CapacityVsGeneration /></div>
      </Dataset>

      <Dataset id="ccts-plants" kicker="Carbon Credit Trading Scheme" title="Who has a carbon intensity target" lede="Plants named in the Gazette schedules, by sector. Iron and steel is still a draft." note="Counts are unique registration numbers in each schedule, counted by Senseible; the government has not published a total.">
        <CctsTargets />
      </Dataset>

      <Dataset id="cbam-default-values-india" kicker="EU CBAM" title="The default value your EU buyer falls back on" lede="Pick a product made in India and the year it reaches the EU.">
        <CbamValues />
      </Dataset>

      <Dataset id="fuel-conversions" kicker="Fuel conversions" title="Tonnes to litres, the way PPAC counts them" lede="Type in either box. Switch to 15 C for bulk invoices.">
        <FuelConverter />
      </Dataset>

      <section className="border-t border-border py-14 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Your own bills, turned into these numbers</h2>
            <p className="mt-3 text-muted-foreground">Upload one electricity bill or fuel invoice and see its CO2, with the factor and the source line it came from. Free, no sign-up.</p>
            <Link to="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Read a bill <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <CiteThis />
        </div>
      </section>

      <Footer />
    </div>
  );
}
