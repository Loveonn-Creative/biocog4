import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { CONTROLS, readiness, readinessHeadline, readinessSummary, type Answer, type Answers, type ControlKey } from "./logic";

const OPTS: { value: Answer; label: string }[] = [
  { value: "yes", label: "Yes" }, { value: "partly", label: "Partly" }, { value: "no", label: "No" },
];
const Q = Object.fromEntries(CONTROLS.map(c => [c.key, c])) as Record<ControlKey, (typeof CONTROLS)[number]>;

/** One yes / partly / no question as a three-way segmented control. */
const Tri = ({ k, value, set }: { k: ControlKey; value?: Answer; set: (k: ControlKey, a: Answer) => void }) => (
  <div className="mb-3 last:mb-0">
    <p className="text-sm text-foreground/85 mb-1.5">{Q[k].question}</p>
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={Q[k].question}>
      {OPTS.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => set(k, o.value)}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${on ? "border-primary bg-primary/[0.08] text-foreground" : "border-border text-foreground/80 hover:border-primary/40"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

const GROUPS: { key: string; label: string; ks: ControlKey[] }[] = [
  { key: "trace", label: "Can you trace each figure?", ks: ["source", "owner"] },
  { key: "method", label: "Is the method on record?", ks: ["factor", "changelog"] },
  { key: "match", label: "Does it match other records?", ks: ["finance", "supplier"] },
  { key: "check", label: "Has anyone checked it?", ks: ["review"] },
];

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const set = (k: ControlKey, a: Answer) => setAnswers(p => ({ ...p, [k]: a }));
  const r = useMemo(() => readiness(answers), [answers]);

  useEffect(() => { onChange({ answers }); }, [answers, onChange]);
  useEffect(() => {
    if (!done) return;
    onResult(r.complete ? { headline: readinessHeadline(answers), summary: readinessSummary(answers), data: { answers, pct: r.pct } } : null);
  }, [done, answers, r, onResult]);

  return (
    <>
      <Steps
        cta="Check my score"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={GROUPS.map(g => ({
          key: g.key, label: g.label, ready: g.ks.every(k => answers[k]),
          content: <>{g.ks.map(k => <Tri key={k} k={k} value={answers[k]} set={set} />)}</>,
        }))}
      />
      {done && r.complete && r.top.length > 0 && (
        <ol className="mt-5 space-y-2.5">
          {r.top.map((g, i) => (
            <li key={g.control.key} className="flex gap-3 rounded-2xl border border-border p-3">
              <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full text-[11px] font-semibold grid place-items-center text-white ${g.answer === "no" ? "bg-destructive" : "bg-pending"}`}>{i + 1}</span>
              <span className="text-sm">
                <span className="block font-medium text-foreground first-letter:uppercase">{g.phrase}</span>
                <span className="block text-muted-foreground">{g.control.senseible}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
};

// ---- Visual: data lineage as a spatial graph -------------------------------
// Back row: where data comes from. Middle: the documents. Front: the ledger.
// Each edge is one control. A pulse is one piece of evidence travelling from
// source to ledger; it only gets through edges that are intact.

const NODES = [
  { label: "Facility A", kind: 0, a: [-1.1, -0.62, 1.6] },
  { label: "Facility B", kind: 0, a: [0, -0.7, 1.6] },
  { label: "Supplier", kind: 0, a: [1.1, -0.62, 1.6] },
  { label: "Bill", kind: 1, a: [-0.72, -0.02, 0.8] },
  { label: "Invoice", kind: 1, a: [0, -0.06, 0.8] },
  { label: "Declaration", kind: 1, a: [0.72, -0.02, 0.8] },
  { label: "Ledger", kind: 2, a: [0, 0.6, 0] },
] as const;
// Edge i = [from, to, control]. Paths run source -> document -> ledger.
const EDGES: [number, number, ControlKey][] = [
  [0, 3, "source"], [1, 4, "owner"], [2, 5, "supplier"],
  [3, 6, "factor"], [4, 6, "finance"], [5, 6, "changelog"],
];
const PATHS = [[0, 3], [1, 4], [2, 5]];
const EDGE_NUM: Record<ControlKey, number> = { source: 1, owner: 2, factor: 3, changelog: 4, finance: 5, supplier: 6, review: 7 };
const SAMPLE: Answers = { source: "no", owner: "yes", factor: "partly", changelog: "no", finance: "yes", supplier: "partly", review: "no" };

const N = NODES.length;
const D = 3.2; // camera distance; focal length equals D so the front row has scale 1

export const Visual = ({ data, result }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const live = (data.answers as Answers | undefined) ?? {};
  const sample = Object.keys(live).length === 0;
  const answers = sample ? SAMPLE : live;
  const r = readiness(answers);

  // Physics state, allocated once: position, velocity, screen x/y/scale, depth.
  const sim = useRef<{ p: Float32Array; v: Float32Array; s: Float32Array; order: number[]; arrive: Float32Array; init: boolean } | null>(null);
  if (!sim.current) {
    const p = new Float32Array(N * 3);
    NODES.forEach((n, i) => { p[i * 3] = n.a[0]; p[i * 3 + 1] = n.a[1]; p[i * 3 + 2] = n.a[2]; });
    sim.current = { p, v: new Float32Array(N * 3), s: new Float32Array(N * 4), order: NODES.map((_, i) => i), arrive: new Float32Array(3).fill(-9), init: false };
  }

  useCanvasLoop(canvasRef, (ctx, { t, dt, w, h }) => {
    const S0 = sim.current!;
    const { p, v, s, order, arrive } = S0;
    // Spring layout: Hooke springs to anchors plus one spring per edge. An
    // edge answered "no" has a longer rest length, so a broken control
    // visibly pushes its two ends apart.
    const stepPhysics = (h2: number) => {
      for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        v[j] += (-14 * (p[j] - NODES[i].a[k]) - 5 * v[j]) * h2;
      }
      for (const [a, b, key] of EDGES) {
        const ans = answers[key];
        const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2];
        const len = Math.hypot(dx, dy, dz) || 1;
        const ax = NODES[b].a[0] - NODES[a].a[0], ay = NODES[b].a[1] - NODES[a].a[1], az = NODES[b].a[2] - NODES[a].a[2];
        const rest = Math.hypot(ax, ay, az) * (ans === "no" ? 1.22 : 1);
        const f = (ans === "no" ? 10 : 6) * (len - rest) / len;
        const wa = a === 6 ? 0.15 : 1, wb = b === 6 ? 0.15 : 1; // the ledger is heavy
        v[a * 3] += f * dx * h2 * wa; v[a * 3 + 1] += f * dy * h2 * wa; v[a * 3 + 2] += f * dz * h2 * wa;
        v[b * 3] -= f * dx * h2 * wb; v[b * 3 + 1] -= f * dy * h2 * wb; v[b * 3 + 2] -= f * dz * h2 * wb;
      }
      for (let j = 0; j < N * 3; j++) p[j] += v[j] * h2;
    };
    if (dt === 0 || !S0.init) { for (let n = 0; n < 240; n++) stepPhysics(1 / 60); S0.init = true; }
    else { stepPhysics(dt / 2); stepPhysics(dt / 2); }

    // Perspective camera with a slow, small yaw so depth reads as depth.
    const yaw = dt === 0 ? -0.18 : -0.18 + 0.14 * Math.sin(t * 0.25);
    const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
    const S = Math.min(w * 0.4, h * 0.62);
    const cx = w / 2, cy = h * 0.46;
    for (let i = 0; i < N; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2] - 0.8;
      const xr = x * cy0 - z * sy0, zr = x * sy0 + z * cy0 + 0.8;
      const k = D / (zr + D);
      s[i * 4] = cx + xr * k * S; s[i * 4 + 1] = cy + y * k * S; s[i * 4 + 2] = k; s[i * 4 + 3] = zr;
    }

    ctx.clearRect(0, 0, w, h);
    const u = S / 140; // size unit
    const fs = Math.max(10, 10.5 * u);
    const green = token("--verified"), amber = token("--pending"), red = token("--destructive"), mute = token("--muted-foreground", 0.45);
    const colourOf = (a?: Answer) => (a === "yes" ? green : a === "partly" ? amber : a === "no" ? red : mute);
    const lerp = (a: number, b: number, f: number): [number, number] => [s[a * 4] + (s[b * 4] - s[a * 4]) * f, s[a * 4 + 1] + (s[b * 4 + 1] - s[a * 4 + 1]) * f];

    // Edges, back to front.
    for (let e = 0; e < EDGES.length; e++) {
      const [a, b, key] = EDGES[e];
      const ans = answers[key];
      ctx.strokeStyle = colourOf(ans);
      ctx.lineWidth = ans === "yes" ? 2.2 : 1.8;
      ctx.setLineDash(ans === "partly" ? [6, 4] : ans ? [] : [1.5, 4]);
      ctx.beginPath();
      if (ans === "no") {
        const [x1, y1] = lerp(a, b, 0.36), [x2, y2] = lerp(a, b, 0.64);
        ctx.moveTo(s[a * 4], s[a * 4 + 1]); ctx.lineTo(x1, y1);
        ctx.moveTo(x2, y2); ctx.lineTo(s[b * 4], s[b * 4 + 1]);
      } else { ctx.moveTo(s[a * 4], s[a * 4 + 1]); ctx.lineTo(s[b * 4], s[b * 4 + 1]); }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Evidence pulses: one per path, stopping at the first broken control.
    for (let q = 0; q < PATHS.length; q++) {
      const [e1, e2] = PATHS[q];
      const ph = (t * 0.32 + q * 0.33) % 1; // 0..0.5 first edge, 0.5..1 second
      const seg = ph < 0.5 ? e1 : e2;
      const f = ph < 0.5 ? ph * 2 : ph * 2 - 1;
      const blockAt = (e: number) => (answers[EDGES[e][2]] === "no" ? 0.36 : answers[EDGES[e][2]] ? 2 : 0);
      const stop1 = blockAt(e1), stop2 = blockAt(e2);
      let alpha = 1;
      if (seg === e1 && f > stop1) alpha = Math.max(0, 1 - (f - stop1) * 8);
      if (seg === e2 && stop1 < 2) alpha = 0;
      if (seg === e2 && f > stop2) alpha = Math.max(0, 1 - (f - stop2) * 8);
      if (seg === e2 && stop1 >= 2 && stop2 >= 2 && f > 0.97 && t - arrive[q] > 1) arrive[q] = t;
      if (alpha <= 0) continue;
      const [a, b] = EDGES[seg];
      const ff = seg === e1 ? Math.min(f, stop1 + 0.12) : Math.min(f, stop2 + 0.12);
      const [px, py] = lerp(a, b, ff);
      ctx.fillStyle = token("--primary", alpha);
      ctx.beginPath(); ctx.arc(px, py, 3.2 * Math.max(0.8, s[a * 4 + 2] * u * 0.9), 0, Math.PI * 2); ctx.fill();
    }

    // Nodes, depth sorted (far first).
    order.sort((i, j) => s[j * 4 + 3] - s[i * 4 + 3]);
    for (const i of order) {
      const x = s[i * 4], y = s[i * 4 + 1], k = s[i * 4 + 2];
      const node = NODES[i];
      ctx.lineWidth = 1.2;
      if (node.kind === 0) {
        // Facility or supplier: a block with a pitched roof.
        const bw = 30 * k * u, bh = 20 * k * u;
        ctx.fillStyle = token("--card"); ctx.strokeStyle = token("--foreground", 0.35);
        ctx.beginPath();
        ctx.moveTo(x - bw / 2, y + bh / 2); ctx.lineTo(x - bw / 2, y - bh / 4); ctx.lineTo(x, y - bh * 0.75); ctx.lineTo(x + bw / 2, y - bh / 4); ctx.lineTo(x + bw / 2, y + bh / 2); ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (node.kind === 1) {
        // Document with a folded corner.
        const dw = 22 * k * u, dh = 28 * k * u, c = 7 * k * u;
        ctx.fillStyle = token("--card"); ctx.strokeStyle = token("--foreground", 0.4);
        ctx.beginPath();
        ctx.moveTo(x - dw / 2, y - dh / 2); ctx.lineTo(x + dw / 2 - c, y - dh / 2); ctx.lineTo(x + dw / 2, y - dh / 2 + c); ctx.lineTo(x + dw / 2, y + dh / 2); ctx.lineTo(x - dw / 2, y + dh / 2); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = token("--foreground", 0.2);
        for (let l = 1; l <= 3; l++) { const ly = y - dh / 2 + c + l * 4.5 * k * u; ctx.beginPath(); ctx.moveTo(x - dw / 2 + 4 * k * u, ly); ctx.lineTo(x + dw / 2 - 4 * k * u, ly); ctx.stroke(); }
      } else {
        // The ledger: one row per path; a row lights when evidence arrives.
        const lw = 64 * k * u, lh = 40 * k * u;
        const rev = answers.review;
        ctx.strokeStyle = colourOf(rev);
        ctx.lineWidth = rev === "yes" ? 2.2 : 1.8;
        ctx.setLineDash(rev === "partly" ? [6, 4] : rev === "no" ? [10, 9] : rev ? [] : [1.5, 4]);
        ctx.beginPath(); ctx.ellipse(x, y, lw * 0.82, lh * 0.95, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = token("--card"); ctx.strokeStyle = token("--primary", 0.7); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x - lw / 2, y - lh / 2, lw, lh, 5 * u); ctx.fill(); ctx.stroke();
        for (let q = 0; q < 3; q++) {
          const glow = Math.max(0, 1 - (t - arrive[q]) * 1.2);
          const ry = y - lh / 2 + (q + 1) * lh / 4;
          ctx.fillStyle = glow > 0 ? token("--primary", 0.25 + 0.6 * glow) : token("--foreground", 0.15);
          ctx.fillRect(x - lw / 2 + 6 * u, ry - 2 * u, lw - 12 * u, 4 * u);
        }
      }
      ctx.font = `${node.kind === 2 ? 600 : 500} ${fs}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = token("--foreground", node.kind === 0 ? 0.6 : 0.8);
      // Labels sit where no edge runs: above sources, beside documents, below the ledger.
      if (node.kind === 0) { ctx.textBaseline = "bottom"; ctx.fillText(node.label, x, y - 16 * k * u - 3); }
      else if (node.kind === 1) {
        ctx.textBaseline = "middle"; ctx.textAlign = i === 5 ? "left" : "right";
        ctx.fillText(node.label, x + (i === 5 ? 1 : -1) * (11 * k * u + 6), y);
      } else ctx.fillText(node.label, x, y + 40 * k * u + 4);
    }

    // Control numbers at edge midpoints (sit inside the gap when broken).
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const badge = (bx: number, by: number, key: ControlKey) => {
      const rr = Math.max(7, 7.5 * u);
      ctx.fillStyle = token("--background"); ctx.strokeStyle = colourOf(answers[key]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = token("--foreground", 0.85); ctx.fillText(String(EDGE_NUM[key]), bx, by + 0.5);
    };
    for (const [a, b, key] of EDGES) { const [mx, my] = lerp(a, b, 0.5); badge(mx, my, key); }
    const lk = s[6 * 4 + 2];
    // Independent review wraps the ledger; its badge sits low on the ring, clear of incoming edges.
    badge(s[6 * 4] + 64 * lk * u * 0.82 * 0.77, s[6 * 4 + 1] + 40 * lk * u * 0.95 * 0.64, "review");
  }, active);

  const dot: Record<string, string> = { yes: "bg-verified", partly: "bg-pending", no: "bg-destructive" };
  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img" aria-label={`Data lineage graph from facilities and suppliers through documents to the ledger. Audit readiness ${r.pct}%.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5 -mt-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`rounded-full px-2.5 py-1 font-medium ${sample ? "border border-border text-foreground" : "bg-primary text-primary-foreground"}`}>Readiness {r.pct}%</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-verified" />Yes</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-dashed border-pending" />Partly</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-1.5 bg-destructive" /><i className="-ml-1 inline-block h-0.5 w-1.5 translate-x-1 bg-destructive" />No, evidence stops</span>
        </div>
        <ol className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
          {[...CONTROLS].sort((a, b) => EDGE_NUM[a.key] - EDGE_NUM[b.key]).map(c => (
            <li key={c.key} className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${answers[c.key] ? dot[answers[c.key] as string] : "bg-border"}`} />
              <span className="font-mono">{EDGE_NUM[c.key]}</span> {c.short}
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
};
