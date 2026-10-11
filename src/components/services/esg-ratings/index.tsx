import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { project } from "../motion/iso";
import { ALL_QUESTIONS, THEMES, headline, isThemeAnswered, pct, readiness, summary, type Answer, type Answers } from "./logic";

const OPTS: { v: Answer; label: string }[] = [{ v: "yes", label: "Yes" }, { v: "partly", label: "Partly" }, { v: "no", label: "No" }];

/** Yes / partly / no for one evidence item. */
const Row = ({ label, value, onPick }: { label: string; value?: Answer; onPick: (a: Answer) => void }) => (
  <div className="rounded-xl border border-border p-3">
    <p className="text-sm text-foreground mb-2">{label}</p>
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={label}>
      {OPTS.map(o => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          data-answer={o.v}
          onClick={() => onPick(o.v)}
          className={`rounded-lg border px-2 py-2 text-sm transition-colors ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/85 hover:border-primary/40"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [answers, setAnswers] = useState<Answers>({});
  const [missing, setMissing] = useState<string[] | null>(null);
  const r = useMemo(() => readiness(answers), [answers]);

  useEffect(() => { onChange({ answers }); }, [answers, onChange]);

  const pick = (id: string, a: Answer) => { setAnswers(prev => ({ ...prev, [id]: a })); setMissing(null); onResult(null); };

  const finish = () => {
    if (ALL_QUESTIONS.some(q => !answers[q.id])) { onResult(null); return; }
    setMissing(r.missing.slice(0, 3));
    onResult({ headline: headline(r), summary: summary(r), data: { answers, overall: r.overall } });
  };

  return (
    <>
      <Steps
        cta="Check my score"
        onFirstTouch={onStart}
        onFinish={finish}
        steps={THEMES.map(t => ({
          key: t.key,
          label: `${t.name}: what can you prove?`,
          ready: isThemeAnswered(t, answers),
          content: (
            <div className="grid gap-2">
              {t.questions.map(q => <Row key={q.id} label={q.label} value={answers[q.id]} onPick={a => pick(q.id, a)} />)}
              <p className="text-xs text-muted-foreground">Yes means you have the document today. Partly: it exists but is incomplete.</p>
            </div>
          ),
        }))}
      />
      {missing && (
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-foreground">{missing.length ? "Top documents to prepare" : "Every document is in place"}</p>
          {missing.length > 0 && (
            <ol className="mt-1.5 list-decimal pl-4 text-sm text-muted-foreground space-y-0.5">
              {missing.map(d => <li key={d}>{d}</li>)}
            </ol>
          )}
        </div>
      )}
    </>
  );
};

// Sample answers shown before the visitor starts.
const SAMPLE: Answers = {
  env_policy: "yes", env_s12: "yes", env_actions: "partly",
  lab_policy: "partly", lab_hs: "yes", lab_hours: "no",
  eth_abc: "no", eth_data: "partly",
  proc_code: "partly", proc_assess: "no",
};
const CARDS = ["EcoVadis", "CDP", "Customer questionnaire"];
// Axis directions on the floor: right, front, left, back (diamond in iso view).
const DIRS: [number, number][] = [[1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => [a / Math.SQRT2, b / Math.SQRT2]);
const THEME_OF = ALL_QUESTIONS.map(q => THEMES.findIndex(t => t.questions.includes(q)));
const N = ALL_QUESTIONS.length;

/**
 * A 3D radar of readiness. Each theme is an axis on an isometric floor; the
 * polygon's reach and height on that axis is the theme score, driven by a
 * damped spring so it rises as answers come in. Below, every "yes" is one
 * evidence item that flies into a slot of the EcoVadis card and drops
 * through CDP and the customer questionnaire: one evidence base, every
 * questionnaire. "Partly" slots show amber: evidence exists but is incomplete.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const live = (data.answers as Answers | undefined) ?? {};
  const empty = Object.keys(live).length === 0;
  const answers = empty ? SAMPLE : live;
  const r = readiness(answers);
  const yesCount = ALL_QUESTIONS.filter(q => answers[q.id] === "yes").length;

  const sim = useRef({ x: [0, 0, 0, 0], v: [0, 0, 0, 0], p: new Array<number>(N).fill(0) });
  const scores = r.themes.map(t => t.score);
  const state = ALL_QUESTIONS.map(q => answers[q.id]);

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    const st = sim.current;
    for (let i = 0; i < 4; i++) {
      if (dt === 0) { st.x[i] = scores[i]; st.v[i] = 0; continue; }
      const a = -140 * (st.x[i] - scores[i]) - 13 * st.v[i];
      st.v[i] += a * dt; st.x[i] += st.v[i] * dt;
    }
    for (let k = 0; k < N; k++) {
      if (state[k] !== "yes") st.p[k] = 0;
      else st.p[k] = dt === 0 ? 1.5 : Math.min(1.5, st.p[k] + dt * (0.9 + (k % 3) * 0.08));
    }

    const s = Math.min(w / 400, h / 300);
    const cx = w / 2, cy = 130 * s;
    const R = 80, H = 46;
    const fs = Math.max(10, 11 * s);
    const P = (x: number, y: number, z: number) => project(x, y, z, cx, cy, s);
    const path = (pts: [number, number][]) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

    // Floor grid: 25 / 50 / 75 / 100 % rings and the four axes.
    ctx.lineWidth = 1;
    for (let g = 1; g <= 4; g++) {
      path(DIRS.map(([a, b]) => P(a * R * g / 4, b * R * g / 4, 0)));
      if (g === 4) { ctx.fillStyle = token("--muted", 0.55); ctx.fill(); }
      ctx.strokeStyle = token("--border", 1); ctx.stroke();
    }
    DIRS.forEach(([a, b]) => { const [x0, y0] = P(0, 0, 0); const [x1, y1] = P(a * R, b * R, 0); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });

    // Extruded readiness polygon. Height and reach both = theme score.
    const base: [number, number][] = [], top: [number, number][] = [];
    const tips: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      const sc = Math.max(0, st.x[i]);
      const reach = R * Math.max(0.05, sc);
      const [a, b] = DIRS[i];
      base.push(P(a * reach, b * reach, 0));
      top.push(P(a * reach, b * reach, H * sc));
      tips.push(P(a * reach, b * reach, H * sc));
    }
    const zc = H * st.x.reduce((m, v) => m + Math.max(0, v), 0) / 4;
    const ctop = P(0, 0, zc);
    // Sides back to front: back-left, back-right, then front ones (indices: 0 right, 1 front, 2 left, 3 back).
    const order = [[2, 3], [3, 0], [1, 2], [0, 1]];
    order.forEach(([i, j], n) => {
      path([base[i], base[j], top[j], top[i]]);
      ctx.fillStyle = token("--primary", n < 2 ? 0.25 : n === 2 ? 0.55 : 0.4); ctx.fill();
    });
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      path([ctop, top[i], top[j]]);
      ctx.fillStyle = token("--primary", 0.18 + 0.06 * i); ctx.fill();
    }
    path(top); ctx.strokeStyle = token("--primary", 0.95); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(base[i][0], base[i][1]); ctx.lineTo(top[i][0], top[i][1]); ctx.strokeStyle = token("--primary", 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(top[i][0], top[i][1], 2.5, 0, Math.PI * 2); ctx.fillStyle = token("--primary", 1); ctx.fill();
    }

    // Axis labels outside the polygon's maximum extent.
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui`;
    const label = (i: number, x: number, y: number, align: CanvasTextAlign) => {
      ctx.textAlign = align;
      ctx.fillStyle = token("--foreground", 0.85);
      ctx.fillText(THEMES[i].short, x, y);
      ctx.fillStyle = token(r.weakest.key === THEMES[i].key ? "--destructive" : "--primary", 1);
      ctx.fillText(`${pct(scores[i])}%`, x, y + fs * 1.2);
    };
    const [rx, ry] = P(DIRS[0][0] * (R + 8), DIRS[0][1] * (R + 8), 0);
    const [fx, fy] = P(DIRS[1][0] * R, DIRS[1][1] * R, 0);
    const [lx, ly] = P(DIRS[2][0] * (R + 8), DIRS[2][1] * (R + 8), 0);
    const [bx, by] = P(DIRS[3][0] * R, DIRS[3][1] * R, H);
    label(0, rx, ry - 2, "left");
    label(2, lx, ly - 2, "right");
    ctx.textAlign = "center";
    ctx.fillStyle = token("--foreground", 0.85);
    ctx.fillText(`${THEMES[1].short} ${pct(scores[1])}%`, fx, fy + fs * 1.4);
    ctx.fillText(`${THEMES[3].short} ${pct(scores[3])}%`, bx, by - fs * 0.8);

    // Questionnaire reuse layer: three stacked cards, one slot per question.
    const cw = Math.min(w - 24, 360 * s), cx0 = (w - cw) / 2;
    const y0 = 212 * s, dh = 26 * s, step = 19 * s, th = 3 * s;
    const lw = Math.min(cw * 0.42, 150 * s);
    const slotW = (cw - lw - 10) / N;
    const sr = Math.min(slotW * 0.32, 6 * s);
    const slotX = (k: number) => cx0 + lw + slotW * (k + 0.5);
    const slotY = (c: number) => y0 + c * step + (c === 0 ? dh * 0.5 : dh - step * 0.5);
    const diamond = (x: number, y: number, rr: number) => { ctx.beginPath(); ctx.moveTo(x, y - rr * 0.6); ctx.lineTo(x + rr, y); ctx.lineTo(x, y + rr * 0.6); ctx.lineTo(x - rr, y); ctx.closePath(); };
    for (let c = 2; c >= 0; c--) {
      const y = y0 + c * step, inset = c * 5 * s;
      const card = (yy: number) => { ctx.beginPath(); ctx.roundRect(cx0 + inset, yy, cw - 2 * inset, dh, 6 * s); };
      card(y + th); ctx.fillStyle = token("--foreground", 0.12); ctx.fill();
      card(y); ctx.fillStyle = token(c === 0 ? "--background" : "--secondary", 1); ctx.fill();
      ctx.strokeStyle = token("--border", 1); ctx.lineWidth = 1; ctx.stroke();
      const ly2 = slotY(c);
      ctx.textAlign = "left"; ctx.font = `500 ${fs}px ui-sans-serif, system-ui`;
      ctx.fillStyle = token("--foreground", 0.8);
      ctx.fillText(CARDS[c], cx0 + 8 + c * 5 * s, ly2 + fs * 0.35);
      for (let k = 0; k < N; k++) {
        const filled = st.p[k] >= 1 + c * 0.2;
        diamond(slotX(k), ly2, sr);
        if (filled) { ctx.fillStyle = token("--primary", 1); ctx.fill(); }
        else if (state[k] === "partly") { ctx.strokeStyle = token("--pending", 1); ctx.lineWidth = 1.4; ctx.stroke(); }
        else { ctx.setLineDash([2, 2]); ctx.strokeStyle = token("--muted-foreground", 0.6); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); }
      }
    }
    // One evidence item, three questionnaires: thread through the filed slots.
    ctx.strokeStyle = token("--primary", 0.35); ctx.lineWidth = 1;
    for (let k = 0; k < N; k++) {
      if (st.p[k] < 1.4) continue;
      ctx.beginPath(); ctx.moveTo(slotX(k), slotY(0)); ctx.lineTo(slotX(k), slotY(2)); ctx.stroke();
    }
    // Evidence items in flight: one per yes, from its theme's axis to the card stack.
    for (let k = 0; k < N; k++) {
      const p = st.p[k];
      if (p <= 0 || p >= 1.4) continue;
      let x: number, y: number;
      if (p < 1) {
        const [sx, sy] = tips[THEME_OF[k]];
        const ex = slotX(k), ey = slotY(0);
        const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 40 * s;
        const u = p, iu = 1 - u;
        x = iu * iu * sx + 2 * iu * u * mx + u * u * ex;
        y = iu * iu * sy + 2 * iu * u * my + u * u * ey;
      } else {
        x = slotX(k); y = slotY(0) + (slotY(2) - slotY(0)) * Math.min(1, (p - 1) / 0.4);
      }
      diamond(x, y, sr * 1.15); ctx.fillStyle = token("--primary", 1); ctx.fill();
    }
  }, active);

  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img" aria-label={`Readiness radar across four EcoVadis themes, overall ${pct(r.overall)}%, with ${yesCount} evidence items reused across EcoVadis, CDP and customer questionnaires`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full border border-primary bg-primary px-2.5 py-1 text-primary-foreground">Readiness {pct(r.overall)}%</span>
          <span className="rounded-full border border-primary/40 bg-background px-2.5 py-1 text-primary">{yesCount} of {N} evidence items, reused 3 times</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground"><span className="h-2 w-2 rotate-45 border border-pending" aria-hidden="true" /> Partly: incomplete</span>
        </div>
      </figcaption>
    </figure>
  );
};
