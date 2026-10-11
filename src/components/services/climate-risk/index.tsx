import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { isoBox, project } from "../motion/iso";
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";
import { annualEmissions, carbonCost, costHeadline, pricePaths, eur, inr, priceLabel, ETS_REFERENCE, FAN_START, FAN_END, HAZARDS, type Hazard } from "./logic";

type Mode = "bills" | "known";
const num = (v: number | "") => (v === "" ? 0 : v);
const HAZARD_KEYS = Object.keys(HAZARDS) as Hazard[];
const fmtT = (t: number) => t.toLocaleString("en-IN", { maximumFractionDigits: 1 });

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [mode, setMode] = useState<Mode>("bills");
  const [kwh, setKwh] = useState<number | "">("");
  const [diesel, setDiesel] = useState<number | "">("");
  const [known, setKnown] = useState<number | "">("");
  const [preset, setPreset] = useState<"ets" | "custom">("ets");
  const [custom, setCustom] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [euShare, setEuShare] = useState<number | "">("");
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [done, setDone] = useState(false);

  const em = useMemo(
    () => annualEmissions(mode === "known" ? { kwhPerMonth: 0, dieselLPerMonth: 0, knownT: num(known) } : { kwhPerMonth: num(kwh), dieselLPerMonth: num(diesel) }),
    [mode, kwh, diesel, known],
  );
  const price = preset === "ets" ? ETS_REFERENCE : num(custom);
  const cost = useMemo(() => carbonCost({ tonnes: em.total, priceEur: price, eurInr: num(rate), euSharePct: num(euShare) }), [em.total, price, rate, euShare]);

  useEffect(() => { onChange({ tonnes: em.total, price, rate: num(rate), hazards }); }, [em.total, price, rate, hazards, onChange]);

  useEffect(() => {
    if (!done) return;
    if (!cost) { onResult(null); return; }
    const cbam = cost.cbamEur !== null ? ` EU export share ${num(euShare)}%: CBAM-relevant cost about ${eur(cost.cbamEur)}${cost.cbamInr !== null ? ` (${inr(cost.cbamInr)})` : ""} a year (simplified).` : "";
    const phys = hazards.length ? ` Physical exposure: ${hazards.map(h => HAZARDS[h].exposure.split(":")[0].toLowerCase()).join(", ")}.` : "";
    onResult({
      headline: costHeadline(cost, price, true),
      summary: `Carbon price stress test. Scope 1 and 2 about ${fmtT(em.total)} tCO2e a year at ${priceLabel(price)}: ${eur(cost.eur)} a year${cost.inr !== null ? ` (${inr(cost.inr)} at the rate entered)` : ""}.${cbam}${phys}`,
      data: { tonnes: em.total, price, rate: num(rate), hazards },
    });
  }, [done, cost, em.total, price, rate, euShare, hazards, onResult]);

  const unset = () => setDone(false);
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-primary bg-primary/[0.08] text-foreground" : "border-border text-foreground/80 hover:border-primary/40"}`;

  return (
    <div>
      <Steps
        cta="See my carbon cost"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={[
          {
            key: "emissions", label: "What are your emissions a year?", ready: em.total > 0,
            content: (
              <div className="space-y-3">
                <Choice<Mode> options={[{ value: "bills", label: "From my bills" }, { value: "known", label: "I know my annual tCO₂e" }]} value={[mode]} onChange={v => { if (v[0]) { setMode(v[0]); unset(); } }} />
                {mode === "bills" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Electricity a month" unit="kWh" value={kwh} onChange={v => { setKwh(v); unset(); }} step={100} hint={`× ${INDIA_GRID_FACTOR_KG_PER_KWH} kg per kWh, India grid (CEA)`} />
                    <NumberField label="Diesel a month" unit="L" value={diesel} onChange={v => { setDiesel(v); unset(); }} step={10} hint={`× ${FUEL_FACTORS.DIESEL.value} kg per L`} />
                  </div>
                ) : (
                  <NumberField label="Scope 1 and 2 a year" unit="tCO₂e" value={known} onChange={v => { setKnown(v); unset(); }} step={1} />
                )}
                {em.total > 0 && <p className="text-xs text-muted-foreground">Scope 1 and 2: <span className="font-mono text-foreground">{fmtT(em.total)} t a year</span></p>}
              </div>
            ),
          },
          {
            key: "price", label: "Which carbon price should we test?", ready: price > 0,
            content: (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={preset === "ets"} onClick={() => { setPreset("ets"); unset(); }} className={chip(preset === "ets")}>
                    EU ETS reference used in our CBAM calculator, €{ETS_REFERENCE}
                  </button>
                  <button type="button" aria-pressed={preset === "custom"} onClick={() => { setPreset("custom"); unset(); }} className={chip(preset === "custom")}>Custom price</button>
                </div>
                {preset === "custom" && <NumberField label="Carbon price" unit="€/t" value={custom} onChange={v => { setCustom(v); unset(); }} step={1} />}
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="EUR to INR rate (enter today's rate)" unit="₹ per €" value={rate} onChange={v => { setRate(v); unset(); }} step={0.01} hint="Optional. Shows rupees." />
                  <NumberField label="Share of output exported to the EU" unit="%" value={euShare} onChange={v => { setEuShare(v); unset(); }} max={100} step={5} hint="Optional. CBAM-relevant cost, simplified." />
                </div>
              </div>
            ),
          },
          {
            key: "physical", label: "Does your main site face any of these? Optional.",
            content: <Choice multi options={HAZARD_KEYS.map(h => ({ value: h, label: HAZARDS[h].label }))} value={hazards} onChange={v => { setHazards(v); unset(); }} />,
          },
        ]}
      />
      {done && cost && (
        <div className="mt-5 space-y-2 rounded-2xl border border-border p-3.5 text-xs text-muted-foreground leading-relaxed">
          <p>Scope 1 and 2 {fmtT(em.total)} t × {priceLabel(price)} = <span className="font-mono text-foreground">{eur(cost.eur)}</span> a year{cost.inr !== null && <> (<span className="font-mono text-foreground">{inr(cost.inr)}</span> at your rate)</>}.</p>
          {cost.cbamEur !== null && (
            <p>CBAM-relevant cost (simplified): emissions × {num(euShare)}% EU share × price = <span className="font-mono text-foreground">{eur(cost.cbamEur)}</span>{cost.cbamInr !== null && <> ({inr(cost.cbamInr)})</>} a year.</p>
          )}
          {hazards.length > 0 && (
            <ul className="space-y-1 pt-1" aria-label="Physical exposure">
              {hazards.map(h => <li key={h} className="flex gap-2"><i className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pending" />{HAZARDS[h].exposure}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/** Sample: the base-year emissions in the roadmap preview on the decarbonisation page. */
const SAMPLE_T = 160.9;
const N = FAN_END - FAN_START;
type Pt = [number, number];

/**
 * Scenario fan. Annual carbon cost from 2026 to 2034 under two price paths,
 * drawn as extruded ribbons: flat at the chosen price, and a linear rise to
 * twice that price by 2034 (illustrative). The fan between them is the range
 * a buyer should plan for. Ribbons spring to new values as inputs change.
 * A small isometric site block carries the physical hazards the visitor
 * picked: a flood plane, a heat bar and a water tank level.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const live = Number(data.tonnes) > 0;
  const tonnes = live ? Number(data.tonnes) : SAMPLE_T;
  const price = Number(data.price) > 0 ? Number(data.price) : ETS_REFERENCE;
  const rate = Number(data.rate) > 0 ? Number(data.rate) : 0;
  const hz = (data.hazards as Hazard[] | undefined) ?? [];
  const flood = hz.includes("flood"), heat = hz.includes("heat"), water = hz.includes("water");
  const paths = useMemo(() => pricePaths(price), [price]);
  const base = tonnes * price;
  const sim = useRef({ v: 0, vv: 0, g: 0, vg: 0 });

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    const st = sim.current;
    // Cost level and the growth of the fan both settle on a damped spring.
    if (dt === 0) { st.v = base; st.g = 1; } else {
      st.vv += (-80 * (st.v - base) - 18 * st.vv) * dt; st.v += st.vv * dt;
      st.vg += (-40 * (st.g - 1) - 12 * st.vg) * dt; st.g += st.vg * dt;
    }
    ctx.clearRect(0, 0, w, h);
    const fs = Math.max(10, Math.min(12, w / 46));
    const dx = w * 0.05, dy = -w * 0.03;
    const L = fs * 4.4, R = 12 + dx, T = 14 - dy + fs * 1.8, B = fs * 2.4;
    const pw = w - L - R, ph = h - T - B;
    const max = base * 2.2;
    const X = (k: number) => L + (k / N) * pw;
    const Y = (v: number) => T + ph - (Math.max(0, v) / max) * ph;

    // Axes: cost in € a year, years along the bottom.
    ctx.font = `${fs}px ui-sans-serif, system-ui`;
    ctx.lineWidth = 1; ctx.strokeStyle = token("--border", 1); ctx.fillStyle = token("--muted-foreground", 1);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const f of [0, 0.5, 1, 1.5, 2]) {
      const v = base * f, y = Y(v);
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + dx, y + dy); ctx.lineTo(L + pw + dx, y + dy); ctx.stroke();
      ctx.fillText(v >= 10000 ? `€${Math.round(v / 1000).toLocaleString("en-IN")}k` : eur(v), L - 6, y);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const stepX = w < 500 ? 2 : 1;
    for (let k = 0; k <= N; k += stepX) ctx.fillText(String(FAN_START + k), X(k), T + ph + 6);
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("€ a year", 4, T - fs * 0.6);

    // A ribbon is the area under a path, extruded back by (dx, dy).
    const ribbon = (vals: number[], front: string, side: string, top: string) => {
      const pts: Pt[] = [];
      for (let k = 0; k <= N; k++) pts.push([X(k), Y(st.v * (1 + (vals[k] / price - 1) * st.g))]);
      for (let k = 0; k < N; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx + dx, by + dy); ctx.lineTo(ax + dx, ay + dy); ctx.closePath();
        ctx.fillStyle = top; ctx.fill();
      }
      const [ex, ey] = pts[N];
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + dx, ey + dy); ctx.lineTo(ex + dx, Y(0) + dy); ctx.lineTo(ex, Y(0)); ctx.closePath();
      ctx.fillStyle = side; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(X(N), Y(0)); ctx.closePath();
      ctx.fillStyle = front; ctx.fill();
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      return pts;
    };
    // Rising path sits behind, flat path in front.
    ribbon(paths.rise, token("--primary", 0.16), token("--primary", 0.22), token("--primary", 0.3));
    ctx.setLineDash([5, 4]); ctx.strokeStyle = token("--primary", 0.9); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ribbon(paths.flat, token("--primary", 0.55), token("--primary", 0.62), token("--primary", 0.75));
    ctx.strokeStyle = token("--primary", 1); ctx.lineWidth = 2; ctx.stroke();

    // End labels.
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillStyle = token("--foreground", 0.85);
    const riseEnd = Y(st.v * (1 + st.g)), flatEnd = Y(st.v);
    ctx.fillText(`2x by ${FAN_END}, illustrative: ${eur(base * 2)}`, X(N) - 2, riseEnd - 6);
    ctx.textBaseline = "top"; ctx.fillStyle = token("--primary-foreground", 1);
    ctx.fillText(`Flat ${priceLabel(price)}: ${eur(base)}`, X(N) - 6, flatEnd + 6);

    // Site block (isometric), top-left of the plot, above the fan.
    const s = Math.min(pw, ph) / 240;
    const ox = L + pw * 0.26, oy = T + ph * 0.24;
    const P = (x: number, y: number, z: number) => project(x, y, z, ox, oy, s);
    // A card behind the site so it reads as its own panel, not part of the cost axes.
    {
      const pts = [P(-30, -30, 0), P(40, -30, 0), P(40, 40, 0), P(-30, 40, 0), P(-30, -30, 46), P(40, 40, 46), P(40, -30, 46)];
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      const x0 = Math.min(...xs) - fs * 3.6, x1 = Math.max(...xs) + fs * 3.4;
      const y0 = Math.min(...ys) - 8, y1 = Math.max(...ys) + 8;
      ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 10);
      ctx.fillStyle = token("--background", 0.94); ctx.fill();
      ctx.strokeStyle = token("--border", 1); ctx.lineWidth = 1; ctx.stroke();
    }
    const plate = [P(-30, -30, 0), P(40, -30, 0), P(40, 40, 0), P(-30, 40, 0)];
    ctx.beginPath(); plate.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = token("--muted", 0.8); ctx.fill();
    if (flood) {
      // Flood plane: water standing around the base of the building.
      const fp = [P(-30, -30, 6), P(40, -30, 6), P(40, 40, 6), P(-30, 40, 6)];
      ctx.beginPath(); fp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = token("--pending", 0.25); ctx.fill(); ctx.strokeStyle = token("--pending", 0.9); ctx.lineWidth = 1; ctx.stroke();
    }
    isoBox(ctx, -14, -14, 0, 28, 28, 26, ox, oy, s, { top: token("--background", 1), left: token("--border", 1), right: token("--muted", 1), stroke: token("--foreground", 0.25) });
    // Heat bar beside the building.
    isoBox(ctx, 24, -22, 0, 6, 6, 40, ox, oy, s, { top: "transparent", left: "transparent", right: "transparent", stroke: token("--foreground", 0.25) });
    if (heat) isoBox(ctx, 24, -22, 0, 6, 6, 36, ox, oy, s, { top: token("--pending", 0.9), left: token("--pending", 0.7), right: token("--pending", 0.55) });
    // Water tank: level drops when supply is short.
    isoBox(ctx, -26, 20, 0, 10, 10, 22, ox, oy, s, { top: "transparent", left: "transparent", right: "transparent", stroke: token("--foreground", 0.25) });
    isoBox(ctx, -26, 20, 0, 10, 10, water ? 5 : 17, ox, oy, s, water
      ? { top: token("--pending", 0.9), left: token("--pending", 0.7), right: token("--pending", 0.55) }
      : { top: token("--muted-foreground", 0.3), left: token("--muted-foreground", 0.22), right: token("--muted-foreground", 0.16) });
    ctx.font = `${fs}px ui-sans-serif, system-ui`; ctx.textBaseline = "middle";
    const tag = (x: number, y: number, z: number, text: string, on: boolean, align: CanvasTextAlign, ddx: number) => {
      const [lx, ly] = P(x, y, z); ctx.textAlign = align;
      ctx.fillStyle = on ? token("--foreground", 0.9) : token("--muted-foreground", 0.8);
      ctx.fillText(text, lx + ddx, ly);
    };
    tag(30, -22, 40, "Heat", heat, "left", 6);
    tag(-26, 30, 12, "Water", water, "right", -6);
    tag(40, -30, 0, "Flood", flood, "left", 6);
  }, active);

  const chip = "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/85";
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img"
        aria-label={`Annual carbon cost ${FAN_START} to ${FAN_END}: ${eur(base)} a year at ${priceLabel(price)}, rising to ${eur(base * 2)} if the price doubles by ${FAN_END}. Hazards marked: ${hz.length ? hz.join(", ") : "none"}.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 ">
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Flat price</span>
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm border border-dashed border-primary bg-primary/20" />Rise to 2x, illustrative</span>
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-pending/70" />Hazard you picked</span>
          {rate > 0 && <span className={chip}>{inr(base * rate)} a year at your rate</span>}
        </div>
      </figcaption>
    </figure>
  );
};
