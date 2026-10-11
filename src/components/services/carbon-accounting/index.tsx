import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField } from "../shell/Steps";
import { CompanyIdInput } from "../shell/CompanyIdInput";
import { useCompany } from "../shell/CompanyContext";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { isoBox, project } from "../motion/iso";
import { annualFootprint, scope3Hotspots, SCOPE3_CATEGORIES } from "./logic";
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";

const t = (kg: number) => (kg / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const { facts } = useCompany();
  const [kwh, setKwh] = useState<number | "">("");
  const [diesel, setDiesel] = useState<number | "">("");
  const [lpg, setLpg] = useState<number | "">("");

  const fp = useMemo(() => annualFootprint({ kwhPerMonth: Number(kwh) || 0, dieselLPerMonth: Number(diesel) || 0, lpgKgPerMonth: Number(lpg) || 0 }), [kwh, diesel, lpg]);
  const hotspots = useMemo(() => scope3Hotspots(facts.sector), [facts.sector]);

  useEffect(() => { onChange({ s1Kg: fp.s1, s2Kg: fp.s2, hotspots }); }, [fp, hotspots, onChange]);

  const finish = () => {
    if (fp.total <= 0) { onResult(null); return; }
    const hs = hotspots.map(c => SCOPE3_CATEGORIES[c]).join(", ");
    onResult({
      headline: `About ${t(fp.total)} tCO₂e a year from energy. Scope 3 will be larger: start with ${SCOPE3_CATEGORIES[hotspots[0]].toLowerCase()}.`,
      summary: `Scope 1 about ${t(fp.s1)} t, Scope 2 about ${t(fp.s2)} t a year. Likely Scope 3 hotspots: ${hs}.`,
      data: { s1Kg: fp.s1, s2Kg: fp.s2, hotspots },
    });
  };

  return (
    <Steps
      cta="See my footprint"
      onFirstTouch={onStart}
      onFinish={finish}
      steps={[
        { key: "company", label: "What does your company do?", content: <CompanyIdInput /> },
        {
          key: "power", label: "How much electricity do you use a month?", ready: Number(kwh) > 0,
          content: <NumberField label="From your electricity bill" unit="kWh" value={kwh} onChange={setKwh} step={100} hint={`× ${INDIA_GRID_FACTOR_KG_PER_KWH} kgCO₂ per kWh, India grid (CEA)`} />,
        },
        {
          key: "fuel", label: "And fuel? Leave blank if none.",
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Diesel a month" unit="L" value={diesel} onChange={setDiesel} step={10} hint={`× ${FUEL_FACTORS.DIESEL.value} kg per L`} />
              <NumberField label="LPG a month" unit="kg" value={lpg} onChange={setLpg} step={10} hint={`× ${FUEL_FACTORS.LPG.value} kg per kg`} />
            </div>
          ),
        },
      ]}
    />
  );
};

/**
 * Bills become blocks. Each scope is a column on an isometric floor; block
 * height is tonnes of CO2 and lands under gravity with a damped bounce, so
 * the bigger source visibly weighs more. Scope 3 is a hatched outline with
 * its likely hotspot categories: present but not yet measured.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const s1 = Number(data.s1Kg) || 0;
  const s2 = Number(data.s2Kg) || 0;
  const hotspots = (data.hotspots as number[] | undefined) ?? [1, 4, 3];
  const empty = s1 + s2 === 0;
  // Sample values until the visitor types, clearly marked.
  const v1 = empty ? 4200 : s1;
  const v2 = empty ? 35800 : s2;

  const sim = useRef({ h1: 0, h2: 0, u1: 0, u2: 0 });

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(v1, v2, 1);
    const hMax = h * 0.42;
    const targets = [(v1 / max) * hMax, (v2 / max) * hMax];
    const st = sim.current;
    // Spring with gravity-like overshoot: k = 90, damping 9.
    const step = (x: number, v: number, target: number) => {
      if (dt === 0) return [target, 0];
      const a = -90 * (x - target) - 9 * v;
      const nv = v + a * dt;
      return [x + nv * dt, nv];
    };
    [st.h1, st.u1] = step(st.h1, st.u1, targets[0]);
    [st.h2, st.u2] = step(st.h2, st.u2, targets[1]);

    const s = Math.min(w, h) / 300;
    const ox = w * 0.5;
    const oy = h * 0.5;
    // Three columns at the same depth (x + y constant), spread across the screen.
    const C = [{ x: -96, y: 48 }, { x: -24, y: -24 }, { x: 48, y: -96 }];
    // Floor
    const floor = [project(-120, -120, 0, ox, oy, s), project(110, -120, 0, ox, oy, s), project(110, 110, 0, ox, oy, s), project(-120, 110, 0, ox, oy, s)];
    ctx.beginPath(); floor.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = token("--muted", 0.6); ctx.fill();

    const col = (c: { x: number; y: number }, hgt: number, base: string) =>
      isoBox(ctx, c.x, c.y, 0, 44, 44, Math.max(2, hgt / s), ox, oy, s, {
        top: token(base, 0.95), left: token(base, 0.75), right: token(base, 0.55),
      });
    col(C[0], st.h1, "--earth");
    col(C[1], st.h2, "--accent");

    // Scope 3: hatched outline, height unknown until measured.
    const top = 110;
    const { x: sx, y: sy } = C[2];
    const corners: [number, number][] = [[sx, sy], [sx + 44, sy], [sx + 44, sy + 44], [sx, sy + 44]];
    const pts = corners.map(([a, b]) => project(a, b, top, ox, oy, s));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = token("--primary", 0.6); ctx.lineWidth = 1.2;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
    corners.forEach(([a, b]) => {
      const [x0, y0] = project(a, b, 0, ox, oy, s); const [x1, y1] = project(a, b, top, ox, oy, s);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Labels
    ctx.font = `600 ${Math.max(10, 11 * s)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = token("--foreground", 0.85);
    const lab = (c: { x: number; y: number }, z: number, text: string) => { const [lx, ly] = project(c.x + 22, c.y + 22, z, ox, oy, s); ctx.fillText(text, lx, ly - 14 * s); };
    lab(C[0], st.h1 / s, `${t(v1)} t`);
    lab(C[1], st.h2 / s, `${t(v2)} t`);
    lab(C[2], top, "Scope 3 ?");
    ctx.font = `${Math.max(9, 10 * s)}px ui-sans-serif, system-ui`;
    ctx.fillStyle = token("--muted-foreground", 1);
    const base = (c: { x: number; y: number }, text: string) => { const [lx, ly] = project(c.x + 44, c.y + 44, 0, ox, oy, s); ctx.fillText(text, lx, ly + 16 * s); };
    base(C[0], "Scope 1 fuel");
    base(C[1], "Scope 2 power");
    base(C[2], "Value chain");
  }, active);

  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img" aria-label="Scope 1, 2 and 3 emissions as columns, sized by tonnes of CO2" />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 -mt-2">
        <div className="flex flex-wrap gap-1.5">
          {hotspots.map((c, i) => (
            <span key={c} className={`rounded-full border px-2.5 py-1 text-[11px] ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-primary/40 bg-background text-primary"}`}>
              Cat {c} · {SCOPE3_CATEGORIES[c]}
            </span>
          ))}
        </div>
      </figcaption>
    </figure>
  );
};
