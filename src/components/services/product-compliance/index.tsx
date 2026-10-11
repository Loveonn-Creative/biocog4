import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { project } from "../motion/iso";
import {
  BATTERY_PASSPORT_DATE, BATTERY_PASSPORT_LABEL, LAYERS, PRODUCT_LABEL, checklist, daysUntil, isBattery, productHeadline, productSummary, statusLabel,
  type Battery, type LayerState, type Product, type ProductInput, type Status, type Tri,
} from "./logic";

type Kind = "battery" | Exclude<Product, Battery>;
const KINDS: { value: Kind; label: string }[] = [
  { value: "battery", label: "Battery" }, { value: "textiles", label: "Textiles or apparel" },
  { value: "steel_aluminium", label: "Steel or aluminium product" }, { value: "electronics", label: "Electronics or electrical" },
  { value: "furniture", label: "Furniture" }, { value: "chemical", label: "Chemical or mixture" }, { value: "other", label: "Other" },
];
const BATTERIES: { value: Battery; label: string }[] = [
  { value: "battery_ev", label: "EV" }, { value: "battery_industrial", label: "Industrial, over 2 kWh" },
  { value: "battery_lmt", label: "LMT", }, { value: "battery_portable", label: "Portable" },
];
const TRI: { value: Tri; label: string }[] = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }];

const TriRow = ({ label, value, set }: { label: string; value?: Tri; set: (v: Tri) => void }) => (
  <div className="mb-3 last:mb-0">
    <p className="text-sm text-foreground/85 mb-1.5">{label}</p>
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={label}>
      {TRI.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => set(o.value)}
          className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${value === o.value ? "border-primary bg-primary/[0.08] text-foreground" : "border-border text-foreground/80 hover:border-primary/40"}`}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const BADGE: Record<Status, string> = {
  required: "bg-primary text-primary-foreground",
  prepare: "border border-pending text-foreground",
  check: "border border-border text-muted-foreground",
};

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [kind, setKind] = useState<Kind>();
  const [battery, setBattery] = useState<Battery>();
  const [eu, setEu] = useState<"yes" | "no">();
  const [pfas, setPfas] = useState<Tri>();
  const [svhc, setSvhc] = useState<Tri>();
  const [done, setDone] = useState(false);
  const product: Product | undefined = kind === "battery" ? battery : kind;
  const input: ProductInput = useMemo(() => ({ product, eu, pfas, svhc }), [product, eu, pfas, svhc]);
  const list = useMemo(() => checklist(input), [input]);
  const complete = !!product && !!eu && !!pfas && !!svhc;

  useEffect(() => { onChange({ ...input }); }, [input, onChange]);
  useEffect(() => {
    if (!done) return;
    onResult(complete ? { headline: productHeadline(input, new Date()), summary: productSummary(input), data: { ...input } } : null);
  }, [done, complete, input, onResult]);

  return (
    <>
      <Steps
        cta="Show my product checklist"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={[
          {
            key: "product", label: "What is your product?", ready: !!product,
            content: (
              <div className="space-y-3">
                <Choice options={KINDS} value={kind ? [kind] : []} onChange={v => v[0] && setKind(v[0])} />
                {kind === "battery" && (
                  <div>
                    <p className="text-sm text-foreground/85 mb-1.5">Which battery type?</p>
                    <Choice options={BATTERIES} value={battery ? [battery] : []} onChange={v => v[0] && setBattery(v[0])} />
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "eu", label: "Do you sell into the EU?", ready: !!eu,
            content: <Choice options={[{ value: "yes", label: "Yes", hint: "Directly or via an EU importer" }, { value: "no", label: "No, not yet" }]} value={eu ? [eu] : []} onChange={v => v[0] && setEu(v[0] as "yes" | "no")} />,
          },
          {
            key: "substances", label: "Does it contain or use these?", ready: !!pfas && !!svhc,
            content: (
              <>
                <TriRow label="PFAS, in parts, coatings or processing" value={pfas} set={setPfas} />
                <TriRow label="REACH Candidate List substances (SVHC)" value={svhc} set={setSvhc} />
              </>
            ),
          },
        ]}
      />
      {done && complete && (
        <ul className="mt-5 space-y-2">
          {list.items.map(x => (
            <li key={x.id} className="rounded-2xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[x.status]}`}>{statusLabel(x.status)}</span>
                <span className="text-sm font-medium text-foreground">{x.title}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{x.detail} <span className="text-xs">({x.source})</span></p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

// ---- Visual: the passport assembling ------------------------------------------
// Six data layers of a Digital Product Passport as isometric slabs. Layers the
// checklist asks for slide together on springs into one passport (required:
// solid; prepare now: amber outline); layers it does not ask for hang apart,
// ghosted. For passport batteries a ring counts down the months to the date.

const SAMPLE: ProductInput = { product: "battery_ev", eu: "yes", pfas: "unsure", svhc: "unsure" };
const T = 7; // slab thickness
const GAP: Record<LayerState, number> = { required: 5, prepare: 11, check: 26, none: 26 };
const MAXGAP = 26;
const NL = LAYERS.length;

export const Visual = ({ data, result }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const live = data as ProductInput;
  const sample = !live.product;
  const input = sample ? SAMPLE : { ...live, eu: live.eu ?? "yes" };
  const c = checklist(input);
  const days = useMemo(() => daysUntil(BATTERY_PASSPORT_DATE, new Date()), []);
  const states = LAYERS.map(l => c.layers[l.key]);

  const sim = useRef({ g: new Float32Array(NL).fill(MAXGAP), gv: new Float32Array(NL), ring: 0, rv: 0, ly: new Float32Array(NL) });

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    const st = sim.current;
    // Gap below each layer springs (k 70, damping 10) to the looser of its two neighbours.
    for (let i = 1; i < NL; i++) {
      const target = Math.max(GAP[states[i]], GAP[states[i - 1]]);
      if (dt === 0) { st.g[i] = target; st.gv[i] = 0; continue; }
      st.gv[i] += (-70 * (st.g[i] - target) - 10 * st.gv[i]) * dt;
      st.g[i] += st.gv[i] * dt;
    }
    const months = c.passport ? Math.min(12, Math.max(0, days / 30.44)) : 0;
    if (dt === 0) st.ring = months; else { st.rv += (-40 * (st.ring - months) - 12.6 * st.rv) * dt; st.ring += st.rv * dt; }

    ctx.clearRect(0, 0, w, h);
    const m = 12;
    const fs = Math.max(10, Math.min(13, w / 40));
    const span = NL * T + (NL - 1) * MAXGAP; // fully exploded
    const s = Math.min((h - 2 * m - 10) / (100 + span), (w * 0.48) / 173);
    const ox = m + 8 + 86.6 * s;
    // Centre the stack's current height in the space left of the labels.
    let zTop = T;
    for (let i = 1; i < NL; i++) zTop += T + st.g[i];
    const oy = h / 2 + (zTop * s) / 2;

    const P = (x: number, y: number, z: number) => project(x, y, z, ox, oy, s);
    const poly = (pts: [number, number][]) => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
    const primary = [token("--primary", 0.92), token("--primary", 0.7), token("--primary", 0.52)];
    const primaryB = [token("--primary", 0.78), token("--primary", 0.6), token("--primary", 0.44)];
    const amber = [token("--pending", 0.16), token("--pending", 0.3), token("--pending", 0.42)];
    const card = token("--card");
    const ghost = [token("--muted-foreground", 0.07), token("--muted-foreground", 0.05), token("--muted-foreground", 0.04)];

    let z = 0;
    const cornerY: number[] = [];
    for (let i = 0; i < NL; i++) {
      if (i > 0) z += T + st.g[i];
      const sState = states[i];
      const f = sState === "required" ? (i % 2 ? primaryB : primary) : sState === "prepare" ? amber : ghost;
      const top: [number, number][] = [P(-50, -50, z + T), P(50, -50, z + T), P(50, 50, z + T), P(-50, 50, z + T)];
      // Layers in the passport are opaque (card underneath); ghosts stay see-through.
      const solid = sState === "required" || sState === "prepare";
      const face = (pts: [number, number][], fill: string) => { poly(pts); if (solid) { ctx.fillStyle = card; ctx.fill(); } ctx.fillStyle = fill; ctx.fill(); };
      face([P(-50, 50, z), P(50, 50, z), P(50, 50, z + T), P(-50, 50, z + T)], f[1]);
      face([P(50, -50, z), P(50, 50, z), P(50, 50, z + T), P(50, -50, z + T)], f[2]);
      face(top, f[0]);
      ctx.lineWidth = 1.1;
      ctx.setLineDash(sState === "prepare" ? [5, 3] : sState === "required" ? [] : [2, 3]);
      ctx.strokeStyle = sState === "required" ? token("--primary") : sState === "prepare" ? token("--pending", 0.9) : token("--muted-foreground", 0.35);
      ctx.stroke();
      ctx.setLineDash([]);
      if (LAYERS[i].key === "qr" && sState !== "none" && sState !== "check") {
        // QR access: three finder squares on the top face.
        ctx.strokeStyle = sState === "required" ? token("--primary-foreground", 0.9) : token("--pending", 0.9);
        ctx.lineWidth = 1;
        for (const [u, v] of [[-38, -38], [14, -38], [-38, 14]]) { poly([P(u, v, z + T), P(u + 24, v, z + T), P(u + 24, v + 24, z + T), P(u, v + 24, z + T)]); ctx.stroke(); }
      }
      cornerY[i] = P(50, -50, z + T / 2)[1];
    }

    // Countdown ring: 12 month ticks, filled for the months left to the date.
    const r = Math.max(22, Math.min(w, h) * 0.1);
    let minY = m + fs;
    if (c.passport) {
      const rx = w - m - r - 4, ry = m + r + 2;
      ctx.lineWidth = Math.max(4, r * 0.18);
      for (let k = 0; k < 12; k++) {
        const a0 = -Math.PI / 2 + (k / 12) * Math.PI * 2 + 0.05, a1 = -Math.PI / 2 + ((k + 1) / 12) * Math.PI * 2 - 0.05;
        const fill = Math.max(0, Math.min(1, st.ring - k));
        ctx.strokeStyle = token("--muted-foreground", 0.18);
        ctx.beginPath(); ctx.arc(rx, ry, r, a0, a1); ctx.stroke();
        if (fill > 0) { ctx.strokeStyle = token("--primary"); ctx.beginPath(); ctx.arc(rx, ry, r, a0, a0 + (a1 - a0) * fill); ctx.stroke(); }
      }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = token("--foreground", 0.9);
      ctx.font = `600 ${Math.max(12, r * 0.5)}px ui-monospace, monospace`;
      ctx.fillText(String(Math.max(0, days)), rx, ry - r * 0.12);
      ctx.font = `500 10px ui-sans-serif, system-ui`;
      ctx.fillStyle = token("--muted-foreground");
      ctx.fillText("days", rx, ry + r * 0.38);
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.font = `500 ${fs}px ui-sans-serif, system-ui`;
      ctx.fillText(days > 0 ? `to ${BATTERY_PASSPORT_LABEL}` : `since ${BATTERY_PASSPORT_LABEL}`, w - m, ry + r + 8);
      minY = ry + r + 8 + fs + 14;
    }

    // Labels in a column right of the stack, kept at least one line apart.
    const lx = ox + 86.6 * s + 22;
    const gapY = fs + 5;
    for (let i = 0; i < NL; i++) st.ly[i] = cornerY[i];
    for (let i = 1; i < NL; i++) st.ly[i] = Math.min(st.ly[i], st.ly[i - 1] - gapY);
    if (st.ly[NL - 1] < minY) { st.ly[NL - 1] = minY; for (let i = NL - 2; i >= 0; i--) st.ly[i] = Math.max(st.ly[i], st.ly[i + 1] + gapY); }
    ctx.font = `500 ${fs}px ui-sans-serif, system-ui`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let i = 0; i < NL; i++) {
      const sState = states[i], y = st.ly[i];
      const on = sState === "required" || sState === "prepare";
      ctx.strokeStyle = token("--muted-foreground", on ? 0.5 : 0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox + 86.6 * s + 3, cornerY[i]); ctx.lineTo(lx - 12, y); ctx.lineTo(lx - 4, y); ctx.stroke();
      ctx.fillStyle = on ? token("--foreground", sState === "required" ? 0.9 : 0.75) : token("--muted-foreground", 0.7);
      ctx.fillText(LAYERS[i].label, lx, y);
    }
  }, active);

  const chip = (k: "required" | "prepare" | "ghost", text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <i className={`inline-block h-2.5 w-2.5 rounded-[2px] ${k === "required" ? "bg-primary" : k === "prepare" ? "border border-dashed border-pending bg-pending/20" : "border border-dashed border-muted-foreground/50"}`} />{text}
    </span>
  );
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img"
        aria-label={`Digital Product Passport layers for ${PRODUCT_LABEL[input.product ?? "other"]}: ${c.required} required, ${c.prepare} to prepare now.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 -mt-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`rounded-full px-2.5 py-1 font-medium ${sample ? "border border-border text-foreground" : "bg-primary text-primary-foreground"}`}>
            {PRODUCT_LABEL[input.product ?? "other"]}{isBattery(input.product) && !c.passport ? ": no passport" : ""}
          </span>
          {chip("required", "Required")}
          {chip("prepare", "Prepare now")}
          {chip("ghost", "Not on your list")}
        </div>
        {c.passport && <p className="mt-1.5">Ring: 12 months, filled for months left.</p>}
      </figcaption>
    </figure>
  );
};
