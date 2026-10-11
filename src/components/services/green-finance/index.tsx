import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { isoBox, project } from "../motion/iso";
import { baselineKg, inr, kpiCutKg, loanSaving, tonnes } from "./logic";
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";

const EXAMPLE_BPS = 10;
type Mode = "tonnes" | "bills";
const num = (v: number | "") => Number(v) || 0;

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [loan, setLoan] = useState<number | "">("");
  const [tenor, setTenor] = useState<number | "">("");
  const [bps, setBps] = useState<number | "">("");
  const [example, setExample] = useState(false);
  const [mode, setMode] = useState<Mode>("tonnes");
  const [tco2, setTco2] = useState<number | "">("");
  const [kwh, setKwh] = useState<number | "">("");
  const [diesel, setDiesel] = useState<number | "">("");
  const [target, setTarget] = useState<number | "">("");

  const saving = useMemo(() => loanSaving({ loanInr: num(loan), tenorYears: num(tenor), stepDownBps: num(bps) }), [loan, tenor, bps]);
  const baseKg = useMemo(
    () => (mode === "tonnes" ? baselineKg({ mode, tonnesPerYear: num(tco2) }) : baselineKg({ mode, kwhPerMonth: num(kwh), dieselLPerMonth: num(diesel) })),
    [mode, tco2, kwh, diesel],
  );
  const targetPct = Math.min(100, num(target));
  const cutKg = kpiCutKg(baseKg, targetPct);

  useEffect(() => {
    onChange({ loanInr: num(loan), tenorYears: num(tenor), bps: num(bps), baseKg, targetPct, annual: saving.annual, total: saving.total });
    onResult(null);
  }, [loan, tenor, bps, baseKg, targetPct, saving, onChange, onResult]);

  const finish = () => {
    if (saving.annual <= 0 || baseKg <= 0 || targetPct <= 0) { onResult(null); return; }
    onResult({
      headline: `Meet your KPI and save about ${inr(saving.annual)} a year in interest, ${inr(saving.total)} over ${saving.years} years.`,
      summary:
        `Sustainability-linked loan of ${inr(num(loan))} over ${saving.years} years, margin step-down ${num(bps)} bps` +
        `${example ? " (example, not a market rate)" : ""}: about ${inr(saving.annual)} a year, ${inr(saving.total)} over the tenor, ` +
        `if the KPI is met every year (full amount outstanding). ` +
        `Baseline ${tonnes(baseKg)} tCO₂e a year, KPI target ${targetPct}% lower, about ${tonnes(cutKg)} tCO₂e a year.`,
      data: { annual: saving.annual, total: saving.total, baseKg, targetPct },
    });
  };

  return (
    <Steps
      cta="See my interest saving"
      onFirstTouch={onStart}
      onFinish={finish}
      steps={[
        {
          key: "loan", label: "How big is the loan, and for how long?", ready: num(loan) > 0 && num(tenor) > 0,
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Loan amount (assumed fully outstanding)" unit="₹" value={loan} onChange={setLoan} step={100000} hint={num(loan) > 0 ? inr(num(loan)) : "Full amount, in rupees"} />
              <NumberField label="Tenor" unit="years" value={tenor} onChange={setTenor} max={40} hint="Up to 40 years" />
            </div>
          ),
        },
        {
          key: "bps", label: "How much does the margin drop if you meet the KPIs?", ready: num(bps) > 0,
          content: (
            <div className="grid gap-2">
              <NumberField label="Margin step-down from your term sheet" unit="bps" value={bps} onChange={v => { setBps(v); setExample(false); }} max={500} hint="100 bps = 1 percentage point" />
              <button
                type="button"
                onClick={() => { setBps(EXAMPLE_BPS); setExample(true); }}
                aria-pressed={example}
                className={`w-fit rounded-full border px-3 py-1.5 text-xs transition-colors ${example ? "border-primary bg-primary/[0.06] text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                {EXAMPLE_BPS} bps · example, not a market rate
              </button>
            </div>
          ),
        },
        {
          key: "kpi", label: "What is your baseline and KPI target?", ready: baseKg > 0 && targetPct > 0,
          content: (
            <div className="grid gap-3">
              <Choice<Mode>
                options={[{ value: "tonnes", label: "I know my tCO₂e" }, { value: "bills", label: "Use my bills" }]}
                value={[mode]}
                onChange={v => v[0] && setMode(v[0])}
              />
              {mode === "tonnes" ? (
                <NumberField label="Annual emissions, Scope 1 and 2" unit="tCO₂e" value={tco2} onChange={setTco2} step={1} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Electricity a month" unit="kWh" value={kwh} onChange={setKwh} step={100} hint={`× ${INDIA_GRID_FACTOR_KG_PER_KWH} kg per kWh (CEA)`} />
                  <NumberField label="Diesel a month" unit="L" value={diesel} onChange={setDiesel} step={10} hint={`× ${FUEL_FACTORS.DIESEL.value} kg per L`} />
                </div>
              )}
              <NumberField label="KPI reduction target" unit="%" value={target} onChange={setTarget} max={100} hint={baseKg > 0 ? `Baseline ${tonnes(baseKg)} tCO₂e a year` : "From your term sheet"} />
            </div>
          ),
        },
      ]}
    />
  );
};

// Sample shown before the visitor answers: the lender-pack baseline from this
// page (160.9 t, KPI 1.84 to 1.62 per tonne, about 12%) and the example step-down.
const SAMPLE = { loanInr: 15_00_00_000, tenorYears: 5, bps: EXAMPLE_BPS, baseKg: 160_900, targetPct: 12 };
const MAX_YEARS = 40;
const MAX_BLOCKS = 16;
const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

/**
 * Capital flow. Left: the baseline as tCO2e blocks that cross an evidence
 * gate, amber (from bills) to green (verified); the KPI cut is outlined on
 * top of the pile. Right: the loan margin per year steps down by the bps
 * each year the KPI is met (one spring per year), and the shaded area
 * between the original and stepped margin is the interest saved.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);

  const liveLoan = Number(data.loanInr) > 0 && Number(data.tenorYears) > 0 && Number(data.bps) > 0;
  const liveBase = Number(data.baseKg) > 0 && Number(data.targetPct) > 0;
  const loanInr = liveLoan ? Number(data.loanInr) : SAMPLE.loanInr;
  const years = Math.min(MAX_YEARS, Math.max(1, Math.round(liveLoan ? Number(data.tenorYears) : SAMPLE.tenorYears)));
  const bps = liveLoan ? Number(data.bps) : SAMPLE.bps;
  const baseKg = liveBase ? Number(data.baseKg) : SAMPLE.baseKg;
  const targetPct = liveBase ? Number(data.targetPct) : SAMPLE.targetPct;
  const s = loanSaving({ loanInr, tenorYears: years, stepDownBps: bps });

  const baseT = baseKg / 1000;
  const unit = NICE.find(u => baseT / u <= MAX_BLOCKS) ?? Math.ceil(baseT / MAX_BLOCKS);
  const nBlocks = Math.max(1, Math.min(MAX_BLOCKS, Math.ceil(baseT / unit)));
  const nCut = Math.min(nBlocks, Math.round((nBlocks * targetPct) / 100));

  const key = `${years}|${bps}|${nBlocks}|${nCut}`;
  const sim = useRef({ key: "", t: 0, d: new Float64Array(MAX_YEARS), v: new Float64Array(MAX_YEARS) });

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    const st = sim.current;
    if (st.key !== key) { st.key = key; st.t = 0; st.d.fill(0); st.v.fill(0); }
    st.t = dt === 0 ? 99 : st.t + dt;
    const fs = Math.max(10, Math.min(12, w / 46));
    const mono = `500 ${fs}px ui-monospace, monospace`;
    const sans = `${fs}px ui-sans-serif, system-ui`;

    // ---------- Left: evidence gate ----------
    const L = w * 0.4;
    const sc = (L - 12) / 165;
    const ox = 6 + 114 * 0.866 * sc, oy = h * 0.5;
    const P = (x: number, y: number, z: number) => project(x, y, z, ox, oy, sc);
    const B = 16, GATE = -40;
    // Floor track
    const tr = [P(-100, -14, 0), P(10, -14, 0), P(10, 14, 0), P(-100, 14, 0)];
    ctx.beginPath(); tr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = token("--muted", 0.6); ctx.fill();
    const pile = [P(4, -24, 0), P(48, -24, 0), P(48, 20, 0), P(4, 20, 0)];
    ctx.beginPath(); pile.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = token("--verified", 0.12); ctx.fill();

    const drawGate = (front: boolean) => {
      const y = front ? 16 : -20;
      isoBox(ctx, GATE - 2, y, 0, 4, 4, 40, ox, oy, sc, { top: token("--foreground", 0.55), left: token("--foreground", 0.4), right: token("--foreground", 0.3) });
      if (!front) isoBox(ctx, GATE - 2, -20, 40, 4, 40, 4, ox, oy, sc, { top: token("--foreground", 0.55), left: token("--foreground", 0.4), right: token("--foreground", 0.3) });
    };
    drawGate(false);
    // Blocks: queue -> gate -> pile cell (2 x 2 per layer). Index order = pile order.
    const cell = (i: number): [number, number, number] => {
      const layer = Math.floor(i / 4), c = i % 4;
      return [6 + (c % 2) * (B + 4), -22 + Math.floor(c / 2) * (B + 4), layer * B];
    };
    // Draw back-to-front: pile cells by layer then depth; queued blocks by x.
    for (let i = 0; i < nBlocks; i++) {
      const p = Math.max(0, Math.min(1, (st.t - i * 0.16) / 1.1));
      const [cx, cy, cz] = cell(i);
      let x: number, y: number, z: number;
      const startX = -98, startY = -B / 2;
      if (p < 0.6) { const u = p / 0.6; x = startX + (GATE + 6 - startX) * u; y = startY; z = 0; }
      else { const u = (p - 0.6) / 0.4, e = 1 - (1 - u) * (1 - u); x = GATE + 6 + (cx - GATE - 6) * e; y = startY + (cy - startY) * e; z = cz * e + Math.sin(Math.PI * u) * 10; }
      const verified = x > GATE;
      const cut = i >= nBlocks - nCut && p >= 1;
      if (cut) {
        // KPI cut: the tonnes the target removes, outlined.
        const pts = [P(x, y, z + B), P(x + B, y, z + B), P(x + B, y + B, z + B), P(x, y + B, z + B)];
        ctx.setLineDash([3, 3]); ctx.strokeStyle = token("--primary", 0.9); ctx.lineWidth = 1.2;
        ctx.beginPath(); pts.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.stroke();
        [[x + B, y], [x + B, y + B], [x, y + B]].forEach(([a, b]) => { const [x0, y0] = P(a, b, z); const [x1, y1] = P(a, b, z + B); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
        ctx.setLineDash([]);
        continue;
      }
      const base = verified ? "--verified" : "--pending";
      isoBox(ctx, x, y, z, B, B, B, ox, oy, sc, { top: token(base, 0.95), left: token(base, 0.75), right: token(base, 0.55), stroke: token("--background", 0.5) });
    }
    drawGate(true);

    ctx.textAlign = "center";
    ctx.font = sans; ctx.fillStyle = token("--muted-foreground", 1);
    const [gx, gy] = P(GATE, -2, 48);
    ctx.fillText("Evidence gate", gx, gy - 6);
    const [qx, qy] = P(-98, 14, 0);
    ctx.textAlign = "left"; ctx.fillText("From bills", Math.max(4, qx - 4), qy + fs * 1.5); ctx.textAlign = "center";
    ctx.font = mono; ctx.fillStyle = token("--foreground", 0.85);
    const [px, py] = P(48, 20, 0);
    ctx.fillText(`${tonnes(baseKg)} t verified`, Math.min(px, L - 50), py + fs * 1.6);
    ctx.font = sans; ctx.fillStyle = token("--muted-foreground", 1);
    ctx.fillText(`1 block = ${unit.toLocaleString("en-IN")} t`, Math.min(px, L - 50), py + fs * 3);
    ctx.fillStyle = token("--primary", 1);
    ctx.fillText(`KPI: −${Math.round(targetPct)}%`, Math.min(px, L - 50), py + fs * 4.4);

    // ---------- Right: margin staircase ----------
    const x0 = L + fs * 2.2, x1 = w - 14;
    const yTop = h * 0.16, yBot = h - fs * 3.2;
    const yA = yTop + (yBot - yTop) * 0.18;
    const depth = (yBot - yTop) * 0.32;
    // Lead-in before year 1: the margin at signing, before any KPI test.
    const lead = Math.min(28, (x1 - x0) * 0.08);
    const cx0 = x0 + lead;
    const cw = (x1 - cx0) / years;
    // Axes
    ctx.strokeStyle = token("--border", 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yTop - fs); ctx.lineTo(x0, yBot); ctx.lineTo(x1, yBot); ctx.stroke();
    ctx.font = sans; ctx.fillStyle = token("--muted-foreground", 1);
    ctx.textAlign = "left"; ctx.fillText("Margin", x0 + 4, yTop - fs * 0.4);
    ctx.textAlign = "center"; ctx.fillText("Years", (x0 + x1) / 2, h - fs * 0.5);
    const every = Math.ceil((years * fs * 2.2) / (x1 - x0));
    for (let i = 0; i < years; i++) {
      if ((i + 1) % every && i !== 0) continue;
      ctx.fillText(String(i + 1), cx0 + cw * (i + 0.5), yBot + fs * 1.3);
    }
    // Springs, staggered by year: each year the KPI is met, the margin steps down.
    for (let i = 0; i < years; i++) {
      const tgt = st.t > 0.6 + i * Math.min(0.3, 3 / years) ? depth : 0;
      if (dt === 0) { st.d[i] = tgt; st.v[i] = 0; continue; }
      const a = -110 * (st.d[i] - tgt) - 12 * st.v[i];
      st.v[i] += a * dt; st.d[i] += st.v[i] * dt;
    }
    // Saving area
    ctx.fillStyle = token("--primary", 0.16);
    for (let i = 0; i < years; i++) ctx.fillRect(cx0 + cw * i, yA, cw + 0.5, Math.max(0, st.d[i]));
    // Margin still paid (schematic, no absolute scale: only the step is known).
    ctx.fillStyle = token("--muted", 0.7);
    ctx.fillRect(x0 + 0.5, yA, lead, yBot - yA);
    for (let i = 0; i < years; i++) { const y = yA + Math.max(0, st.d[i]); ctx.fillRect(cx0 + cw * i, y, cw + 0.5, yBot - y); }
    // Year boundaries and a green tick per year once the KPI step lands.
    ctx.strokeStyle = token("--background", 0.9);
    for (let i = 1; i < years; i++) { ctx.beginPath(); ctx.moveTo(cx0 + cw * i, yA); ctx.lineTo(cx0 + cw * i, yBot); ctx.stroke(); }
    const r = Math.max(2, Math.min(4, cw * 0.12));
    ctx.fillStyle = token("--verified", 1);
    for (let i = 0; i < years; i++) {
      if (st.d[i] < depth * 0.5) continue;
      ctx.beginPath(); ctx.arc(cx0 + cw * (i + 0.5), yA - r - 3, r, 0, Math.PI * 2); ctx.fill();
    }
    // Original margin
    ctx.setLineDash([4, 4]); ctx.strokeStyle = token("--muted-foreground", 0.8);
    ctx.beginPath(); ctx.moveTo(x0, yA); ctx.lineTo(x1, yA); ctx.stroke(); ctx.setLineDash([]);
    // Stepped margin
    ctx.strokeStyle = token("--primary", 1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, yA); ctx.lineTo(cx0, yA);
    for (let i = 0; i < years; i++) { const y = yA + st.d[i]; ctx.lineTo(cx0 + cw * i, y); ctx.lineTo(cx0 + cw * (i + 1), y); }
    ctx.stroke(); ctx.lineWidth = 1;
    // Labels
    ctx.textAlign = "right"; ctx.font = sans; ctx.fillStyle = token("--muted-foreground", 1);
    ctx.fillText("Original", x1, yA - fs * 1.5);
    ctx.fillStyle = token("--primary", 1);
    ctx.fillText(`−${bps.toLocaleString("en-IN")} bps`, x1, yA + depth + fs * 1.3);
    ctx.textAlign = "center"; ctx.font = `600 ${fs}px ui-monospace, monospace`; ctx.fillStyle = token("--foreground", 0.9);
    const mid = (cx0 + x1) / 2;
    ctx.fillText(`${inr(s.annual)} a year`, mid, yA + depth * 0.45);
    ctx.font = sans; ctx.fillStyle = token("--muted-foreground", 1);
    ctx.fillText(`${inr(s.total)} over ${years} yr`, mid, yA + depth * 0.45 + fs * 1.4);
    if (yBot - yA - depth > fs * 3) ctx.fillText("Margin you still pay", mid, (yA + depth + yBot) / 2 + fs * 0.9);
  }, active);

  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas
        ref={canvasRef}
        className="block w-full aspect-[4/3]"
        role="img"
        aria-label={`Verified baseline of ${tonnes(baseKg)} tCO2e passing an evidence gate, and a loan margin stepping down ${bps} bps a year over ${years} years, saving about ${inr(s.annual)} a year`}
      />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-pending" aria-hidden="true" /> From bills</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-verified" aria-hidden="true" /> Verified</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-verified" aria-hidden="true" /> KPI met that year</span>
          <span className="rounded-full border border-primary bg-primary px-2.5 py-1 text-primary-foreground">Shaded: interest saved</span>
        </div>
      </figcaption>
    </figure>
  );
};
