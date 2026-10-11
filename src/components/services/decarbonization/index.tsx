import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";
import { baselineTonnes, pathway, pathwayHeadline, fmtT, pct, EXAMPLE_SOLAR_YIELD, SBTI_ANNUAL_RATE } from "./logic";

type Mode = "bills" | "known";
const num = (v: number | "") => (v === "" ? 0 : v);
const BASE_YEAR_DEFAULT = 2026;

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [mode, setMode] = useState<Mode>("bills");
  const [kwh, setKwh] = useState<number | "">("");
  const [diesel, setDiesel] = useState<number | "">("");
  const [known, setKnown] = useState<number | "">("");
  const [baseYear, setBaseYear] = useState<number | "">(BASE_YEAR_DEFAULT);
  const [targetYear, setTargetYear] = useState<number | "">(2030);
  const [kw, setKw] = useState<number | "">("");
  const [yld, setYld] = useState<number | "">("");
  const [share, setShare] = useState<number | "">("");

  const baseline = useMemo(
    () => baselineTonnes(mode === "known" ? { kwhPerMonth: 0, dieselLPerMonth: 0, knownT: num(known) } : { kwhPerMonth: num(kwh), dieselLPerMonth: num(diesel) }),
    [mode, kwh, diesel, known],
  );
  const p = useMemo(
    () => pathway({ baseline, baseYear: num(baseYear), targetYear: num(targetYear), solarKw: num(kw), solarYield: num(yld), dieselSharePct: num(share) }),
    [baseline, baseYear, targetYear, kw, yld, share],
  );

  useEffect(() => {
    onChange(p ? { base: baseline.total, baseYear: num(baseYear), targetYear: num(targetYear), cut: p.requiredCut, solar: p.solar, elec: p.dieselRemoved } : {});
  }, [p, baseline, baseYear, targetYear, onChange]);

  const yearsOk = num(targetYear) > num(baseYear) && num(baseYear) >= 2000 && num(targetYear) <= 2100;
  const hasDiesel = (baseline.diesel ?? 0) > 0;

  const finish = () => {
    if (!p) { onResult(null); return; }
    const ty = num(targetYear);
    const levers = [p.solar > 0 && `solar ${fmtT(p.solar)} t`, p.dieselRemoved > 0 && `diesel removed ${fmtT(p.dieselRemoved)} t`].filter(Boolean).join(", ");
    onResult({
      headline: pathwayHeadline(p, ty),
      summary: `Base year ${num(baseYear)}: ${fmtT(baseline.total)} tCO2e Scope 1 and 2. 1.5°C pathway (SBTi, ${SBTI_ANNUAL_RATE * 100}% a year): cut ${fmtT(p.requiredCut)} t a year by ${ty}.${levers ? ` Levers: ${levers}, covering ${pct(p.coverShare)}.` : ""}${p.gap > 0 ? ` Remaining gap ${fmtT(p.gap)} t.` : ""}`,
      data: { base: baseline.total, baseYear: num(baseYear), targetYear: ty, cut: p.requiredCut, solar: p.solar, elec: p.dieselRemoved },
    });
  };

  return (
    <Steps
      cta="Show my pathway"
      onFirstTouch={onStart}
      onFinish={finish}
      steps={[
        {
          key: "baseline", label: "What are your emissions today?", ready: baseline.total > 0,
          content: (
            <div className="space-y-3">
              <Choice<Mode> options={[{ value: "bills", label: "From my bills" }, { value: "known", label: "I know my annual tCO₂e" }]} value={[mode]} onChange={v => v[0] && setMode(v[0])} />
              {mode === "bills" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Electricity a month" unit="kWh" value={kwh} onChange={setKwh} step={100} hint={`× ${INDIA_GRID_FACTOR_KG_PER_KWH} kg per kWh, India grid (CEA)`} />
                  <NumberField label="Diesel a month" unit="L" value={diesel} onChange={setDiesel} step={10} hint={`× ${FUEL_FACTORS.DIESEL.value} kg per L`} />
                </div>
              ) : (
                <NumberField label="Scope 1 and 2 a year" unit="tCO₂e" value={known} onChange={setKnown} step={1} />
              )}
              {baseline.total > 0 && <p className="text-xs text-muted-foreground">Base year emissions: <span className="font-mono text-foreground">{fmtT(baseline.total)} t</span></p>}
            </div>
          ),
        },
        {
          key: "years", label: "Which years?", ready: yearsOk,
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Base year" unit="year" value={baseYear} onChange={setBaseYear} min={0} />
              <NumberField label="Target year" unit="year" value={targetYear} onChange={setTargetYear} min={0} />
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                {yearsOk ? `At least ${SBTI_ANNUAL_RATE * 100}% of base-year emissions a year, over ${num(targetYear) - num(baseYear)} years (SBTi near-term).` : "The target year must come after the base year."}
              </p>
            </div>
          ),
        },
        {
          key: "levers", label: "Which levers are you planning?", ready: !(num(kw) > 0 && !(num(yld) > 0)),
          content: (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField label="Rooftop solar" unit="kW" value={kw} onChange={setKw} step={5} />
                <NumberField label="Solar yield at your site" unit="kWh/kW/yr" value={yld} onChange={setYld} step={10} hint="From your installer's estimate" />
              </div>
              {num(kw) > 0 && !(num(yld) > 0) && <p className="text-xs text-pending">Enter your site's solar yield to count solar.</p>}
              {p?.solarCapped && <p className="text-xs text-muted-foreground">Solar capped at your grid emissions.</p>}
              {hasDiesel && (
                <NumberField label="Share of diesel removed" unit="%" value={share} onChange={setShare} max={100} step={5}
                  hint="Counts diesel removed only. If you electrify, the grid power it adds is not netted off here." />
              )}
            </div>
          ),
        },
      ]}
    />
  );
};

const SAMPLE = { base: 160.9, baseYear: BASE_YEAR_DEFAULT, targetYear: 2030, cut: 160.9 * SBTI_ANNUAL_RATE * (2030 - BASE_YEAR_DEFAULT), solar: (20 * EXAMPLE_SOLAR_YIELD * INDIA_GRID_FACTOR_KG_PER_KWH) / 1000, elec: 0 };
type Pt = [number, number];

/**
 * Stabilisation wedges. An extruded ribbon chart from base to target year:
 * business as usual stays flat, the 1.5°C line falls by 4.2% of the base year
 * each year. Each lever is a wedge that grows from zero in the base year to
 * its full annual saving in the target year and springs into the gap; what
 * the levers do not cover stays hatched amber.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const live = Number(data.base) > 0;
  const d = live
    ? { base: Number(data.base), baseYear: Number(data.baseYear), targetYear: Number(data.targetYear), cut: Number(data.cut), solar: Number(data.solar) || 0, elec: Number(data.elec) || 0 }
    : SAMPLE;
  const years = Math.max(1, d.targetYear - d.baseYear);

  // Spring state: animated tonnes and slide-in offsets for each lever.
  const sim = useRef({ cut: 0, s: 0, e: 0, vc: 0, vs: 0, ve: 0, os: 0, oe: 0, vos: 0, voe: 0, ps: 0, pe: 0 });

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    const st = sim.current;
    // Lever appears: start it off to the right so it slides into the gap.
    if (st.ps <= 0 && d.solar > 0) st.os = w * 0.35;
    if (st.pe <= 0 && d.elec > 0) st.oe = w * 0.35;
    st.ps = d.solar; st.pe = d.elec;
    const k = 110, c = 14;
    const spring = (x: number, v: number, target: number): Pt => {
      if (dt === 0) return [target, 0];
      const nv = v + (-k * (x - target) - c * v) * dt;
      return [x + nv * dt, nv];
    };
    [st.cut, st.vc] = spring(st.cut, st.vc, d.cut);
    [st.s, st.vs] = spring(st.s, st.vs, d.solar);
    [st.e, st.ve] = spring(st.e, st.ve, d.elec);
    [st.os, st.vos] = spring(st.os, st.vos, 0);
    [st.oe, st.voe] = spring(st.oe, st.voe, 0);

    ctx.clearRect(0, 0, w, h);
    const fs = Math.max(10, Math.min(12, w / 46));
    const dx = w * 0.07, dy = -w * 0.04; // extrusion depth (oblique, up-right)
    const L = fs * 4.2, R = 14 + dx, T = 16 - dy + fs * 1.6, B = fs * 2.6;
    const pw = w - L - R, ph = h - T - B;
    const B0 = d.base;
    // Zoom the tonnes axis onto the wedges; the floor is marked when it is not zero.
    const span = Math.max(d.cut, d.solar + d.elec, B0 * 0.02);
    const min = Math.max(0, B0 - span * 2.4);
    const max = B0 + (B0 - min) * 0.12;
    const X = (f: number) => L + f * pw;
    const Y = (t: number) => T + ph - ((Math.max(min, t) - min) / (max - min)) * ph;
    const P = (f: number, t: number): Pt => [X(f), Y(t)];

    // Axes and grid.
    ctx.font = `${fs}px ui-sans-serif, system-ui`;
    ctx.lineWidth = 1;
    ctx.strokeStyle = token("--border", 1);
    ctx.fillStyle = token("--muted-foreground", 1);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const v of [min, (min + B0) / 2, B0]) {
      const y = Y(v);
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + dx, y + dy); ctx.lineTo(L + pw + dx, y + dy); ctx.stroke();
      ctx.fillText(`${fmtT(v)} t`, L - 6, y);
    }
    if (min > 0) {
      // Axis break: the floor is not zero.
      const y = T + ph;
      ctx.beginPath(); ctx.moveTo(L - 4, y - 9); ctx.lineTo(L + 4, y - 12); ctx.moveTo(L - 4, y - 4); ctx.lineTo(L + 4, y - 7); ctx.stroke();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const stepY = Math.max(1, Math.ceil(years / (w < 500 ? 4 : 8)));
    for (let i = 0; i <= years; i += stepY) ctx.fillText(String(d.baseYear + i), X(i / years), T + ph + 6);
    if (years % stepY) ctx.fillText(String(d.targetYear), X(1), T + ph + 6);

    // Extruded polygon: visible side faces, then the front face.
    const prism = (pts: Pt[], fill: string, side: string, ox = 0) => {
      ctx.save(); ctx.translate(ox, 0);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        // Outward normal of a clockwise-on-screen polygon edge: (ey, -ex).
        const ex = b[0] - a[0], ey = b[1] - a[1];
        if (ey * dx - ex * dy <= 0) continue;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] + dx, b[1] + dy); ctx.lineTo(a[0] + dx, a[1] + dy); ctx.closePath();
        ctx.fillStyle = side; ctx.fill();
      }
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    };

    const tgt = B0 - st.cut;
    const s = st.s, e = st.e;
    // Allowed emissions under the 1.5°C line (clockwise on screen).
    prism([P(0, B0), P(1, tgt), P(1, min), P(0, min)], token("--muted", 0.9), token("--muted-foreground", 0.18));
    // Uncovered gap, hatched amber.
    const low = B0 - s - e;
    if (low > tgt + 1e-6) {
      const g: Pt[] = [P(0, B0), P(1, low), P(1, tgt)];
      prism(g, token("--pending", 0.14), token("--pending", 0.3));
      ctx.save();
      ctx.beginPath(); g.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
      ctx.strokeStyle = token("--pending", 0.75); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = L - ph; x < L + pw; x += 7) { ctx.moveTo(x, T + ph); ctx.lineTo(x + ph, T); }
      ctx.stroke(); ctx.restore();
    }
    // Lever wedges, lower first so the upper one sits in front of its top face.
    if (e > 1e-6) prism([P(0, B0), P(1, B0 - s), P(1, B0 - s - e)], token("--primary", 0.5), token("--primary", 0.32), st.oe);
    if (s > 1e-6) prism([P(0, B0), P(1, B0), P(1, B0 - s)], token("--primary", 0.9), token("--primary", 0.62), st.os);

    // Lines on the front face.
    ctx.lineWidth = 2;
    ctx.strokeStyle = token("--foreground", 0.8);
    ctx.beginPath(); ctx.moveTo(...P(0, B0)); ctx.lineTo(...P(1, tgt)); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = token("--foreground", 0.55);
    ctx.beginPath(); ctx.moveTo(...P(0, B0)); ctx.lineTo(...P(1, B0)); ctx.stroke();
    ctx.setLineDash([]);

    // Labels: line names above BAU and under the 1.5°C end; wedge values when they fit.
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui`;
    ctx.fillStyle = token("--foreground", 0.8);
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText(`Business as usual ${fmtT(B0)} t`, L + 2, Y(B0) - fs * 0.6 + dy);
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText(`1.5°C: ${fmtT(Math.max(0, tgt))} t in ${d.targetYear}`, X(1) - 4, Math.max(Y(tgt), Y(low)) + 8);
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const tag = (top: number, bottom: number, text: string, color: string) => {
      const hgt = Y(bottom) - Y(top);
      if (hgt < fs * 1.6 || pw * 0.25 < text.length * fs * 0.62) return;
      ctx.fillStyle = color; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(text, X(0.97), (Y(top) + Y(bottom)) / 2);
    };
    tag(B0, B0 - s, `−${fmtT(d.solar)} t`, token("--primary-foreground", 1));
    tag(B0 - s, B0 - s - e, `−${fmtT(d.elec)} t`, token("--foreground", 0.9));
    if (low > tgt) tag(low, tgt, `gap ${fmtT(Math.max(0, d.cut - d.solar - d.elec))} t`, token("--foreground", 0.85));
  }, active);

  const gap = Math.max(0, d.cut - d.solar - d.elec);
  const chip = "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/85";
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img"
        aria-label={`Pathway from ${d.baseYear} to ${d.targetYear}: cut ${fmtT(d.cut)} t a year. Solar ${fmtT(d.solar)} t, diesel removed ${fmtT(d.elec)} t, gap ${fmtT(gap)} t.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-primary" />Solar</span>
          {d.elec > 0 && <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-primary/50" />Diesel removed</span>}
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm border border-pending bg-pending/20" />Gap {fmtT(gap)} t</span>
          <span className={chip}><i className="h-0.5 w-3 bg-foreground/80" />1.5°C line, −{SBTI_ANNUAL_RATE * 100}% a year</span>
        </div>
      </figcaption>
    </figure>
  );
};
