import { useEffect, useRef } from "react";

// Footer "one delivery, made visible": a truck carries goods from a supplier
// to a buyer. Its emissions trail is a faint haze nobody sees until it passes
// the Senseible line; from there the trail becomes a measured line that starts
// amber (impact found) and settles green (measured), and the number rides with
// the truck. Plays once when the footer comes into view (reveal inside ~1 s),
// then stays still. Reduced motion shows the finished picture.

// 8 t carried 120 km by a 20 to 30 t GVW truck at 0.0823 kg CO2e per
// tonne-km (src/lib/calculators/freightFactors.ts) = 79 kg CO2e.
const KG = Math.round(8 * 120 * 0.0823);
const ROAD = 104;
const TRUCK_W = 92;
const LENS = 430;
const END = 990;
const DUR = 4600;
const AMBER = "#d97706";
const GREEN = "#15803d";

const easeOut = (t: number) => 1 - (1 - t) ** 3;
// Already cruising; long steady run, then a gentle stop at the buyer.
const pos = (t: number) => (t < 0.72 ? (t / 0.72) * 0.8 : 0.8 + easeOut((t - 0.72) / 0.28) * 0.2);

function hazePath(fromX: number, toX: number): string {
  if (toX <= fromX) return "";
  let d = `M${fromX} 82`;
  for (let x = fromX + 12; x <= toX; x += 12) d += ` Q${x - 6} ${78 + Math.sin(x / 23) * 3} ${x} ${82 + Math.sin(x / 31) * 2}`;
  return d;
}

export const FooterDelivery = () => {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = root.current;
    const s = svg.current;
    if (!el || !s) return;
    const q = <T extends Element>(sel: string) => s.querySelector(sel) as T;
    const truck = q<SVGGElement>(".fd-truck");
    const w1 = q<SVGGElement>(".fd-w1");
    const w2 = q<SVGGElement>(".fd-w2");
    const puff = q<SVGCircleElement>(".fd-puff");
    const haze = q<SVGPathElement>(".fd-haze");
    const measured = q<SVGLineElement>(".fd-measured");
    const grad = q<SVGLinearGradientElement>("linearGradient.fd-ribbon");
    const stops = grad.querySelectorAll("stop");
    const count = q<SVGTextElement>(".fd-count");
    const note = q<SVGTextElement>(".fd-note");
    const tick = q<SVGPathElement>(".fd-tick");

    const narrow = window.matchMedia("(max-width: 767px)").matches;
    if (narrow) s.setAttribute("viewBox", "360 0 810 128");
    // The truck is already on the road when the footer appears.
    const start = narrow ? 360 : 230;
    note.textContent = narrow ? "From its invoice" : "One 120 km delivery, read from its invoice";

    const frame = (t: number) => {
      const done = t >= 1;
      const p = pos(Math.min(1, t));
      const x = start + (END - start) * p;
      const bob = done ? 0 : Math.sin(t * 60) * 0.6;
      truck.setAttribute("transform", `translate(${x} ${ROAD - 37 + bob})`);
      const spin = p * 1800;
      w1.setAttribute("transform", `translate(16 30) rotate(${spin})`);
      w2.setAttribute("transform", `translate(76 30) rotate(${spin})`);
      puff.setAttribute("fill-opacity", done ? "0" : String(0.25 + 0.2 * Math.sin(t * 40)));

      // Hidden trail up to the Senseible line; measured trail after it.
      haze.setAttribute("d", hazePath(100, Math.min(x - 4, LENS)));
      const mEnd = Math.max(LENS, x - 6);
      measured.setAttribute("x2", String(mEnd));
      measured.setAttribute("stroke-opacity", mEnd > LENS + 1 ? "1" : "0");
      grad.setAttribute("x2", String(Math.max(LENS + 1, mEnd)));
      // New trail is amber, then cools to green behind the truck.
      const since = done ? 1 : Math.max(0, Math.min(1, (t - 0.3) / 0.55));
      stops[1].setAttribute("offset", done ? "1" : (since * 0.85).toFixed(3));
      stops[2].setAttribute("offset", done ? "1" : Math.min(1, since * 0.85 + 0.18).toFixed(3));

      if (x > LENS) {
        const frac = Math.max(0, Math.min(1, (x - LENS) / (END - LENS)));
        count.textContent = `${Math.round(KG * frac)} kg CO₂e`;
        count.setAttribute("x", String(x + TRUCK_W / 2));
        count.setAttribute("y", String(ROAD - 46));
      } else count.textContent = "";
      if (done) el.classList.add("is-done");
    };

    let raf = 0;
    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { frame(1); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = (now - t0) / DUR;
        frame(t);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    frame(0);
    if (typeof IntersectionObserver === "undefined") { frame(1); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={root} className="fd-band" aria-hidden="true">
      <svg ref={svg} viewBox="0 0 1200 128">
        <defs>
          <linearGradient className="fd-ribbon" id="fdRibbon" gradientUnits="userSpaceOnUse" x1={LENS} x2={LENS + 1} y1="0" y2="0">
            <stop offset="0" stopColor={GREEN} />
            <stop offset="0" stopColor={GREEN} />
            <stop offset="0" stopColor={AMBER} />
            <stop offset="1" stopColor={AMBER} />
          </linearGradient>
          <linearGradient id="fdLens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GREEN} stopOpacity="0" />
            <stop offset=".6" stopColor={GREEN} stopOpacity=".08" />
            <stop offset="1" stopColor={GREEN} stopOpacity=".14" />
          </linearGradient>
        </defs>

        <line x1="0" y1={ROAD} x2="1200" y2={ROAD} className="fd-road" strokeWidth="2" />

        <g className="fd-place" fill="none" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M40 104 V78 L58 68 V78 L76 68 V78 L94 68 V104" />
          <rect x="82" y="56" width="7" height="18" />
          <path d="M1092 104 V74 L1124 60 L1156 74 V104" />
          <path d="M1112 104 V86 H1136 V104" />
        </g>
        <text className="fd-tag" x="67" y="122" textAnchor="middle">Supplier</text>
        <text className="fd-tag" x="1124" y="122" textAnchor="middle">Buyer</text>
        <path className="fd-tick" d="M1116 46 l5 5 l10 -11" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <rect x={LENS - 16} y="20" width="32" height="84" fill="url(#fdLens)" />
        <line x1={LENS} y1="22" x2={LENS} y2={ROAD} stroke={GREEN} strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 4" />
        <text className="fd-tag" x={LENS} y="14" textAnchor="middle">Senseible</text>

        <path className="fd-haze" d="" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" />
        <line className="fd-measured" x1={LENS} y1="92" x2={LENS} y2="92" stroke="url(#fdRibbon)" strokeWidth="4" strokeLinecap="round" strokeOpacity="0" />

        <g className="fd-truck">
          <rect x="0" y="0" width="64" height="28" rx="3" className="fd-box" />
          <rect x="6" y="11" width="52" height="2" rx="1" fill="#ffffff" fillOpacity=".55" />
          <path d="M64 7 H80 Q84 7 86 11 L92 19 V28 H64 Z" className="fd-cab" />
          <path d="M70 11 H80 L85 18 H70 Z" fill="#dff1e7" />
          <rect x="88" y="22" width="4" height="3" rx="1" fill="#ffd27a" />
          <g className="fd-w1" transform="translate(16 30)"><circle r="6.5" fill="#1d1d1d" /><circle r="2.6" fill="#d9d9d9" /><path d="M0 -4.6 V4.6 M-4.6 0 H4.6" stroke="#6b6b6b" strokeWidth="1" /></g>
          <g className="fd-w2" transform="translate(76 30)"><circle r="6.5" fill="#1d1d1d" /><circle r="2.6" fill="#d9d9d9" /><path d="M0 -4.6 V4.6 M-4.6 0 H4.6" stroke="#6b6b6b" strokeWidth="1" /></g>
          <circle className="fd-puff" cx="-6" cy="24" r="3" fillOpacity="0" />
        </g>
        <text className="fd-count" x="0" y="0" textAnchor="middle" />
        <text className="fd-note" x="1124" y="34" textAnchor="end" />
      </svg>
    </div>
  );
};
