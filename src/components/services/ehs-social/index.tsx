import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { project } from "../motion/iso";
import {
  fmtHours, fmtRate, hoursWorked, injuryCells, lattice, rates, recordablesValid, safetyHeadline, safetySummary,
  type HoursInput, type InjuryInput, type Num,
} from "./logic";

type Group = "all" | "employees" | "workers";
const GROUP_LABEL: Record<Group, string> = { all: "", employees: "Employees", workers: "Workers" };
const emptyHours = (): Omit<HoursInput, "mode"> => ({ total: "", headcount: "", hoursPerDay: "", days: "" });
const emptyInj = (): InjuryInput => ({ ltis: "", recordables: "", fatalities: "" });

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [mode, setMode] = useState<HoursInput["mode"]>("total");
  const [split, setSplit] = useState(false);
  const [hrs, setHrs] = useState<Record<Group, Omit<HoursInput, "mode">>>({ all: emptyHours(), employees: emptyHours(), workers: emptyHours() });
  const [inj, setInj] = useState<Record<Group, InjuryInput>>({ all: emptyInj(), employees: emptyInj(), workers: emptyInj() });
  const [done, setDone] = useState(false);
  const groups: Group[] = split ? ["employees", "workers"] : ["all"];

  const calc = useMemo(() => {
    const per = groups.map(g => rates(hoursWorked({ mode, ...hrs[g] }), inj[g]));
    const hours = per.reduce((a, r) => a + r.hours, 0);
    const sum = (k: "ltis" | "recordables" | "fatalities") => per.reduce((a, r) => a + r[k], 0);
    const total = rates(hours, { ltis: sum("ltis"), recordables: sum("recordables"), fatalities: sum("fatalities") });
    return { per, total, valid: groups.every(g => recordablesValid(inj[g])), hoursOk: per.every(r => r.hours > 0) };
    // groups derives from split
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, split, hrs, inj]);

  useEffect(() => {
    onChange({ hours: calc.total.hours, ltis: calc.total.ltis, recordables: calc.total.recordables });
  }, [calc, onChange]);
  useEffect(() => {
    if (!done) return;
    if (!calc.hoursOk || !calc.valid) { onResult(null); return; }
    onResult({
      headline: safetyHeadline(calc.total),
      summary: safetySummary(calc.total, split ? { employees: calc.per[0], workers: calc.per[1] } : undefined),
      data: { hours: calc.total.hours, ltis: calc.total.ltis, recordables: calc.total.recordables, ltifr: calc.total.ltifr, trir: calc.total.trir },
    });
  }, [done, calc, split, onResult]);

  const setH = (g: Group, k: keyof Omit<HoursInput, "mode">) => (v: Num) => setHrs(p => ({ ...p, [g]: { ...p[g], [k]: v } }));
  const setI = (g: Group, k: keyof InjuryInput) => (v: Num) => setInj(p => ({ ...p, [g]: { ...p[g], [k]: v } }));
  const head = (g: Group) => GROUP_LABEL[g] && <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:col-span-full">{GROUP_LABEL[g]}</p>;

  return (
    <Steps
      cta="Calculate my LTIFR"
      onFirstTouch={onStart}
      onFinish={() => setDone(true)}
      steps={[
        {
          key: "how", label: "How will you give hours worked this year?",
          content: (
            <div className="space-y-3">
              <Choice options={[{ value: "total", label: "Total hours", hint: "From payroll or attendance" }, { value: "headcount", label: "Work it out", hint: "Headcount × hours a day × days" }]} value={[mode]} onChange={v => v[0] && setMode(v[0])} />
              <Choice options={[{ value: "one", label: "One total" }, { value: "split", label: "Employees and workers separately", hint: "As BRSR reports them" }]} value={[split ? "split" : "one"]} onChange={v => setSplit(v[0] === "split")} />
            </div>
          ),
        },
        {
          key: "hours", label: "Hours worked this year", ready: calc.hoursOk,
          content: (
            <div className="grid gap-3 sm:grid-cols-3">
              {groups.map(g => (
                <div key={g} className="contents">
                  {head(g)}
                  {mode === "total" ? (
                    <div className="sm:col-span-full"><NumberField label="Total hours worked" unit="hours" value={hrs[g].total} onChange={setH(g, "total")} step={1000} /></div>
                  ) : (
                    <>
                      <NumberField label="Headcount" unit="people" value={hrs[g].headcount} onChange={setH(g, "headcount")} />
                      <NumberField label="Hours a day" unit="h" value={hrs[g].hoursPerDay} onChange={setH(g, "hoursPerDay")} step={0.5} />
                      <NumberField label="Working days" unit="days" value={hrs[g].days} onChange={setH(g, "days")} />
                    </>
                  )}
                </div>
              ))}
              {calc.total.hours > 0 && <p className="text-xs text-muted-foreground sm:col-span-full">{fmtHours(calc.total.hours)} hours in total</p>}
            </div>
          ),
        },
        {
          key: "injuries", label: "Injuries this year", ready: calc.valid,
          content: (
            <div className="grid gap-3 sm:grid-cols-3">
              {groups.map(g => (
                <div key={g} className="contents">
                  {head(g)}
                  <NumberField label="Lost time injuries" unit="no." value={inj[g].ltis} onChange={setI(g, "ltis")} />
                  <NumberField label="All recordables" unit="no." value={inj[g].recordables} onChange={setI(g, "recordables")} hint="Include lost time ones" />
                  <NumberField label="Fatalities" unit="no." value={inj[g].fatalities} onChange={setI(g, "fatalities")} />
                  {!recordablesValid(inj[g]) && <p className="text-xs text-destructive sm:col-span-full">Recordables include lost time injuries, so enter at least {Number(inj[g].ltis)}.</p>}
                </div>
              ))}
              <p className="text-xs text-muted-foreground sm:col-span-full">LTIFR = LTIs × 1,000,000 ÷ hours. TRIR = recordables × 200,000 ÷ hours.</p>
            </div>
          ),
        },
      ]}
    />
  );
};

// ---- Visual: hours lattice ---------------------------------------------------
// Every cell is a fixed block of hours worked. Each lost time injury raises one
// red cell, each other recordable one amber cell, placed by a seeded hash, so
// the visitor sees injuries per hours as a density. The inset compares the
// visitor's hours with the one million hours LTIFR is expressed per.

const SAMPLE = { hours: 1_200_000, ltis: 1, recordables: 8 };
const MAX_PINS = 300;

export const Visual = ({ data, result }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const liveHours = Number(data.hours) || 0;
  const sample = liveHours <= 0;
  const H = sample ? SAMPLE.hours : liveHours;
  const L = sample ? SAMPLE.ltis : Number(data.ltis) || 0;
  const R = Math.max(L, sample ? SAMPLE.recordables : Number(data.recordables) || 0);
  const grid = useMemo(() => lattice(H), [H]);

  // Pins: [cell, isLti], drawn back to front.
  const pins = useMemo(() => {
    const cells = injuryCells(grid.cells, Math.min(R, MAX_PINS), grid.cells * 2654435761);
    return cells.map((c, i) => ({ c, lti: i < L, col: c % grid.cols, row: Math.floor(c / grid.cols) }))
      .sort((a, b) => a.col + a.row - (b.col + b.row));
  }, [grid, R, L]);

  const sim = useRef({ fill: 0, fv: 0, drop: new Float32Array(MAX_PINS), dv: new Float32Array(MAX_PINS), key: "" });
  const key = `${grid.cells}-${R}-${L}`;
  if (sim.current.key !== key) { sim.current.key = key; sim.current.drop.fill(14); sim.current.dv.fill(0); }

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    const st = sim.current;
    const { cols, rows, cells } = grid;
    // Cells fill on a damped spring; pins fall in with a bounce (k 80, c 7).
    if (dt === 0) { st.fill = cells; st.drop.fill(0); }
    else {
      st.fv += (-30 * (st.fill - cells) - 11 * st.fv) * dt; st.fill += st.fv * dt;
      for (let i = 0; i < pins.length; i++) { st.dv[i] += (-80 * st.drop[i] - 7 * st.dv[i]) * dt; st.drop[i] += st.dv[i] * dt; }
    }
    const filled = Math.max(0, Math.min(cells, Math.round(st.fill)));

    ctx.clearRect(0, 0, w, h);
    const span = cols + rows;
    const s = Math.min((w * 0.9) / (span * 0.866), (h * 0.78) / (span * 0.5 + 3));
    const ox = w / 2 - ((cols - rows) * 0.866 * s) / 2;
    const oy = h / 2 - (span * 0.5 * s) / 2 + 1.5 * s;
    const g = 0.1; // gap inside each cell

    const tile = (c: number) => {
      const x = c % cols, y = Math.floor(c / cols);
      const [ax, ay] = project(x + g, y + g, 0, ox, oy, s);
      const [bx, by] = project(x + 1 - g, y + g, 0, ox, oy, s);
      const [cx, cy] = project(x + 1 - g, y + 1 - g, 0, ox, oy, s);
      const [dx, dy] = project(x + g, y + 1 - g, 0, ox, oy, s);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy); ctx.closePath();
    };
    // Empty capacity, then filled hours, one path each.
    ctx.beginPath(); for (let c = filled; c < cells; c++) tile(c);
    ctx.fillStyle = token("--muted-foreground", 0.12); ctx.fill();
    ctx.beginPath(); for (let c = 0; c < filled; c++) tile(c);
    ctx.fillStyle = token("--primary", 0.3); ctx.fill();

    // Injury pins: one raised cell per injury.
    const red = [token("--destructive"), token("--destructive", 0.8), token("--destructive", 0.62)];
    const amb = [token("--pending"), token("--pending", 0.8), token("--pending", 0.62)];
    const ph = 2.2;
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.c >= filled) continue;
      const z = Math.max(0, st.drop[i]);
      const [t, l, r] = p.lti ? red : amb;
      const x = p.col + 0.12, y = p.row + 0.12, d = 0.76;
      const P = (a: number, b: number, c: number) => project(a, b, c, ox, oy, s);
      const poly = (pts: [number, number][], f: string) => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fillStyle = f; ctx.fill(); };
      poly([P(x, y + d, z), P(x + d, y + d, z), P(x + d, y + d, z + ph), P(x, y + d, z + ph)], l);
      poly([P(x + d, y, z), P(x + d, y + d, z), P(x + d, y + d, z + ph), P(x + d, y, z + ph)], r);
      poly([P(x, y, z + ph), P(x + d, y, z + ph), P(x + d, y + d, z + ph), P(x, y + d, z + ph)], t);
    }

    // Ruler: your hours and one million hours as areas, bottom-left.
    const side = Math.min(w, h) * 0.16;
    const big = Math.max(H, 1e6), small = Math.min(H, 1e6);
    const rs = side, ri = side * Math.sqrt(small / big);
    const lh2 = Math.max(12, Math.min(14, w / 30));
    const rx = 14 + rs * 0.866, ry = h - 16 - 2 * lh2 - rs;
    const rh = (a: number, fill: string | null, dash: boolean) => {
      ctx.beginPath();
      const pts: [number, number][] = [project(0, 0, 0, rx, ry + rs - a, 1), project(a, 0, 0, rx, ry + rs - a, 1), project(a, a, 0, rx, ry + rs - a, 1), project(0, a, 0, rx, ry + rs - a, 1)];
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.setLineDash(dash ? [4, 3] : []); ctx.strokeStyle = token("--primary", 0.8); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    };
    const millionIsBig = H < 1e6;
    rh(rs, millionIsBig ? null : token("--primary", 0.3), millionIsBig);
    rh(ri, millionIsBig ? token("--primary", 0.3) : null, !millionIsBig);
    ctx.font = `500 ${Math.max(10, Math.min(12, w / 36))}px ui-sans-serif, system-ui`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = token("--foreground", 0.75);
    ctx.fillText(millionIsBig ? "Dashed: 1 million hours" : "Dashed: your hours", 14, ry + rs + 8);
    ctx.fillStyle = token("--muted-foreground");
    ctx.fillText(millionIsBig ? "Filled: your hours" : "Filled: 1 million hours", 14, ry + rs + 8 + lh2);
  }, active);

  const ltifr = H > 0 ? (L * 1e6) / H : 0;
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img" aria-label={`Hours lattice: ${grid.cells} cells of ${fmtHours(grid.block)} hours, ${L} lost time and ${R - L} other recordable injuries.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 -mt-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`rounded-full px-2.5 py-1 font-medium ${sample ? "border border-border text-foreground" : "bg-primary text-primary-foreground"}`}>LTIFR {fmtRate(ltifr, 2)}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-primary/30" />1 cell = {fmtHours(grid.block)} hours</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-destructive" />Lost time injury ({L})</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-pending" />Other recordable ({R - L})</span>
        </div>
        {R > MAX_PINS && <p className="mt-1.5">Showing the first {MAX_PINS} injuries.</p>}
      </figcaption>
    </figure>
  );
};
