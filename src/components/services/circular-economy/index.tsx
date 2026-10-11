import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, NumberField, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { isoBox, project } from "../motion/iso";
import { CATEGORIES, ROLES, NEXT_STEP, eprFindings, eprHeadline, massBalance, tonnesPerParticle, type Category, type Role, type Status } from "./logic";

const CAT_KEYS = Object.keys(CATEGORIES) as Category[];
const ROLE_KEYS = Object.keys(ROLES) as Role[];
const fmt = (t: number) => t.toLocaleString("en-IN", { maximumFractionDigits: t < 100 ? 1 : 0 });
const STATUS_LABEL: Record<Status, string> = { applies: "Applies", check: "Check", none: "Generally not you" };
const BADGE: Record<Status, string> = {
  applies: "bg-primary text-primary-foreground",
  check: "bg-pending/15 text-foreground",
  none: "bg-secondary text-muted-foreground",
};

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [cats, setCats] = useState<Category[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tonnes, setTonnes] = useState<Partial<Record<Category, number | "">>>({});
  const [done, setDone] = useState(false);

  const findings = useMemo(() => (roles.length ? eprFindings(cats, roles) : []), [cats, roles]);
  const totalT = useMemo(() => cats.reduce((a, c) => a + (Number(tonnes[c]) || 0), 0), [cats, tonnes]);

  useEffect(() => { onChange({ cats, roles, totalT }); }, [cats, roles, totalT, onChange]);

  useEffect(() => {
    if (!done) return;
    if (!cats.length || !roles.length) { onResult(null); return; }
    const lines = findings.map(f => `${CATEGORIES[f.category].label}${Number(tonnes[f.category]) > 0 ? ` (${fmt(Number(tonnes[f.category]))} t a year)` : ""}: ${STATUS_LABEL[f.status]}. ${f.rule}.`);
    onResult({
      headline: eprHeadline(findings),
      summary: `EPR check. Role: ${roles.map(r => ROLES[r]).join(", ")}. ${lines.join(" ")} Next: ${NEXT_STEP}`,
      data: { cats, roles, totalT },
    });
  }, [done, findings, cats, roles, tonnes, totalT, onResult]);

  return (
    <div>
      <Steps
        cta="Check my EPR"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={[
          {
            key: "cats", label: "What do you put on the Indian market? Pick any.", ready: cats.length > 0,
            content: <Choice multi options={CAT_KEYS.map(c => ({ value: c, label: CATEGORIES[c].label }))} value={cats} onChange={v => { setCats(v); setDone(false); }} />,
          },
          {
            key: "role", label: "What is your role? Pick any that fit.", ready: roles.length > 0,
            content: <Choice multi options={ROLE_KEYS.map(r => ({ value: r, label: ROLES[r] }))} value={roles} onChange={v => { setRoles(v); setDone(false); }} />,
          },
          {
            key: "tonnes", label: "Roughly how many tonnes a year? Optional.",
            content: (
              <div className="grid gap-3 sm:grid-cols-2">
                {cats.map(c => (
                  <NumberField key={c} label={CATEGORIES[c].label} unit="t/yr" value={tonnes[c] ?? ""} step={1}
                    onChange={v => setTonnes(prev => ({ ...prev, [c]: v }))} />
                ))}
                <p className="sm:col-span-2 text-xs text-muted-foreground">Sizes the material loop. Not needed for the check.</p>
              </div>
            ),
          },
        ]}
      />
      {done && findings.length > 0 && (
        <div className="mt-5 space-y-3">
          <ul className="divide-y divide-border rounded-2xl border border-border" aria-label="EPR regimes">
            {findings.map(f => (
              <li key={f.category} className="px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{f.rule}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.note}</p>
              </li>
            ))}
          </ul>
          {findings.some(f => f.status !== "none") && <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-foreground">Next step:</span> {NEXT_STEP}</p>}
        </div>
      )}
    </div>
  );
};

/** Sample: plastic packaging placed on market in the EPR pack preview on this page. */
const SAMPLE_T = 86.4;
const L = 100; // loop side in world units
type V3 = [number, number, number];
// Particle paths (world coordinates). Index matches FLOW order below.
const PATHS: [V3, V3][] = [
  [[-55, 0, 0], [0, 0, 0]],   // virgin input -> placed on market
  [[0, 0, 0], [L, 0, 0]],     // placed on market -> use
  [[L, 0, 0], [L, L, 0]],     // use -> collection
  [[L, L, 0], [0, L, 0]],     // collection -> recycling
  [[0, L, 0], [0, 0, 0]],     // recycling -> back to production
  [[L, 0, 0], [L + 55, 0, -26]], // use -> leak to landfill
];

/**
 * The material loop as a 3D mass balance. Ribbons on an isometric floor run
 * placed on market -> use -> collection -> recycling -> back to production;
 * width is tonnes. What is not collected leaks down a ramp to landfill, and
 * virgin input tops the loop back up, so inflow always equals outflow. The
 * collection share is a scenario slider: closing the loop visibly thins the
 * leak. Each moving dot is a fixed number of tonnes (see legend).
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const [share, setShare] = useState(50);
  const cats = (data.cats as Category[] | undefined) ?? [];
  const visitorT = Number(data.totalT) || 0;
  const live = visitorT > 0;
  const placed = live ? visitorT : SAMPLE_T;
  const mb = massBalance(placed, share / 100);
  const tpp = tonnesPerParticle(placed);
  const flows = [mb.virgin, mb.placed, mb.placed, mb.collected, mb.recycled, mb.leaked];
  const sim = useRef({ f: [0, 0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0, 0] });

  useCanvasLoop(canvasRef, (ctx, { t, dt, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    const st = sim.current;
    // Ribbon widths glide to the new mass balance (damped spring).
    for (let i = 0; i < 6; i++) {
      if (dt === 0) { st.f[i] = flows[i]; st.v[i] = 0; continue; }
      st.v[i] += (-90 * (st.f[i] - flows[i]) - 19 * st.v[i]) * dt;
      st.f[i] += st.v[i] * dt;
    }
    // Fit the loop with room for pixel-sized labels on every side.
    const s = Math.min((w - 150) / 235, h / 190);
    const ox = w / 2 - 20 * s, oy = h / 2 - (76 * s - 10) / 2;
    const P = (x: number, y: number, z: number) => project(x, y, z, ox, oy, s);
    const Wmax = 26;
    const wid = (f: number) => Math.max(0.6, (Math.max(0, f) / placed) * Wmax);
    const fs = Math.max(10, Math.min(12, 11 * s / 1.6));

    // Floor plate.
    const fl = [P(-14, -14, 0), P(L + 14, -14, 0), P(L + 14, L + 14, 0), P(-14, L + 14, 0)];
    ctx.beginPath(); fl.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = token("--muted", 0.5); ctx.fill();

    const prim = { top: token("--primary", 0.85), left: token("--primary", 0.6), right: token("--primary", 0.45) };
    const muted = { top: token("--muted-foreground", 0.35), left: token("--muted-foreground", 0.25), right: token("--muted-foreground", 0.2) };
    const amber = { top: token("--pending", 0.75), left: token("--pending", 0.55), right: token("--pending", 0.4) };
    const H = 3;
    // Painter's order: back ribbons first.
    const wv = wid(st.f[0]), w1 = wid(st.f[1]), w2 = wid(st.f[2]), w3 = wid(st.f[3]), w4 = wid(st.f[4]), w5 = wid(st.f[5]);
    isoBox(ctx, -55, -wv / 2, 0, 55, wv, H, ox, oy, s, muted);
    isoBox(ctx, -w4 / 2, 0, 0, w4, L, H, ox, oy, s, prim);
    isoBox(ctx, 0, -w1 / 2, 0, L, w1, H, ox, oy, s, prim);
    // Leak ramp: a sloped band from Use down into a landfill pit.
    {
      const a = P(L, -w5 / 2, H), b = P(L + 55, -w5 / 2, -26 + H), c = P(L + 55, w5 / 2, -26 + H), d = P(L, w5 / 2, H);
      const a0 = P(L, w5 / 2, 0), b0 = P(L + 55, w5 / 2, -26);
      ctx.beginPath(); ctx.moveTo(...d); ctx.lineTo(...c); ctx.lineTo(...b0); ctx.lineTo(...a0); ctx.closePath(); ctx.fillStyle = amber.left; ctx.fill();
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fillStyle = amber.top; ctx.fill();
      // Pit outline.
      const pit = [P(L + 45, -18, -26), P(L + 70, -18, -26), P(L + 70, 18, -26), P(L + 45, 18, -26)];
      ctx.setLineDash([3, 3]); ctx.strokeStyle = token("--pending", 0.8); ctx.lineWidth = 1;
      ctx.beginPath(); pit.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    }
    isoBox(ctx, L - w2 / 2, 0, 0, w2, L, H, ox, oy, s, prim);
    isoBox(ctx, 0, L - w3 / 2, 0, L, w3, H, ox, oy, s, prim);
    // Stage blocks at the corners.
    const node = { top: token("--background", 1), left: token("--border", 1), right: token("--muted", 1), stroke: token("--primary", 0.5) };
    for (const [x, y] of [[0, 0], [L, 0], [L, L], [0, L]]) isoBox(ctx, x - 9, y - 9, 0, 18, 18, 10, ox, oy, s, node);

    // Particles: each dot is `tpp` tonnes, moving at one speed along its flow.
    ctx.fillStyle = token("--foreground", 0.75);
    const r = Math.max(1.6, 1.4 * s);
    for (let i = 0; i < 6; i++) {
      const n = Math.round(flows[i] / tpp);
      if (n <= 0) continue;
      const [A, B] = PATHS[i];
      for (let k = 0; k < n; k++) {
        const u = (k / n + t * 0.12) % 1;
        const lane = ((k % 3) - 1) * wid(st.f[i]) * 0.25;
        const alongX = Math.abs(B[0] - A[0]) > Math.abs(B[1] - A[1]);
        const x = A[0] + (B[0] - A[0]) * u + (alongX ? 0 : lane);
        const y = A[1] + (B[1] - A[1]) * u + (alongX ? lane : 0);
        const [px, py] = P(x, y, A[2] + (B[2] - A[2]) * u + H + 1);
        ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }
    }

    // Labels at each stage, placed away from ribbons.
    const label = (x: number, y: number, z: number, title: string, val: string, align: CanvasTextAlign, dy: number) => {
      const [lx, ly] = P(x, y, z);
      ctx.textAlign = align; ctx.textBaseline = "middle";
      ctx.font = `600 ${fs}px ui-sans-serif, system-ui`; ctx.fillStyle = token("--foreground", 0.85);
      ctx.fillText(title, lx, ly + dy);
      ctx.font = `${fs}px ui-monospace, monospace`; ctx.fillStyle = token("--muted-foreground", 1);
      ctx.fillText(val, lx, ly + dy + fs * 1.25);
    };
    label(0, 0, 10, "Placed on market", `${fmt(mb.placed)} t`, "center", -fs * 3.6);
    label(L + 9, 0, 10, "Use", "", "left", -fs * 2.4);
    label(L, L, 0, "Collection", `${fmt(mb.collected)} t`, "center", fs * 1.6);
    label(-14, L + 14, 0, "Recycling", `${fmt(mb.recycled)} t`, "right", -fs * 0.6);
    label(-62, 0, 0, "Virgin input", `${fmt(mb.virgin)} t`, "right", -fs * 0.6);
    label(L + 58, 0, -26, "Leak to landfill", `${fmt(mb.leaked)} t`, "center", fs * 1.8);
  }, active);

  const chip = "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/85";
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img"
        aria-label={`Material loop for ${fmt(placed)} t a year at ${share}% collection: ${fmt(mb.collected)} t back to production, ${fmt(mb.leaked)} t to landfill.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2.5">
        <label className="block">
          <span className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Scenario: collection share</span><span className="font-mono text-foreground">{share}%</span>
          </span>
          <input type="range" min={0} max={100} step={5} value={share} onChange={e => setShare(Number(e.target.value))}
            className="mt-1 w-full accent-[hsl(var(--primary))]" aria-label="Scenario collection share, percent" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}><i className="h-1.5 w-1.5 bg-foreground/75" />1 dot = {fmt(tpp)} t</span>
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-primary/80" />Loop</span>
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-pending/70" />Leak</span>
          <span className={chip}><i className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/35" />Virgin input</span>
          {cats.length > 0 && <span className={chip}>{cats.map(c => CATEGORIES[c].short).join(", ")}</span>}
        </div>
      </figcaption>
    </figure>
  );
};
