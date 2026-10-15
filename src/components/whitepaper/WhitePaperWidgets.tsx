import { useEffect, useState } from 'react';
import { roundingCheck } from '@/lib/whitePaperMath';

const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Up to d decimals, trailing zeros dropped (114,108.125 not 114,108.1250). */
const fmtUpTo = (v: number, d: number) => v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });

/** Illustration of the location-based and market-based Scope 2 equations with the paper's example values. */
export function Scope2Widget() {
  const total = 10000, grid = 0.8, residual = 0.9;
  const [covered, setCovered] = useState(6000);
  const location = total * grid;
  const market = (total - covered) * residual;
  const max = total * Math.max(grid, residual);
  return (
    <div className="wp-widget">
      <p className="wp-widget-title">Try it: move the contractual cover</p>
      <label className="wp-slider">
        <span>kWh covered by an instrument with factor 0 <b>{fmt(covered)} of {fmt(total)} kWh</b></span>
        <input type="range" min={0} max={total} step={500} value={covered} onChange={(e) => setCovered(Number(e.target.value))} />
      </label>
      <div className="wp-bars">
        <div className="wp-bar-row">
          <span className="wp-bar-label">Location-based</span>
          <span className="wp-bar-track"><span className="wp-bar-fill wp-bar-neutral" style={{ width: `${(location / max) * 100}%` }} /></span>
          <span className="wp-bar-val">{fmt(location)} kg</span>
        </div>
        <div className="wp-bar-row">
          <span className="wp-bar-label">Market-based</span>
          <span className="wp-bar-track"><span className="wp-bar-fill wp-bar-primary" style={{ width: `${(market / max) * 100}%` }} /></span>
          <span className="wp-bar-val">{fmt(market)} kg</span>
        </div>
      </div>
      <p className="wp-widget-note">{fmt(total - covered)} kWh uncovered × residual {residual.toFixed(2)} = {fmt(market)} kgCO₂e. The location-based figure does not change: it uses the grid average ({grid.toFixed(2)}) for all {fmt(total)} kWh. Illustrative factors from the example above.</p>
    </div>
  );
}

/** Splitting a bill across two factor validity periods; a missing factor stays empty. */
export function ProrationWidget() {
  const d = 30, A = 1500, ef1 = 0.8, ef2 = 0.7;
  const [d1, setD1] = useState(12);
  const [missing, setMissing] = useState(false);
  const a1 = (A * d1) / d, a2 = A - a1;
  const e = missing && a2 > 0 ? null : a1 * ef1 + a2 * (missing ? 0 : ef2);
  return (
    <div className="wp-widget">
      <p className="wp-widget-title">Try it: a {d}-day bill of {fmt(A)} kWh across two factor periods</p>
      <label className="wp-slider">
        <span>Days in the first period <b>{d1} of {d}</b></span>
        <input type="range" min={0} max={d} step={1} value={d1} onChange={(ev) => setD1(Number(ev.target.value))} />
      </label>
      <div className="wp-split" aria-hidden="true">
        <span className="wp-split-a" style={{ flexGrow: d1 }}>{d1 > 3 ? `${Math.round((d1 / d) * 100)}%` : ''}</span>
        <span className={`wp-split-b ${missing ? 'wp-split-missing' : ''}`} style={{ flexGrow: d - d1 }}>{d - d1 > 3 ? `${Math.round(((d - d1) / d) * 100)}%` : ''}</span>
      </div>
      <p className="wp-widget-note">
        Period 1: {fmt(a1)} kWh × {ef1.toFixed(2)} &nbsp;·&nbsp; Period 2: {fmt(a2)} kWh × {missing ? 'no factor' : ef2.toFixed(2)}
      </p>
      <p className="wp-widget-result">
        E = {e === null ? <b>no figure</b> : <b>{fmt(e)} kgCO₂e</b>}
        {e === null ? <span className="wp-widget-note"> Left empty and flagged, not counted as 0.</span> : null}
      </p>
      <label className="wp-check wp-noprint">
        <input type="checkbox" checked={missing} onChange={(ev) => setMissing(ev.target.checked)} />
        <span>No factor published for period 2</span>
      </label>
      <p className="wp-widget-note">Illustrative factors 0.80 and 0.70.</p>
    </div>
  );
}

/** The rounding-bounded consistency check on a printed invoice line. */
export function RoundingWidget() {
  const [q, setQ] = useState('1,250.50');
  const [r, setR] = useState('91.25');
  const [a, setA] = useState('114,108.13');
  const res = roundingCheck(q, r, a);
  const preset = (pq: string, pr: string, pa: string) => { setQ(pq); setR(pr); setA(pa); };
  return (
    <div className="wp-widget">
      <p className="wp-widget-title">Try it: check an invoice line</p>
      <div className="wp-inputs">
        <label><span>Quantity q</span><input inputMode="decimal" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label><span>Rate r</span><input inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></label>
        <label><span>Printed amount a</span><input inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /></label>
      </div>
      <div className="wp-chips wp-noprint">
        <button type="button" onClick={() => preset('1,250.50', '91.25', '114,108.13')}>Paper example</button>
        <button type="button" onClick={() => preset('1,250.50', '91.25', '114,180.13')}>Misread digit</button>
        <button type="button" onClick={() => preset('125', '91.25', '11,406')}>Amount in whole rupees</button>
      </div>
      {res ? (
        <p className={`wp-widget-result ${res.pass ? 'wp-pass' : 'wp-fail'}`} aria-live="polite">
          q × r = {fmtUpTo(res.product, res.dq + res.dr)}; gap {fmtUpTo(res.gap, Math.min(6, res.dq + res.dr))}; τ = {fmtUpTo(res.tau, 6)}.{' '}
          <b>{res.pass ? 'Passes: the gap is within what rounding alone can cause.' : 'Fails: not calculated, sent to a reviewer.'}</b>
        </p>
      ) : (
        <p className="wp-widget-result wp-fail" aria-live="polite">Enter three positive numbers.</p>
      )}
    </div>
  );
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const LINE = 'Diesel (HSD) | 100 L | 92.50 | 9,250.00';
const LEDGER_REST = ['Factor pinned: diesel, methodology v1', 'Status: reviewed, no override'];
const GENESIS = '0'.repeat(64);

async function chain(first: string): Promise<string[]> {
  const out: string[] = [];
  let prev = GENESIS;
  for (const e of [first, ...LEDGER_REST]) { prev = await sha256Hex(prev + e); out.push(prev); }
  return out;
}

/** SHA-256 avalanche and a three-entry hash chain, computed in the browser. */
export function HashWidget() {
  const [text, setText] = useState(LINE);
  const [orig, setOrig] = useState<{ h: string; chain: string[] } | null>(null);
  const [now, setNow] = useState<{ h: string; chain: string[] } | null>(null);
  const supported = typeof crypto !== 'undefined' && !!crypto.subtle;

  useEffect(() => {
    if (!supported) return;
    void Promise.all([sha256Hex(LINE), chain(LINE)]).then(([h, c]) => setOrig({ h, chain: c }));
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    let live = true;
    void Promise.all([sha256Hex(text), chain(text)]).then(([h, c]) => { if (live) setNow({ h, chain: c }); });
    return () => { live = false; };
  }, [text, supported]);

  if (!supported) return null;
  const changed = orig && now ? [...now.h].filter((c, i) => c !== orig.h[i]).length : 0;
  const flip = () => setText((t) => t.replace(/(\d)(?!.*\d)/, (dgt) => String((Number(dgt) + 1) % 10)));

  return (
    <div className="wp-widget">
      <p className="wp-widget-title">Try it: change one character</p>
      <label className="wp-inputs-wide">
        <span>Ledger entry 1 (an invoice line)</span>
        <input value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </label>
      <div className="wp-chips wp-noprint">
        <button type="button" onClick={flip}>Change the last digit</button>
        <button type="button" onClick={() => setText(LINE)}>Reset</button>
      </div>
      {now && orig ? (
        <>
          <p className="wp-hash" aria-label="SHA-256 of entry 1">
            {[...now.h].map((c, i) => <span key={i} className={c !== orig.h[i] ? 'wp-hash-diff' : ''}>{c}</span>)}
          </p>
          <p className="wp-widget-note" aria-live="polite">
            {changed === 0 ? 'Same text, same fingerprint.' : `${changed} of 64 hex digits changed.`}
          </p>
          <ol className="wp-chain">
            {now.chain.map((h, i) => {
              const ok = h === orig.chain[i];
              return (
                <li key={i} className={ok ? 'wp-chain-ok' : 'wp-chain-bad'}>
                  <span className="wp-chain-k">h<sub>{i + 1}</sub></span>
                  <code>{h.slice(0, 16)}…</code>
                  <span className="wp-chain-s">{ok ? 'matches stored' : 'does not match stored'}</span>
                </li>
              );
            })}
          </ol>
          <p className="wp-widget-note">Entries 2 and 3 did not change, yet their hashes no longer match once entry 1 is edited: each hash includes the one before it.</p>
        </>
      ) : null}
    </div>
  );
}
