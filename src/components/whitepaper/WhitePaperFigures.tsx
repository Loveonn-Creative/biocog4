import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Prose } from './MathText';
import { sharedFactorUncertainty } from '@/lib/whitePaperMath';

// ---------------------------------------------------------------- Figure: uncertainty floor

const TICKS_X = [1, 2, 5, 10, 20, 50, 100];
const TABLE_N = [1, 2, 5, 10, 20, 50, 100];
const totalU = sharedFactorUncertainty;

/** Chart geometry for the width it is drawn at, so text stays at its real size on a phone. */
function geometry(width: number) {
  const W = Math.round(Math.min(640, Math.max(300, width)));
  const narrow = W < 480;
  const H = narrow ? 250 : 300, L = narrow ? 34 : 46, R = narrow ? 10 : 18, T = 14, B = 42;
  const PW = W - L - R, PH = H - T - B;
  return { W, H, L, R, T, B, PW, PH, narrow, xOf: (n: number) => L + (Math.log10(n) / 2) * PW };
}

function path(fn: (n: number) => number, xOf: (n: number) => number, yOf: (v: number) => number) {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const n = 10 ** (i / 60);
    pts.push(`${i ? 'L' : 'M'}${xOf(n).toFixed(1)},${yOf(fn(n)).toFixed(1)}`);
  }
  return pts.join('');
}

export function UncertaintyFigure() {
  const [uF, setUF] = useState(3);
  const [uA, setUA] = useState(5);
  const [n, setN] = useState(10);
  const [table, setTable] = useState(false);
  const ids = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { W, H, L, R, T, B, PW, PH, narrow, xOf } = geometry(width);

  const yMax = Math.max(6, Math.ceil(totalU(uF, uA, 1)));
  const yOf = (v: number) => T + PH - (v / yMax) * PH;
  const yTicks = useMemo(() => {
    const step = yMax <= 8 ? 1 : yMax <= 16 ? 2 : 5;
    const t: number[] = [];
    for (let v = 0; v <= yMax; v += step) t.push(v);
    return t;
  }, [yMax]);

  const total = totalU(uF, uA, n), act = uA / Math.sqrt(n);
  const totalPath = path((k) => totalU(uF, uA, k), xOf, yOf);
  const actPath = path((k) => uA / Math.sqrt(k), xOf, yOf);
  const yFloor = yOf(uF);
  // Direct labels: keep the activity label clear of the total label at n = 1.
  const yTotalLbl = yOf(totalU(uF, uA, 1)) - 8;
  const yActLbl = Math.max(yOf(uA) + 18, yTotalLbl + 16);
  const floorBelow = Math.abs(yOf(uA / 10) - yFloor) > 18 || yOf(uA / 10) < yFloor;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const frac = Math.min(1, Math.max(0, (x - L) / PW));
    setN(Math.max(1, Math.min(100, Math.round(10 ** (frac * 2)))));
  };

  return (
    <div className="wp-fig-body" ref={boxRef}>
      <div className="wp-controls wp-noprint">
        <label className="wp-slider">
          <span>Shared factor uncertainty <b>{uF.toFixed(1)}%</b></span>
          <input type="range" min={0} max={10} step={0.5} value={uF} onChange={(e) => setUF(Number(e.target.value))} />
        </label>
        <label className="wp-slider">
          <span>Activity uncertainty per line <b>{uA.toFixed(1)}%</b></span>
          <input type="range" min={0} max={15} step={0.5} value={uA} onChange={(e) => setUA(Number(e.target.value))} />
        </label>
        <label className="wp-slider">
          <span>Number of lines <b>{n}</b></span>
          <input type="range" min={1} max={100} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </label>
      </div>

      <div className="wp-legend" aria-hidden="true">
        <span><i className="wp-key wp-key-total" />Total</span>
        <span><i className="wp-key wp-key-act" />Activity-data error alone</span>
        <span><i className="wp-key wp-key-floor" />Shared factor error</span>
      </div>

      <p className="wp-readout" aria-live="polite">
        With <b>{n}</b> {n === 1 ? 'line' : 'lines'}: total <b>{total.toFixed(2)}%</b>, activity error alone {act.toFixed(2)}%, factor floor {uF.toFixed(2)}%.
      </p>

      {table ? (
        <table className="wp-table wp-table-keep">
          <thead><tr><th>Lines (n)</th><th>Total U</th><th>Activity alone</th><th>Factor floor</th></tr></thead>
          <tbody>
            {TABLE_N.map((k) => (
              <tr key={k}><td>{k}</td><td>{totalU(uF, uA, k).toFixed(2)}%</td><td>{(uA / Math.sqrt(k)).toFixed(2)}%</td><td>{uF.toFixed(2)}%</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="wp-chart"
          role="img"
          aria-labelledby={`${ids}-t`}
          onPointerMove={onMove}
          onPointerDown={onMove}
        >
          <title id={`${ids}-t`}>Relative uncertainty of the total falls from {totalU(uF, uA, 1).toFixed(1)}% at one line towards the {uF}% factor floor at 100 lines.</title>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={yOf(v)} y2={yOf(v)} className="wp-grid" />
              <text x={L - 8} y={yOf(v) + 4} textAnchor="end" className="wp-tick">{v}</text>
            </g>
          ))}
          {TICKS_X.map((k) => (
            <text key={k} x={xOf(k)} y={H - B + 18} textAnchor="middle" className="wp-tick">{k}</text>
          ))}
          <text x={L + PW / 2} y={H - 6} textAnchor="middle" className="wp-axis">{narrow ? 'Lines sharing one factor (log scale)' : 'Number of lines using the same emission factor (log scale)'}</text>
          <text x={10} y={T + PH / 2} textAnchor="middle" className="wp-axis" transform={`rotate(-90 10 ${T + PH / 2})`}>{narrow ? 'Uncertainty (%)' : 'Relative uncertainty (%)'}</text>

          <line x1={L} x2={W - R} y1={yFloor} y2={yFloor} className="wp-line-floor" />
          <path d={actPath} className="wp-line-act" />
          <path d={totalPath} className="wp-line-total" />

          <text x={xOf(1) + 8} y={yTotalLbl} className="wp-dlabel">Total</text>
          <text x={xOf(1.15) + 8} y={yActLbl} className="wp-dlabel">{narrow ? 'Activity error alone' : 'Activity error alone (averages out)'}</text>
          <text x={W - R} y={floorBelow ? yFloor + 16 : yFloor - 8} textAnchor="end" className="wp-dlabel">{narrow ? 'Factor floor' : 'Shared factor error never averages out'}</text>

          <line x1={xOf(n)} x2={xOf(n)} y1={T} y2={T + PH} className="wp-cross" />
          <circle cx={xOf(n)} cy={yOf(act)} r={5} className="wp-dot wp-dot-act" />
          <circle cx={xOf(n)} cy={yOf(total)} r={5} className="wp-dot wp-dot-total" />
        </svg>
      )}
      <button type="button" className="wp-linkbtn wp-noprint" onClick={() => setTable(!table)}>
        {table ? 'Show as chart' : 'Show as table'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Figure: data model

const ENTITIES = [
  { id: 'document', name: 'Document', holds: 'Full-file hash, type, dates, supplier and tax identifiers, extraction output, source reference', links: 'One or more line items' },
  { id: 'line', name: 'Line item', holds: 'Description, tax or classification code, quantity, unit, amount', links: 'One emission line' },
  { id: 'emission', name: 'Emission line', holds: 'Scope, category, activity quantity and unit, result with low, central and high values, status, flags, quality score', links: 'One factor; one ledger entry' },
  { id: 'factor', name: 'Emission factor', holds: 'Value, unit, geography, gas basis, GWP set, publisher, source document, year, validity period, version', links: 'Many emission lines' },
  { id: 'ledger', name: 'Ledger entry', holds: 'Hashes, factor and methodology version in force, status, reviewer actions', links: 'Emission line; previous entry' },
] as const;
type EntityId = typeof ENTITIES[number]['id'];

export function DataModelFigure() {
  const [sel, setSel] = useState<EntityId>('emission');
  const e = ENTITIES.find((x) => x.id === sel)!;
  const node = (id: EntityId, extra = '') => {
    const ent = ENTITIES.find((x) => x.id === id)!;
    return (
      <button type="button" className={`wp-ent wp-ent-${id} ${sel === id ? 'wp-ent-on' : ''} ${extra}`} aria-pressed={sel === id} onClick={() => setSel(id)}>
        {ent.name}
      </button>
    );
  };
  return (
    <div className="wp-fig-body">
      <div className="wp-er">
        {node('document')}
        <span className="wp-rel wp-rel-a" aria-hidden="true"><span>1 → many</span></span>
        {node('line')}
        <span className="wp-rel wp-rel-b" aria-hidden="true"><span>1 → 1</span></span>
        {node('emission')}
        <span className="wp-rel wp-rel-c" aria-hidden="true"><span>many ← 1</span></span>
        {node('factor')}
        <span className="wp-rel wp-rel-d" aria-hidden="true"><span>1 → 1</span></span>
        {node('ledger')}
        <span className="wp-rel-self" aria-hidden="true">↺ previous entry</span>
      </div>
      <div className="wp-ent-detail" aria-live="polite">
        <p className="wp-ent-title">{e.name}</p>
        <p><span className="wp-ent-k">Holds</span> {e.holds}</p>
        <p><span className="wp-ent-k">Linked to</span> {e.links}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Figure: document flow

const STEPS = [
  { n: 1, name: 'Upload', sub: 'encrypted transfer', ai: false, detail: 'The file is sent to the processing service over an encrypted connection. Signed-in requests are validated server-side; unauthenticated use is limited to a separate, time-limited guest session.' },
  { n: 2, name: 'Hash and duplicates', sub: 'SHA-256 of full file', ai: false, detail: 'The full file is fingerprinted with SHA-256 (equation {eq:hash}). A file already processed is not reprocessed, so the same document cannot be counted twice.' },
  { n: 3, name: 'Extraction', sub: 'reads fields from image', ai: true, detail: 'The only step that uses a language model. It returns a fixed schema at temperature 0 (equation {eq:argmax}), absent fields are null, long PDFs are read in parts of 10 pages (equation {eq:split}), and the output is treated as untrusted input.' },
  { n: 4, name: 'Validation', sub: 'schema and consistency', ai: false, detail: 'Every field is checked before use: units are converted with fixed multipliers (equation {eq:units}) and quantity × rate must match the printed amount within rounding (equation {eq:rounding}). Failures block calculation.' },
  { n: 5, name: 'Classify', sub: 'code lookup, unit agrees', ai: false, detail: 'Rule-based mapping by full tax-code match first, then whole-word keyword match only when the unit agrees. Ambiguous or unmatched items are marked for review, never guessed.' },
  { n: 6, name: 'Calculation', sub: 'A × EF, range, score', ai: false, detail: 'Registry factors are applied by versioned code (equation {eq:core}), ranges are propagated (equation {eq:total-uncertainty}) and each line is scored (equation {eq:quality}). Same input, same output.' },
  { n: 7, name: 'Review and storage', sub: 'human reviews flagged lines', ai: false, detail: 'Flagged lines go to a reviewer; every override records who, when, what changed and why. Results are stored with the full trail and a hash-chained ledger entry.' },
];

export function FlowFigure() {
  const [sel, setSel] = useState(3);
  const s = STEPS.find((x) => x.n === sel)!;
  return (
    <div className="wp-fig-body">
      <ol className="wp-flow">
        {STEPS.map((st) => (
          <li key={st.n}>
            <button type="button" className={`wp-step ${st.ai ? 'wp-step-ai' : ''} ${sel === st.n ? 'wp-step-on' : ''}`} aria-pressed={sel === st.n} onClick={() => setSel(st.n)}>
              <span className="wp-step-name"><b>{st.n}</b> {st.name}</span>
              <span className="wp-step-sub">{st.sub}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="wp-legend">
        <span><i className="wp-key-box wp-key-ai" />Language model (reads text only, output treated as untrusted input)</span>
        <span><i className="wp-key-box" />Deterministic, versioned code (same input gives the same output)</span>
      </div>
      <div className={`wp-step-detail ${s.ai ? 'wp-step-detail-ai' : ''}`} aria-live="polite">
        <p className="wp-ent-title">Step {s.n}. {s.name}{s.ai ? ' (language model)' : ''}</p>
        <p><Prose text={s.detail} /></p>
      </div>
    </div>
  );
}
