import { useMemo } from 'react';
import type { Result } from '@/lib/cbam/suite/engine';
import type { Workbook } from '@/lib/cbam/suite/types';
import { Trail, t } from './ui';

// The plant as a flow: inputs on the left, production processes in the middle,
// CN goods on the right. Link widths follow tonnes of CO2e; particles travel
// along the links so you see emissions moving into goods. Under reduced motion
// the particles are not drawn and the diagram is a still.

interface Node { id: string; label: string; sub: string; x: number; y: number; h: number; kind: 'stream' | 'precursor' | 'electricity' | 'process' | 'good'; trail: string[] }
interface Link { from: string; to: string; tco2e: number; tone: 'direct' | 'precursor' | 'indirect' }

const W = 960, COLX = [24, 400, 760], NODE_W = 176;

export function PlantFlow({ w, r }: { w: Workbook; r: Result }) {
  const { nodes, links, height, max } = useMemo(() => {
    const inputs: Node[] = [], procs: Node[] = [], goods: Node[] = [];
    const lk: Link[] = [];
    r.streams.forEach((s) => inputs.push({ id: `s:${s.id}`, label: s.name || 'Source stream', sub: `${t(s.tco2e, 0)} t CO2e`, x: COLX[0], y: 0, h: 0, kind: 'stream', trail: [s.formula || 'Incomplete'] }));
    const stream = new Map(w.streams.map((s) => [s.id, s]));
    for (const p of r.processes) {
      procs.push({ id: `p:${p.id}`, label: p.name, sub: `SEE ${t(p.seeDirect, 3)} | ${t(p.seeIndirect, 3)}`, x: COLX[1], y: 0, h: 0, kind: 'process', trail: p.trail });
      for (const s of r.streams) {
        const a = stream.get(s.id)?.allocations.find((x) => x.processId === p.id);
        if (a && a.share > 0) lk.push({ from: `s:${s.id}`, to: `p:${p.id}`, tco2e: s.tco2e * a.share, tone: 'direct' });
      }
      for (const u of p.precursors) {
        if (u.basis === 'own') {
          const src = w.processes.find((x) => x.precursors.some((y) => y.id === u.id))?.precursors.find((y) => y.id === u.id)?.fromProcessId;
          if (src) lk.push({ from: `p:${src}`, to: `p:${p.id}`, tco2e: u.embeddedDirect + u.embeddedIndirect, tone: 'precursor' });
        } else {
          inputs.push({ id: `u:${u.id}`, label: u.label, sub: `${t(u.quantity, 0)} t, ${u.basis === 'default' ? 'default' : 'supplier'}`, x: COLX[0], y: 0, h: 0, kind: 'precursor', trail: [u.formula] });
          lk.push({ from: `u:${u.id}`, to: `p:${p.id}`, tco2e: u.embeddedDirect + u.embeddedIndirect, tone: 'precursor' });
        }
      }
      if (p.indirEm > 0) {
        inputs.push({ id: `e:${p.id}`, label: `Electricity, ${p.name}`, sub: `${t(p.electricityMwh, 0)} MWh`, x: COLX[0], y: 0, h: 0, kind: 'electricity', trail: p.trail.filter((x) => x.startsWith('AttrEm(indirect)')) });
        lk.push({ from: `e:${p.id}`, to: `p:${p.id}`, tco2e: p.indirEm, tone: 'indirect' });
      }
    }
    for (const g of r.goods) {
      goods.push({ id: `g:${g.goodId}`, label: g.name || `CN ${g.cn}`, sub: `CN ${g.cn} | ${t(g.tonnes, 0)} t`, x: COLX[2], y: 0, h: 0, kind: 'good', trail: [`SEE (direct) ${t(g.seeDirect, 4)} t CO2e/t`, `SEE (indirect) ${t(g.seeIndirect, 4)} t CO2e/t${g.indirectCounted ? '' : ' (not counted for this sector)'}`] });
      const pr = r.processes.find((x) => x.id === g.processId);
      if (pr && pr.activity > 0) lk.push({ from: `p:${g.processId}`, to: `g:${g.goodId}`, tco2e: (pr.embeddedDirect + pr.embeddedIndirect) * (g.tonnes / pr.activity) * (pr.forMarket / pr.activity), tone: 'direct' });
    }
    const layout = (col: Node[]) => { let y = 16; for (const n of col) { n.h = 52; n.y = y; y += n.h + 14; } return y; };
    const height = Math.max(layout(inputs), layout(procs), layout(goods), 140) + 8;
    const max = Math.max(1, ...lk.map((l) => l.tco2e));
    return { nodes: [...inputs, ...procs, ...goods], links: lk, height, max };
  }, [w, r]);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const empty = !nodes.length;

  return (
    <div className="cbam-flow relative overflow-x-auto rounded-2xl border border-border bg-card">
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full min-w-[720px]" role="img" aria-label="Plant flow: inputs, production processes and goods, with tonnes of CO2e on each link">
        <defs>
          <linearGradient id="cbf-direct" x1="0" x2="1"><stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".18" /><stop offset="1" stopColor="hsl(var(--primary))" stopOpacity=".42" /></linearGradient>
          <linearGradient id="cbf-precursor" x1="0" x2="1"><stop offset="0" stopColor="hsl(30 90% 45%)" stopOpacity=".2" /><stop offset="1" stopColor="hsl(30 90% 45%)" stopOpacity=".45" /></linearGradient>
          <linearGradient id="cbf-indirect" x1="0" x2="1"><stop offset="0" stopColor="hsl(200 80% 45%)" stopOpacity=".18" /><stop offset="1" stopColor="hsl(200 80% 45%)" stopOpacity=".42" /></linearGradient>
        </defs>
        {links.map((l, k) => {
          const a = byId.get(l.from), b = byId.get(l.to);
          if (!a || !b) return null;
          const x1 = a.x + NODE_W, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
          const sameCol = a.x === b.x;
          const d = sameCol ? `M ${a.x + NODE_W} ${y1} C ${a.x + NODE_W + 60} ${y1}, ${b.x + NODE_W + 60} ${y2}, ${b.x + NODE_W} ${y2}` : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
          const width = 2 + 22 * Math.sqrt(Math.max(0, l.tco2e) / max);
          return (
            <g key={k}>
              <path d={d} fill="none" stroke={`url(#cbf-${l.tone})`} strokeWidth={width} strokeLinecap="round" />
              {l.tco2e > 0 && (
                <circle r={Math.min(4, 1.5 + width / 8)} className={`cbf-dot cbf-${l.tone}`}>
                  <animateMotion dur={`${5 - Math.min(3, (l.tco2e / max) * 3)}s`} repeatCount="indefinite" path={d} begin={`${(k % 7) * 0.4}s`} />
                </circle>
              )}
            </g>
          );
        })}
        {nodes.map((n) => (
          <foreignObject key={n.id} x={n.x} y={n.y} width={NODE_W} height={n.h}>
            <div className={`cbf-node cbf-node-${n.kind} flex h-full flex-col justify-center rounded-xl border px-3`}>
              <Trail lines={n.trail} title={n.label}>
                <span className="block truncate text-[12px] font-semibold text-foreground">{n.label}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">{n.sub}</span>
              </Trail>
            </div>
          </foreignObject>
        ))}
        {empty && <text x={W / 2} y={height / 2} textAnchor="middle" className="fill-muted-foreground text-[14px]">Add a process and its goods to draw the plant.</text>}
        <text x={COLX[0]} y={height - 2} className="fill-muted-foreground text-[10px] uppercase tracking-widest">Inputs</text>
        <text x={COLX[1]} y={height - 2} className="fill-muted-foreground text-[10px] uppercase tracking-widest">Processes</text>
        <text x={COLX[2]} y={height - 2} className="fill-muted-foreground text-[10px] uppercase tracking-widest">Goods</text>
      </svg>
    </div>
  );
}
