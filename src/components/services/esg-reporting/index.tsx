import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, Choice } from "../shell/Steps";
import { CompanyIdInput } from "../shell/CompanyIdInput";
import { useCompany } from "../shell/CompanyContext";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import {
  CAP_OPTIONS, FRAMEWORKS, FRAMEWORK_LABEL, STATUS_LABEL, TOPICS,
  frameworks, sharedTopics, summarise,
  type Buyer, type CapBand, type EsgInput, type Status,
} from "./logic";

const BUYERS: { value: Buyer; label: string; hint?: string }[] = [
  { value: "eu", label: "EU buyers" },
  { value: "cbam", label: "I export CBAM goods to the EU", hint: "Iron and steel, aluminium, cement, fertilisers, hydrogen, electricity" },
  { value: "listedIn", label: "Listed Indian customers" },
  { value: "investors", label: "Investors asking for climate data" },
];

const BADGE: Record<Status, string> = {
  required: "bg-primary text-primary-foreground",
  asked: "bg-pending/15 text-foreground border border-pending/50",
  optional: "bg-secondary text-muted-foreground",
  none: "bg-secondary text-muted-foreground",
};

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const { facts } = useCompany();
  const [cap, setCap] = useState<CapBand | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [euGroup, setEuGroup] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  // A CIN says whether the company is listed; preselect "Unlisted" when it is not.
  useEffect(() => { if (facts.listed === false && cap === null) setCap("unlisted"); }, [facts.listed, cap]);

  const input: EsgInput = useMemo(() => ({ cap, buyers, euGroup }), [cap, buyers, euGroup]);
  const list = useMemo(() => frameworks(input), [input]);

  useEffect(() => { onChange({ cap, buyers, euGroup }); }, [cap, buyers, euGroup, onChange]);

  useEffect(() => {
    if (!done) return;
    if (!cap || euGroup === null) { onResult(null); return; }
    const s = summarise(list);
    onResult({ headline: s.headline, summary: s.summary, data: { cap, buyers, euGroup } });
  }, [done, list, cap, buyers, euGroup, onResult]);

  const shown = list.filter(f => f.status !== "none");

  return (
    <div>
      <Steps
        cta="Show my frameworks"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={[
          { key: "company", label: "Your CIN or GSTIN? A CIN tells us if you are listed.", content: <CompanyIdInput askSector={false} /> },
          {
            key: "cap", label: "Are you listed in India? Roughly where by market cap?", ready: cap !== null,
            content: (
              <>
                <Choice options={CAP_OPTIONS} value={cap ? [cap] : []} onChange={v => setCap(v[0] ?? null)} />
                {facts.listed === true && <p className="mt-2 text-xs text-muted-foreground">Your CIN shows a listed company. Pick your band.</p>}
              </>
            ),
          },
          {
            key: "buyers", label: "Who do you sell to, and who asks for data? Pick any.",
            content: <Choice multi options={BUYERS} value={buyers} onChange={setBuyers} />,
          },
          {
            key: "eu", label: "Is your group in the EU with over 1,000 employees and €450 million turnover?", ready: euGroup !== null,
            content: <Choice options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={euGroup === null ? [] : [euGroup ? "yes" : "no"]} onChange={v => setEuGroup(v[0] === "yes")} />,
          },
        ]}
      />
      {done && cap && euGroup !== null && (
        <ul className="mt-5 divide-y divide-border rounded-2xl border border-border" aria-label="Frameworks for you">
          {shown.map(f => (
            <li key={f.id} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-start sm:gap-3">
              <span className="w-24 shrink-0 text-sm font-medium">{FRAMEWORK_LABEL[f.id]}</span>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground leading-relaxed">
                <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                {f.why}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SAMPLE: EsgInput = { cap: "top1000", buyers: ["eu", "cbam"], euGroup: false };
// Orbit radius per status, as a share of the scene radius.
const ORBIT: Record<Status, number> = { required: 0.44, asked: 0.6, optional: 0.74, none: 1 };
const N = FRAMEWORKS.length;
const PAIRS: [number, number, number][] = [];
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) PAIRS.push([a, b, sharedTopics(FRAMEWORKS[a], FRAMEWORKS[b])]);

/**
 * One ledger, many frameworks. A force-directed graph in perspective 3D:
 * the verified ledger sits at the centre; each framework hangs on a spring
 * whose rest length is set by its status, so the ones that apply are pulled
 * into a tight orbit and the rest drift to the outer ring. Frameworks that
 * apply also attract each other in proportion to the data topics they share,
 * and line width shows that reuse. Depth sorting gives the 3D read.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const sample = !data.cap || data.euGroup === undefined || data.euGroup === null;
  const input: EsgInput = sample
    ? SAMPLE
    : { cap: data.cap as CapBand, buyers: (data.buyers as Buyer[]) ?? [], euGroup: !!data.euGroup };
  const key = `${input.cap}|${input.buyers.join(",")}|${input.euGroup}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => frameworks(input), [key]);
  const status = list.map(f => f.status);

  const sim = useRef<{ p: Float32Array; v: Float32Array; order: number[]; sx: Float32Array; sy: Float32Array; sz: Float32Array } | null>(null);
  if (!sim.current) {
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.35;
      p[i * 3] = Math.cos(a); p[i * 3 + 1] = (i % 2 ? 0.06 : -0.06); p[i * 3 + 2] = Math.sin(a);
    }
    sim.current = { p, v: new Float32Array(N * 3), order: [...Array(N + 1).keys()], sx: new Float32Array(N + 1), sy: new Float32Array(N + 1), sz: new Float32Array(N + 1) };
  }

  // One physics step in scene units (radius 1).
  const step = (h: number) => {
    const { p, v } = sim.current!;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const x = p[o], y = p[o + 1], z = p[o + 2];
      const r = Math.hypot(x, y, z) || 1e-3;
      // Hooke: radial spring towards this framework's orbit.
      const fr = -14 * (r - ORBIT[status[i]]) / r;
      let fx = fr * x, fy = fr * y - 10 * y, fz = fr * z;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const q = j * 3;
        const dx = x - p[q], dy = y - p[q + 1], dz = z - p[q + 2];
        const d2 = Math.max(0.01, dx * dx + dy * dy + dz * dz);
        const f = 0.09 / (d2 * Math.sqrt(d2)); // Coulomb repulsion
        fx += f * dx; fy += f * dy * 0.3; fz += f * dz;
      }
      fx -= 5 * v[o]; fy -= 5 * v[o + 1]; fz -= 5 * v[o + 2]; // drag
      v[o] += fx * h; v[o + 1] += fy * h; v[o + 2] += fz * h;
    }
    // Data-reuse springs between applicable frameworks: more shared topics, stronger pull.
    for (const [a, b, s] of PAIRS) {
      if (status[a] === "none" || status[b] === "none") continue;
      const A = a * 3, B = b * 3;
      const dx = p[B] - p[A], dy = p[B + 1] - p[A + 1], dz = p[B + 2] - p[A + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-3;
      const f = 0.12 * s * (d - 0.6) / d * h;
      v[A] += f * dx; v[A + 1] += f * dy; v[A + 2] += f * dz;
      v[B] -= f * dx; v[B + 1] -= f * dy; v[B + 2] -= f * dz;
    }
    for (let k = 0; k < N * 3; k++) p[k] += v[k] * h;
  };

  const acc = useRef(0);
  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    if (dt === 0) for (let k = 0; k < 600; k++) step(1 / 60); // settled frame for reduced motion
    else { acc.current += dt; while (acc.current > 1 / 120) { step(1 / 120); acc.current -= 1 / 120; } }
    const S = sim.current!;
    ctx.clearRect(0, 0, w, h);
    const R = Math.min(w * 0.43, h * 0.6);
    const cx = w / 2, cy = h * 0.47;
    const el = 0.72, ce = Math.cos(el), se = Math.sin(el), f = 3.2;
    const proj = (x: number, y: number, z: number, k: number) => {
      const depth = z * ce + y * se;
      const s = f / (f - depth);
      S.sx[k] = cx + x * R * s; S.sy[k] = cy - (y * ce - z * se) * R * s; S.sz[k] = depth;
    };
    for (let i = 0; i < N; i++) proj(S.p[i * 3], S.p[i * 3 + 1], S.p[i * 3 + 2], i);
    proj(0, 0, 0, N);

    // Orbit guides: outer ring for frameworks that do not apply.
    const ring = (r: number, alpha: number, dash: number[]) => {
      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const s = f / (f - z * ce);
        const px = cx + x * R * s, py = cy + z * se * R * s;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.setLineDash(dash); ctx.strokeStyle = token("--muted-foreground", alpha); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    };
    ring(1, 0.25, [3, 4]);
    ring(ORBIT.required, 0.18, []);

    // Edges: framework to framework (shared topics) then ledger to framework.
    for (const [a, b, s] of PAIRS) {
      if (status[a] === "none" || status[b] === "none" || s < 3) continue;
      ctx.beginPath(); ctx.moveTo(S.sx[a], S.sy[a]); ctx.lineTo(S.sx[b], S.sy[b]);
      ctx.strokeStyle = token("--primary", 0.12); ctx.lineWidth = 0.4 * s; ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      if (status[i] === "none") continue;
      ctx.beginPath(); ctx.moveTo(S.sx[N], S.sy[N]); ctx.lineTo(S.sx[i], S.sy[i]);
      ctx.strokeStyle = status[i] === "asked" ? token("--pending", 0.55) : token("--primary", status[i] === "required" ? 0.55 : 0.22);
      ctx.lineWidth = 0.5 * TOPICS[FRAMEWORKS[i]].length; ctx.stroke();
    }

    // Depth-sorted nodes, back to front.
    S.order.sort((a, b) => S.sz[a] - S.sz[b]);
    const fs = Math.max(10, Math.min(12, w / 40));
    for (const k of S.order) {
      const x = S.sx[k], y = S.sy[k], s = f / (f - S.sz[k]);
      if (k === N) {
        // The ledger: a stack of sheets.
        for (let l = 0; l < 4; l++) {
          ctx.beginPath(); ctx.ellipse(x, y + 6 - l * 4, 20 * s, 8 * s, 0, 0, Math.PI * 2);
          ctx.fillStyle = token("--primary", 0.55 + l * 0.15); ctx.fill();
          ctx.strokeStyle = token("--background", 0.9); ctx.lineWidth = 1; ctx.stroke();
        }
        continue;
      }
      const st = status[k];
      const r = (st === "none" ? 4.5 : st === "optional" ? 6 : 8.5) * s;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = st === "required" ? token("--primary") : st === "asked" ? token("--pending") : st === "optional" ? token("--muted-foreground", 0.55) : token("--muted-foreground", 0.18);
      ctx.fill();
      ctx.strokeStyle = token("--background"); ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Labels last so nodes never cover them; simple collision avoidance.
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const order = [...Array(N).keys()].sort((a, b) => (status[a] === "none" ? 1 : 0) - (status[b] === "none" ? 1 : 0));
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui`;
    const ledW = ctx.measureText("Verified ledger").width / 2 + 3;
    const boxes: [number, number, number, number][] = [[S.sx[N] - Math.max(24, ledW), S.sy[N] - 14, S.sx[N] + Math.max(24, ledW), S.sy[N] + 24 + fs / 2 + 1]];
    for (const i of order) {
      const st = status[i];
      ctx.font = `${st === "none" ? 400 : 600} ${fs}px ui-sans-serif, system-ui`;
      const text = FRAMEWORK_LABEL[FRAMEWORKS[i]];
      const tw = ctx.measureText(text).width;
      const below = S.sy[i] >= S.sy[N];
      const cands = below ? [14, -14, 26, -26] : [-14, 14, -26, 26];
      let ly = S.sy[i] + cands[0];
      let lx = Math.min(w - tw / 2 - 4, Math.max(tw / 2 + 4, S.sx[i]));
      for (const c of cands) {
        ly = S.sy[i] + c;
        const bx: [number, number, number, number] = [lx - tw / 2 - 2, ly - fs / 2 - 1, lx + tw / 2 + 2, ly + fs / 2 + 1];
        if (!boxes.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) break;
      }
      ly = Math.min(h - fs, Math.max(fs, ly));
      lx = Math.min(w - tw / 2 - 4, Math.max(tw / 2 + 4, lx));
      boxes.push([lx - tw / 2 - 2, ly - fs / 2 - 1, lx + tw / 2 + 2, ly + fs / 2 + 1]);
      ctx.fillStyle = st === "none" ? token("--muted-foreground", 0.55) : token("--foreground", 0.9);
      ctx.fillText(text, lx, ly);
    }
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui`;
    ctx.fillStyle = token("--primary");
    ctx.fillText("Verified ledger", S.sx[N], S.sy[N] + 24);
  }, active);

  const chip = (cls: string, text: string) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={`h-2.5 w-2.5 rounded-full ${cls}`} />{text}</span>
  );

  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas
        ref={canvasRef}
        className="block w-full aspect-[4/3]"
        role="img"
        aria-label={`One ledger feeding frameworks. ${list.filter(l => l.status !== "none").map(l => `${FRAMEWORK_LABEL[l.id]}: ${STATUS_LABEL[l.status]}`).join("; ")}`}
      />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {chip("bg-primary", "Required")}
          {chip("bg-pending", "Asked by buyers")}
          {chip("bg-muted-foreground/55", "Optional")}
          {chip("bg-muted-foreground/20", "Outer ring: not for you now")}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Line width: data topics shared.</p>
      </figcaption>
    </figure>
  );
};
