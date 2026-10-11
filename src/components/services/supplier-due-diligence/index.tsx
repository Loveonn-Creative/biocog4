import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ServiceToolProps, ServiceVisualProps } from "../types";
import { Steps, Choice } from "../shell/Steps";
import { useCanvasLoop, useMotionGate, token } from "../motion/kit";
import { isoBox, project } from "../motion/iso";
import {
  COMMODITIES, COMMODITY_LABEL, COMMODITY_SHORT, EUDR, LAW_LABEL, LAW_STATUS_LABEL, MINERALS, RISKS, RISK_LABEL, UFLPA_SECTORS,
  DECAY, buildNet, heatmap, laws, levelOf, settle, summarise, tick,
  type Commodity, type Net, type LawStatus, type Level, type Market, type Origin, type SupplyInput,
} from "./logic";

const MARKETS: { value: Market; label: string }[] = [
  { value: "de", label: "Germany" }, { value: "eu", label: "Rest of the EU" },
  { value: "us", label: "USA" }, { value: "india", label: "India only" },
];
const ORIGIN: { value: Origin; label: string }[] = [
  { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" },
];
const opts = (list: Commodity[]) => list.map(c => ({ value: c, label: COMMODITY_LABEL[c] }));

const LAW_BADGE: Record<LawStatus, string> = {
  applies: "bg-primary text-primary-foreground",
  asked: "bg-pending/15 text-foreground border border-pending/50",
  prepare: "bg-secondary text-muted-foreground",
  none: "bg-secondary text-muted-foreground",
};
const CELL: Record<Level, string> = {
  high: "bg-destructive/15 text-destructive font-medium",
  medium: "bg-pending/15 text-foreground",
  low: "text-muted-foreground",
};

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mt-3 first:mt-0">
    <p className="mb-1.5 text-xs text-muted-foreground">{title}</p>
    {children}
  </div>
);

export const Tool = ({ onStart, onChange, onResult }: ServiceToolProps) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [de1000, setDe1000] = useState<boolean | null>(null);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [xinjiang, setXinjiang] = useState<Origin | null>(null);
  const [drc, setDrc] = useState<Origin | null>(null);
  const [done, setDone] = useState(false);

  const input: SupplyInput = useMemo(() => ({ markets, de1000, commodities, xinjiang, drc }), [markets, de1000, commodities, xinjiang, drc]);
  useEffect(() => { onChange({ ...input }); }, [input, onChange]);

  const answered = markets.length > 0 && de1000 !== null && xinjiang !== null && drc !== null;
  const s = useMemo(() => summarise(input), [input]);
  useEffect(() => {
    if (!done) return;
    if (!answered) { onResult(null); return; }
    onResult({ headline: s.headline, summary: s.summary, data: { ...input } });
  }, [done, answered, s, input, onResult]);

  // "India only" excludes the export markets, and the reverse.
  const pickMarkets = (v: Market[]) => {
    const added = v.find(m => !markets.includes(m));
    setMarkets(added === "india" ? ["india"] : v.filter(m => m !== "india"));
  };
  const pickCommodities = (group: Commodity[]) => (v: Commodity[]) =>
    setCommodities([...commodities.filter(c => !group.includes(c)), ...v.filter(c => group.includes(c))]);
  const yesNo = (v: boolean | null) => (v === null ? [] : [v ? "yes" : "no"]);
  const rows = heatmap(input);

  return (
    <div>
      <Steps
        cta="Show my supplier risks"
        onFirstTouch={onStart}
        onFinish={() => setDone(true)}
        steps={[
          {
            key: "markets", label: "Where do you sell? Pick any.", ready: markets.length > 0 && de1000 !== null,
            content: (
              <>
                <Choice multi options={MARKETS} value={markets} onChange={pickMarkets} />
                <Group title="Do you have 1,000 or more employees in Germany?">
                  <Choice options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={yesNo(de1000)} onChange={v => setDe1000(v[0] === "yes")} />
                </Group>
              </>
            ),
          },
          {
            key: "inputs", label: "What do your suppliers supply? Pick any.",
            content: (
              <>
                <Group title="UFLPA high-priority sectors"><Choice multi options={opts(UFLPA_SECTORS)} value={commodities} onChange={pickCommodities(UFLPA_SECTORS)} /></Group>
                <Group title="Conflict minerals and those buyers screen"><Choice multi options={opts(MINERALS)} value={commodities} onChange={pickCommodities(MINERALS)} /></Group>
                <Group title="EUDR commodities"><Choice multi options={opts(EUDR)} value={commodities} onChange={pickCommodities(EUDR)} /></Group>
              </>
            ),
          },
          {
            key: "origin", label: "Do any suppliers source from these places?", ready: xinjiang !== null && drc !== null,
            content: (
              <>
                <Group title="Xinjiang region, China"><Choice options={ORIGIN} value={xinjiang ? [xinjiang] : []} onChange={v => setXinjiang(v[0] ?? null)} /></Group>
                <Group title="DRC and adjoining countries"><Choice options={ORIGIN} value={drc ? [drc] : []} onChange={v => setDrc(v[0] ?? null)} /></Group>
              </>
            ),
          },
        ]}
      />
      {done && answered && (
        <div className="mt-5 space-y-4">
          <ul className="divide-y divide-border rounded-2xl border border-border" aria-label="Rules your supply chain triggers">
            {laws(input).filter(l => l.status !== "none").map(l => (
              <li key={l.id} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-start sm:gap-3">
                <span className="w-32 shrink-0 text-sm font-medium">{LAW_LABEL[l.id]}</span>
                <span className="min-w-0 flex-1 text-xs text-muted-foreground leading-relaxed">
                  <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${LAW_BADGE[l.status]}`}>{LAW_STATUS_LABEL[l.status]}</span>
                  {l.why}
                </span>
              </li>
            ))}
          </ul>
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-xs">
                <caption className="px-3.5 pt-2.5 text-left text-xs text-muted-foreground">Risk heatmap. Not sure counts as a traceability gap.</caption>
                <thead>
                  <tr className="text-muted-foreground">
                    <th scope="col" className="px-3 py-2 text-left font-normal">Input</th>
                    {RISKS.map(r => <th key={r} scope="col" className="px-1.5 py-2 text-center font-normal">{RISK_LABEL[r]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.commodity} className="border-t border-border">
                      <th scope="row" className="px-3 py-1.5 text-left font-medium">{COMMODITY_SHORT[row.commodity]}</th>
                      {RISKS.map(r => (
                        <td key={r} className="px-1 py-1"><span className={`block whitespace-nowrap rounded-md py-1 text-center capitalize ${CELL[row.cells[r]]}`}>{row.cells[r] === "medium" ? <><span className="sm:hidden">Med</span><span className="hidden sm:inline">Medium</span></> : row.cells[r]}</span></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TICK = 0.45; // seconds per diffusion tick
const BANDS: [number, string][] = [[-105, "Origin"], [-35, "Tier 2"], [35, "Tier 1"], [105, "You"]];
/** You first, then the riskiest nodes, so the labels that matter get the best spots. */
const LABEL_ORDER = (net: Net, d: Float32Array) => [...net.label.keys()].sort((a, b) => (a === net.you ? -1 : b === net.you ? 1 : d[b] - d[a]));
const SAMPLE: SupplyInput = { markets: ["us"], de1000: false, commodities: ["cotton", "3tg", "coffee", "mica"], xinjiang: "no", drc: "yes" };
/**
 * Your supply chain as an isometric network: origin, tier 2, tier 1, you.
 * Each tick, every node takes the larger of its own risk and 85% of the
 * worst risk upstream, so risk travels one tier towards you per tick and
 * fades a little each hop. Pillar height and colour are the risk level.
 */
export const Visual = ({ data }: ServiceVisualProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useMotionGate(boxRef);
  const picked = (data.commodities as Commodity[] | undefined) ?? [];
  const sample = picked.length === 0;
  const input: SupplyInput = sample ? SAMPLE : {
    markets: (data.markets as Market[]) ?? [], de1000: (data.de1000 as boolean | null) ?? null,
    commodities: picked.filter(c => COMMODITIES.includes(c)),
    xinjiang: (data.xinjiang as Origin | null) ?? "no", drc: (data.drc as Origin | null) ?? "no",
  };
  const key = JSON.stringify(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const net = useMemo(() => buildNet(input), [key]);
  const sim = useRef({ net: null as Net | null, r: new Float32Array(0), next: new Float32Array(0), d: new Float32Array(0), acc: 0, order: [] as number[], flow: 0 });
  const S0 = sim.current;
  if (S0.net !== net) {
    // Tier 1 and you start at zero on a change, so the new risk is seen travelling in.
    const n = net.label.length;
    S0.net = net; S0.r = Float32Array.from(net.base); S0.next = new Float32Array(n); S0.d = Float32Array.from(net.base);
    S0.order = [...Array(n).keys()].sort((a, b) => net.x[a] + net.y[a] - (net.x[b] + net.y[b]));
  }
  const youLevel = levelOf(settle(net)[net.you]);

  useCanvasLoop(canvasRef, (ctx, { dt, w, h }) => {
    const S = sim.current, n = S.r.length;
    if (dt === 0) { S.r.set(settle(net)); S.d.set(S.r); }
    else {
      S.acc += dt; S.flow += dt;
      if (S.acc > TICK) { S.acc = 0; tick(net, S.r, S.next); }
      for (let k = 0; k < n; k++) S.d[k] += (S.r[k] - S.d[k]) * Math.min(1, dt * 6);
    }
    ctx.clearRect(0, 0, w, h);
    const s = Math.max(0.5, Math.min((w - 90) / 400, (h - 16) / 250));
    const ox = w / 2 - 22, oy = h / 2 + 11 * s;
    // Tier t runs left to right, spread p runs back to front, on the iso plane x = t + p, y = p - t.
    const P = (t: number, p: number, z: number) => project(t + p, p - t, z, ox, oy, s);
    const col = (v: number, a = 1) => { const l = levelOf(v); return l === "high" ? token("--destructive", a) : l === "medium" ? token("--pending", a) : token("--muted-foreground", a * 0.6); };
    const fs = Math.max(10, Math.min(12, 10.5 * s));

    // Tier floor strips with their names in front.
    ctx.font = `500 ${fs}px ui-sans-serif, system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const [bt, name] of BANDS) {
      const q = [P(bt - 20, -95, 0), P(bt + 20, -95, 0), P(bt + 20, 95, 0), P(bt - 20, 95, 0)];
      ctx.beginPath(); q.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      ctx.fillStyle = token("--muted", 0.5); ctx.fill();
      const [lx, ly] = P(bt, 95, 0);
      ctx.fillStyle = token("--muted-foreground", 0.95); ctx.fillText(name, lx, ly + fs);
    }

    // Edges on the floor: colour and width are the risk carried downstream; dashes march towards you.
    ctx.lineCap = "round";
    for (const [a, b, unsure] of net.edges) {
      const v = DECAY * S.d[a];
      const [x0, y0] = P(net.x[a], net.y[a], 0), [x1, y1] = P(net.x[b], net.y[b], 0);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.setLineDash(unsure ? [2, 4] : [7, 5]); ctx.lineDashOffset = -S.flow * 14 * (0.3 + v);
      ctx.strokeStyle = col(v, unsure ? 0.8 : 0.4 + 0.45 * v); ctx.lineWidth = 1 + 2.5 * v; ctx.stroke();
    }
    ctx.setLineDash([]);

    // Pillars, depth sorted: height and colour are the node's current risk.
    const sz = 16, half = sz * 0.5;
    const rects: number[][] = [];
    for (const k of S.order) {
      const v = S.d[k], hh = 6 + 34 * v, l = levelOf(v);
      const c = l === "high" ? "--destructive" : l === "medium" ? "--pending" : "--muted-foreground";
      const a = k === net.you ? 1 : l === "low" ? 0.55 : 0.95;
      const X = net.x[k] + net.y[k], Y = net.y[k] - net.x[k];
      isoBox(ctx, X - half, Y - half, 0, sz, sz, hh, ox, oy, s, {
        top: token(c, a), left: token(c, a * 0.8), right: token(c, a * 0.62),
        stroke: k === net.you ? token("--primary") : undefined,
      });
      const [cx, base] = P(net.x[k], net.y[k], 0);
      rects[k] = [cx - half * 1.8 * s, base - (hh + half) * s, cx + half * 1.8 * s, base + half * s];
    }
    // Labels last: first free spot beside the pillar top, with a halo so lines never hide them.
    const boxes: number[][] = [];
    const hit = (b: number[], own: number) => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
      || rects.some((o, j) => j !== own && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    ctx.textAlign = "left"; ctx.lineJoin = "round";
    for (const k of LABEL_ORDER(net, S.d)) {
      ctx.font = `${k === net.you ? 700 : 600} ${fs}px ui-sans-serif, system-ui`;
      const tw = ctx.measureText(net.label[k]).width, r = rects[k];
      const cands: [number, number][] = [[r[2] + 3, r[1] + fs * 0.5], [r[2] + 3, r[1] + fs * 1.6], [r[0] - tw - 3, r[1] + fs * 0.5], [(r[0] + r[2] - tw) / 2, r[1] - fs * 0.7], [r[2] + 3, r[3] - fs * 0.5]];
      let [lx, ly] = cands[0];
      for (const [cx, cy] of cands) {
        const b = [cx - 2, cy - fs * 0.6, cx + tw + 2, cy + fs * 0.6];
        if (!hit(b, k) && cx > 2 && cx + tw < w - 2 && cy > fs) { lx = cx; ly = cy; break; }
      }
      lx = Math.max(2, Math.min(w - tw - 2, lx));
      boxes.push([lx - 2, ly - fs * 0.6, lx + tw + 2, ly + fs * 0.6]);
      ctx.strokeStyle = token("--background", 0.85); ctx.lineWidth = 3; ctx.strokeText(net.label[k], lx, ly);
      ctx.fillStyle = k === net.you ? token("--primary") : token("--foreground", 0.88);
      ctx.fillText(net.label[k], lx, ly);
    }
  }, active);

  const chip = (cls: string, text: string) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />{text}</span>
  );

  return (
    <figure ref={boxRef} className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background to-secondary/40">
      <canvas ref={canvasRef} className="block w-full aspect-[4/3]" role="img" aria-label={`Supplier network from origin to you. Risk reaching you: ${youLevel}.`} />
      <figcaption className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {chip("bg-destructive", "High")}
          {chip("bg-pending", "Medium")}
          {chip("bg-muted-foreground/40", "Low")}
          <span className="text-[11px] text-muted-foreground">Fine dots: origin not sure</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Risk moves one tier towards you per tick, losing 15% each hop.</p>
      </figcaption>
    </figure>
  );
};
