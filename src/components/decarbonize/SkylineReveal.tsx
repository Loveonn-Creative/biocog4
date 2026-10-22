import { useEffect, useRef, useState } from "react";
import { useInView } from "@/components/platform/Reveal";
import { prefersReducedMotion } from "./useScrollProgress";

type Palette = { sky: string; ground: string; wall: string; roof: string; line: string; accent: string; label: string };
const SMOG: Palette = { sky: "#3a3d42", ground: "#2b2d31", wall: "#6b6e73", roof: "#55585d", line: "#8d9096", accent: "#7a7d82", label: "#c9cbcf" };
const CLEAR: Palette = { sky: "#cfe9dc", ground: "#2f7a55", wall: "#e9f3ec", roof: "#184d37", line: "#184d37", accent: "#f4a21a", label: "#12321f" };

/** The places the carbon actually comes from, drawn once and painted two ways. */
function Skyline({ c, clean }: { c: Palette; clean: boolean }) {
  return (
    <svg viewBox="0 0 640 340" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
      <rect width="640" height="340" fill={c.sky} />
      {clean && <circle cx="560" cy="70" r="34" fill="#f4c45a" opacity=".9" />}
      <rect y="276" width="640" height="64" fill={c.ground} />
      <g stroke={c.line} strokeWidth="2" strokeLinejoin="round">
        {/* textile dye unit: vats and a long shed */}
        <path d="M20 276 V214 h110 v62z" fill={c.wall} />
        <path d="M14 214 l64 -26 l58 26z" fill={c.roof} />
        <rect x="34" y="236" width="22" height="30" rx="3" fill={clean ? "#3fae6b" : "#4b3f5c"} />
        <rect x="66" y="236" width="22" height="30" rx="3" fill={clean ? "#3fae6b" : "#5a3a3a"} />
        <rect x="98" y="168" width="12" height="46" fill={c.accent} />
        {/* metal fabrication shop: sawtooth roof */}
        <path d="M150 276 V200 l26 -18 v18 l26 -18 v18 l26 -18 v18 l26 -18 v94z" fill={c.wall} />
        <path d="M162 240 h22 v36 h-22z M200 240 h22 v36 h-22z" fill={c.roof} />
        {/* chemical plant: tanks and a tall stack */}
        <rect x="282" y="120" width="16" height="156" fill={c.accent} />
        <ellipse cx="330" cy="236" rx="26" ry="10" fill={c.roof} />
        <path d="M304 236 v40 h52 v-40" fill={c.wall} />
        <ellipse cx="384" cy="246" rx="20" ry="8" fill={c.roof} />
        <path d="M364 246 v30 h40 v-30" fill={c.wall} />
        {/* data centre */}
        <rect x="420" y="196" width="92" height="80" fill={c.wall} />
        {[0, 1, 2, 3].map(i => <path key={i} d={`M430 ${210 + i * 15} h72`} stroke={clean ? "#3fae6b" : "#8d9096"} />)}
        {/* commercial tower with rooftop HVAC */}
        <rect x="530" y="120" width="78" height="156" fill={c.wall} />
        <rect x="540" y="104" width="22" height="16" fill={c.roof} />
        <rect x="574" y="104" width="22" height="16" fill={c.roof} />
        {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M540 ${138 + i * 26} h58`} opacity=".6" />)}
      </g>
      {clean ? (
        <g>
          {/* solar on the roofs, trees along the road */}
          <path d="M22 210 l56 -22 l54 22" stroke="#1f3b5a" strokeWidth="5" fill="none" />
          <path d="M424 192 h84" stroke="#1f3b5a" strokeWidth="6" />
          {[40, 140, 270, 415, 520, 618].map(x => (
            <g key={x}><path d={`M${x} 300 v-14`} stroke="#12321f" strokeWidth="3" /><circle cx={x} cy="280" r="11" fill="#3fae6b" /></g>
          ))}
        </g>
      ) : (
        <g className="di-smoke" fill="#9a9ca1">
          {[[104, 160], [290, 112], [551, 98], [585, 98]].map(([x, y], i) => (
            <g key={i} style={{ animationDelay: `${i * 0.7}s` }}>
              <circle cx={x} cy={y} r="12" opacity=".55" />
              <circle cx={x + 10} cy={y - 26} r="18" opacity=".4" />
              <circle cx={x + 24} cy={y - 58} r="26" opacity=".25" />
            </g>
          ))}
        </g>
      )}
      <g fontSize="12" fill={c.label} textAnchor="middle" fontFamily="inherit">
        <text x="75" y="300">Dye units</text><text x="202" y="300">Metal shops</text>
        <text x="345" y="300">Chemical plants</text><text x="466" y="300">Data centres</text><text x="569" y="300">24/7 central AC</text>
      </g>
    </svg>
  );
}

/**
 * Before and after, felt rather than read: drag (or use the arrow keys on) the
 * handle to paint the clean version over the smoky one.
 */
export function SkylineReveal() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [v, setV] = useState(12);
  const touched = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  // A one-time hint: the handle travels part-way so people see it moves.
  useEffect(() => {
    if (!inView || touched.current) return;
    if (prefersReducedMotion()) { setV(50); return; }
    let x = 12;
    const t = window.setInterval(() => { x += 1.5; setV(x); if (x >= 52) window.clearInterval(t); }, 16);
    return () => window.clearInterval(t);
  }, [inView]);

  const fromPointer = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    touched.current = true;
    setV(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div ref={ref}>
      <div ref={box} className="relative h-[300px] touch-none select-none overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-50px_rgba(0,0,0,.7)] sm:h-[380px]"
        onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e.clientX); }}
        onPointerMove={e => { if (e.buttons) fromPointer(e.clientX); }}>
        <div className="absolute inset-0"><Skyline c={SMOG} clean={false} /></div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}><Skyline c={CLEAR} clean /></div>
        <div className="absolute inset-y-0 w-[2px] bg-white/90" style={{ left: `${v}%` }}>
          <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#12321f] shadow-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6" /></svg>
          </div>
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs text-[#12321f] backdrop-blur">After ambassadors</span>
        <span className="absolute right-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs text-white backdrop-blur">Today</span>
      </div>
      <label className="sr-only" htmlFor="skyline-range">Reveal the clean skyline</label>
      <input id="skyline-range" type="range" min={0} max={100} value={Math.round(v)} onChange={e => { touched.current = true; setV(Number(e.target.value)); }}
        className="mt-4 w-full accent-[#184d37]" />
    </div>
  );
}

export default SkylineReveal;
