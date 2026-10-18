import { useEffect, useRef } from "react";
import { getFreightFactor } from "@/lib/calculators/freightFactors";

// Footer "one shipment, four routes": the same 8 t over 1,000 km travels by
// truck, electric train, container ship and freighter plane in a continuous
// loop. Each vehicle crosses the Senseible line, where its hidden trail
// becomes a measured one; the trail's thickness and colour carry the intensity
// (amber road, thin green rail and sea, heavy orange air). The count rides
// with the vehicle, legs cheaper than road add to "Saved vs road", and the
// chips let a visitor pick the next leg. It animates only while the footer is
// on screen; reduced motion shows every result as a still.

type Mode = "truck" | "train" | "ship" | "plane";
const FACTOR_ID: Record<Mode, string> = { truck: "road-hcv20-diesel", train: "rail-india", ship: "sea-container", plane: "air-freighter-long" };
const ORDER: Mode[] = ["truck", "train", "ship", "plane"];
const GROUND: Record<Mode, string> = { truck: "road", train: "rail", ship: "sea", plane: "air" };
const WIDTH: Record<Mode, number> = { truck: 92, train: 184, ship: 150, plane: 116 };
const COLOR: Record<Mode, [string, string]> = { truck: ["#15803d", "#d97706"], train: ["#15803d", "#15803d"], ship: ["#15803d", "#15803d"], plane: ["#d97706", "#c2410c"] };
const LABEL: Record<Mode, string> = { truck: "truck", train: "train", ship: "ship", plane: "plane" };

const factor = (m: Mode) => getFreightFactor(FACTOR_ID[m]);
const K = Object.fromEntries(ORDER.map((m) => [m, factor(m)?.kgCO2ePerTKm ?? 0])) as Record<Mode, number>;
// Factors still being confirmed are shown as approximate.
const APPROX = Object.fromEntries(ORDER.map((m) => [m, factor(m)?.status !== "confirmed"])) as Record<Mode, boolean>;
const KG = (m: Mode) => Math.round(8 * 1000 * K[m]);
const fmt = (m: Mode, n: number) => `${APPROX[m] ? "≈" : ""}${n.toLocaleString("en-IN")}`;
const LENS = 430;
const END = 1000;
const DUR = 4200;
const MAXK = Math.max(...ORDER.map((m) => K[m]));

const CHIP_ICON: Record<Mode, JSX.Element> = {
  truck: <svg viewBox="0 0 18 12"><rect x="0" y="1" width="11" height="8" rx="1" fill="#1f5139" /><path d="M11 3h4l3 3v3h-7z" fill="#2c6b4c" /><circle cx="4" cy="10" r="1.6" fill="#222" /><circle cx="14" cy="10" r="1.6" fill="#222" /></svg>,
  train: <svg viewBox="0 0 18 12"><rect x="0" y="3" width="7" height="6" fill="#5c7a6b" /><path d="M8 2h7q3 0 3 4v3H8z" fill="#1f5139" /><circle cx="3" cy="10" r="1.3" fill="#222" /><circle cx="11" cy="10" r="1.3" fill="#222" /><circle cx="16" cy="10" r="1.3" fill="#222" /></svg>,
  ship: <svg viewBox="0 0 18 12"><path d="M0 6h18l-2 5H2z" fill="#1f5139" /><rect x="3" y="2" width="4" height="4" fill="#d97706" /><rect x="8" y="2" width="4" height="4" fill="#2f7a55" /><rect x="13" y="0" width="3" height="6" fill="#9aa5ad" /></svg>,
  plane: <svg viewBox="0 0 18 12"><path d="M0 6q1-2 3-2h12q3 0 3 2t-3 2H3q-2 0-3-2z" fill="#cfd6da" /><path d="M7 6l4-5h2l-2 5z" fill="#1f5139" /><path d="M1 5l-1-4h2l2 4z" fill="#1f5139" /></svg>,
};

export const FooterDelivery = () => {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;
    const svg = q<SVGSVGElement>("svg.fd-scene");
    const haze = q<SVGPathElement>(".fd-haze");
    const measured = q<SVGPathElement>(".fd-measured");
    const grad = q<SVGLinearGradientElement>("linearGradient.fd-ribbon");
    const stops = grad.querySelectorAll("stop");
    const count = q<SVGTextElement>(".fd-count");
    const badge = q<SVGTextElement>(".fd-badge");
    const savedEl = q<HTMLSpanElement>(".fd-saved b");
    const vehicle = (m: Mode) => q<SVGGElement>(`.fd-v-${m}`);
    const ground = (g: string) => q<SVGGElement>(`.fd-g-${g}`);
    const chip = (m: Mode) => q<HTMLButtonElement>(`.fd-chip[data-m="${m}"]`);
    const wave1 = q<SVGPathElement>(".fd-wave1");
    const wave2 = q<SVGPathElement>(".fd-wave2");
    const gear = q<SVGGElement>(".fd-gear");

    const narrow = window.matchMedia("(max-width: 767px)").matches;
    if (narrow) svg.setAttribute("viewBox", "360 0 810 132");
    const start = narrow ? 300 : 200;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wavePath = (ph: number, y: number) => {
      let d = `M0 ${y}`;
      for (let x = 0; x <= 1200; x += 20) d += ` Q${x + 10} ${y + Math.sin((x + ph) / 40) * 3} ${x + 20} ${y}`;
      return d;
    };
    const planeY = (px: number) => {
      const d = Math.max(0, Math.min(1, (px - start) / (700 - start)));
      return 14 + (106 - 30 - 14) * (1 - (1 - d) ** 2);
    };

    let saved = 0;
    let shownSaved = 0;
    let mode: Mode = "truck";
    let leg = 0;
    let nextPick: Mode | null = null;
    let t0 = 0;
    let raf = 0;
    let timer = 0;
    let running = false;
    let visible = false;
    let wavePh = 0;

    const countUp = (to: number) => {
      const from = shownSaved;
      const s = performance.now();
      const tick = (n: number) => {
        const p = Math.min(1, (n - s) / 700);
        shownSaved = Math.round(from + (to - from) * p);
        savedEl.textContent = shownSaved.toLocaleString("en-IN");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const startLeg = (m: Mode) => {
      mode = m;
      ORDER.forEach((x) => {
        ground(GROUND[x]).setAttribute("opacity", x === m ? "1" : "0");
        vehicle(x).setAttribute("opacity", x === m ? "1" : "0");
        chip(x).classList.toggle("is-now", x === m);
      });
      measured.setAttribute("stroke-width", (1.6 + Math.sqrt(K[m] / MAXK) * 6.4).toFixed(1));
      stops[0].setAttribute("stop-color", COLOR[m][0]);
      stops[1].setAttribute("stop-color", COLOR[m][0]);
      stops[2].setAttribute("stop-color", COLOR[m][1]);
      stops[3].setAttribute("stop-color", COLOR[m][1]);
      badge.textContent = "";
      t0 = performance.now();
    };

    const finishLeg = (m: Mode) => {
      const c = chip(m);
      (c.querySelector(".fd-v") as HTMLElement).textContent = fmt(m, KG(m));
      (c.querySelector(".fd-bar i") as HTMLElement).style.width = `${Math.max(8, Math.sqrt(K[m] / MAXK) * 100)}%`;
      if (K[m] < K.truck) { saved += KG("truck") - KG(m); countUp(saved); }
    };

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / DUR);
      const p = t < 0.8 ? (t / 0.8) * 0.85 : 0.85 + (1 - (1 - (t - 0.8) / 0.2) ** 3) * 0.15;
      const x = start + (END - start) * p;
      let y = 106 - 37;
      let rot = 0;
      if (mode === "train") y = 106 - 38;
      if (mode === "ship") { y = 106 - 42 + Math.sin(now / 420) * 1.6; rot = Math.sin(now / 520) * 1.2; }
      if (mode === "plane") {
        const d = Math.min(1, (x - start) / (700 - start));
        y = planeY(x); rot = d < 1 ? 6 * (1 - d) : 0;
        gear.setAttribute("opacity", d > 0.55 ? "1" : "0");
      }
      const v = vehicle(mode);
      v.setAttribute("transform", `translate(${x} ${y}) rotate(${rot})`);
      if (mode === "truck") v.querySelectorAll<SVGGElement>(".fd-wh").forEach((g) => g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) rotate(${p * 1800})`));
      if (mode === "ship") { wavePh += 1.2; wave1.setAttribute("d", wavePath(wavePh, 108)); wave2.setAttribute("d", wavePath(-wavePh * 0.6, 114)); }

      // Hidden trail up to the Senseible line, measured trail after it.
      const trailY = mode === "ship" ? 98 : 92;
      const tail = x - 6;
      let hd = "";
      for (let hx = 100; hx < Math.min(tail, LENS); hx += 12) hd += `${hd ? "L" : "M"}${hx} ${mode === "plane" ? planeY(hx) + 14 : trailY - 10 + Math.sin(hx / 23) * 2} `;
      haze.setAttribute("d", hd);
      const mEnd = Math.max(LENS, tail);
      let md = "";
      if (mEnd > LENS + 1) for (let mx = LENS; mx <= mEnd; mx += 8) md += `${md ? "L" : "M"}${mx} ${mode === "plane" ? planeY(mx) + 14 : trailY} `;
      measured.setAttribute("d", md);
      grad.setAttribute("x2", String(Math.max(LENS + 1, mEnd)));
      const since = Math.max(0, Math.min(1, (t - 0.25) / 0.55));
      stops[1].setAttribute("offset", (since * 0.85).toFixed(3));
      stops[2].setAttribute("offset", Math.min(1, since * 0.85 + 0.18).toFixed(3));

      // The count rides with the vehicle; the badge compares with road.
      const frac = Math.max(0, Math.min(1, (x - LENS) / (END - LENS)));
      const cx = x + WIDTH[mode] / 2;
      const cy = (mode === "plane" ? y : 106 - 40) - 14;
      if (x > LENS) {
        count.textContent = `${fmt(mode, Math.round(KG(mode) * frac))} kg CO₂e`;
        count.setAttribute("x", String(cx)); count.setAttribute("y", String(cy));
      } else count.textContent = "";
      if (frac > 0.35 && mode !== "truck") {
        const r = K[mode] / K.truck;
        badge.textContent = r < 1 ? `−${Math.round((1 - r) * 100)}% vs road` : `${Math.round(r)}× road`;
        badge.setAttribute("fill", r < 1 ? "#15803d" : "#c2410c");
        badge.setAttribute("x", String(cx)); badge.setAttribute("y", String(cy - 15));
      }

      if (t >= 1) {
        finishLeg(mode);
        leg += 1;
        const next = nextPick ?? ORDER[leg % ORDER.length];
        nextPick = null;
        ORDER.forEach((m) => chip(m).classList.remove("is-next"));
        running = false;
        // A short beat at the buyer before the next vehicle rolls in.
        timer = window.setTimeout(() => { if (visible) { startLeg(next); running = true; raf = requestAnimationFrame(frame); } }, 700);
        return;
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const onPick = (e: Event) => {
      const m = (e.currentTarget as HTMLButtonElement).dataset.m as Mode;
      nextPick = m;
      ORDER.forEach((x) => chip(x).classList.toggle("is-next", x === m));
    };
    ORDER.forEach((m) => chip(m).addEventListener("click", onPick));

    if (reduce || typeof IntersectionObserver === "undefined") {
      ORDER.forEach(finishLeg);
      startLeg("truck");
      vehicle("truck").setAttribute("transform", `translate(${END} 69)`);
      return () => ORDER.forEach((m) => chip(m).removeEventListener("click", onPick));
    }

    let started = false;
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible && !running) {
        if (!started) { started = true; startLeg(ORDER[0]); } else t0 = performance.now();
        running = true;
        raf = requestAnimationFrame(frame);
      }
      if (!visible) { running = false; cancelAnimationFrame(raf); window.clearTimeout(timer); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => {
      io.disconnect(); cancelAnimationFrame(raf); window.clearTimeout(timer);
      ORDER.forEach((m) => chip(m).removeEventListener("click", onPick));
    };
  }, []);

  return (
    <div ref={root} className="fd-band">
      <svg className="fd-scene" viewBox="0 0 1200 132" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient className="fd-ribbon" id="fdRibbon" gradientUnits="userSpaceOnUse" x1={LENS} x2={LENS + 1} y1="0" y2="0">
            <stop offset="0" /><stop offset="0" /><stop offset="0" /><stop offset="1" />
          </linearGradient>
          <linearGradient id="fdLens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#15803d" stopOpacity="0" /><stop offset="1" stopColor="#15803d" stopOpacity=".14" />
          </linearGradient>
        </defs>

        <g className="fd-ground fd-g-road"><line x1="0" y1="106" x2="1200" y2="106" className="fd-road" strokeWidth="2" /></g>
        <g className="fd-ground fd-g-rail" opacity="0">
          <line x1="0" y1="106" x2="1200" y2="106" stroke="#cfd3d6" strokeWidth="1.5" />
          <line x1="0" y1="110" x2="1200" y2="110" stroke="#cfd3d6" strokeWidth="1.5" />
          <path stroke="#e3e5e7" strokeWidth="2" d={Array.from({ length: 86 }, (_, i) => `M${4 + i * 14} 104 V112`).join(" ")} />
          <line x1="0" y1="52" x2="1200" y2="52" stroke="#d9dcde" strokeWidth="1" />
        </g>
        <g className="fd-ground fd-g-sea" opacity="0"><path className="fd-wave1" fill="none" stroke="#bcd7e6" strokeWidth="2" /><path className="fd-wave2" fill="none" stroke="#dbeaf2" strokeWidth="2" /></g>
        <g className="fd-ground fd-g-air" opacity="0">
          <line x1="560" y1="106" x2="1200" y2="106" stroke="#d3d6d9" strokeWidth="3" />
          <path d="M600 106 h30 M660 106 h30 M720 106 h30 M780 106 h30 M840 106 h30 M900 106 h30 M960 106 h30" stroke="#fff" strokeWidth="1.2" />
        </g>

        <g className="fd-place" fill="none" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M40 106 V80 L58 70 V80 L76 70 V80 L94 70 V106" /><rect x="82" y="58" width="7" height="18" />
          <path d="M1092 106 V76 L1124 62 L1156 76 V106" /><path d="M1112 106 V88 H1136 V106" />
        </g>
        <text className="fd-tag" x="67" y="126" textAnchor="middle">Supplier</text>
        <text className="fd-tag" x="1124" y="126" textAnchor="middle">Buyer</text>

        <rect x={LENS - 16} y="18" width="32" height="88" fill="url(#fdLens)" />
        <line x1={LENS} y1="20" x2={LENS} y2="106" stroke="#15803d" strokeOpacity=".35" strokeDasharray="2 4" />
        <text className="fd-tag" x={LENS} y="12" textAnchor="middle">Senseible</text>

        <path className="fd-haze" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" />
        <path className="fd-measured" fill="none" stroke="url(#fdRibbon)" strokeLinecap="round" />

        <g className="fd-v-truck" opacity="0">
          <rect x="0" y="0" width="64" height="28" rx="3" fill="#1f5139" /><rect x="6" y="11" width="52" height="2" rx="1" fill="#fff" fillOpacity=".55" />
          <path d="M64 7 H80 Q84 7 86 11 L92 19 V28 H64 Z" fill="#2c6b4c" /><path d="M70 11 H80 L85 18 H70 Z" fill="#dff1e7" />
          <g className="fd-wh" data-x="16" data-y="30" transform="translate(16 30)"><circle r="6.5" fill="#1d1d1d" /><circle r="2.6" fill="#d9d9d9" /><path d="M0 -4.6 V4.6 M-4.6 0 H4.6" stroke="#6b6b6b" /></g>
          <g className="fd-wh" data-x="76" data-y="30" transform="translate(76 30)"><circle r="6.5" fill="#1d1d1d" /><circle r="2.6" fill="#d9d9d9" /><path d="M0 -4.6 V4.6 M-4.6 0 H4.6" stroke="#6b6b6b" /></g>
        </g>
        <g className="fd-v-train" opacity="0">
          <rect x="0" y="10" width="40" height="22" rx="2" fill="#5c7a6b" /><rect x="44" y="10" width="40" height="22" rx="2" fill="#4f6e60" /><rect x="88" y="10" width="40" height="22" rx="2" fill="#5c7a6b" />
          <path d="M132 8 H168 Q176 8 180 16 L184 26 V32 H132 Z" fill="#1f5139" /><path d="M168 12 H174 L179 22 H168 Z" fill="#dff1e7" />
          <path d="M150 8 L156 -4 L150 -16 M156 -4 L162 -16" stroke="#3b4a43" strokeWidth="1.4" fill="none" />
          <g fill="#2a2a2a">{[10, 30, 54, 74, 98, 118, 142, 172].map((cx) => <circle key={cx} cx={cx} cy="34" r="3.5" />)}</g>
        </g>
        <g className="fd-v-ship" opacity="0">
          <path d="M0 22 H150 L140 40 H12 Z" fill="#1f5139" />
          <rect x="18" y="8" width="18" height="14" fill="#d97706" /><rect x="38" y="8" width="18" height="14" fill="#2f7a55" /><rect x="58" y="8" width="18" height="14" fill="#9aa5ad" /><rect x="78" y="8" width="18" height="14" fill="#2f7a55" />
          <rect x="28" y="-6" width="18" height="14" fill="#9aa5ad" /><rect x="48" y="-6" width="18" height="14" fill="#d97706" /><rect x="68" y="-6" width="18" height="14" fill="#2f7a55" />
          <rect x="112" y="-2" width="20" height="24" fill="#e9eef0" /><rect x="116" y="3" width="12" height="4" fill="#9fb3bd" /><rect x="120" y="-10" width="5" height="8" fill="#3b4a43" />
        </g>
        <g className="fd-v-plane" opacity="0">
          <path d="M0 14 Q4 8 16 8 H96 Q110 8 116 14 Q110 20 96 20 H16 Q4 20 0 14 Z" fill="#f2f4f5" stroke="#9aa5ad" strokeWidth="1" />
          <path d="M44 14 L70 -8 H80 L66 14 Z" fill="#1f5139" /><path d="M44 14 L70 34 H80 L66 14 Z" fill="#2c6b4c" opacity=".55" />
          <path d="M4 12 L-6 -4 H4 L14 10 Z" fill="#1f5139" />
          <g fill="#9fb3bd"><circle cx="30" cy="12" r="1.4" /><circle cx="38" cy="12" r="1.4" /><circle cx="46" cy="12" r="1.4" /><circle cx="84" cy="12" r="1.4" /><circle cx="92" cy="12" r="1.4" /></g>
          <path d="M104 11 H110 L113 14 H104 Z" fill="#6b7d86" />
          <g className="fd-gear" fill="#2a2a2a" opacity="0"><circle cx="34" cy="26" r="3" /><circle cx="90" cy="26" r="3" /></g>
        </g>

        <text className="fd-count" textAnchor="middle" />
        <text className="fd-badge" textAnchor="middle" />
      </svg>

      <div className="fd-ledger">
        <span className="fd-saved">Saved vs road <b>0</b> kg CO₂e</span>
        {ORDER.map((m) => (
          <button key={m} type="button" className="fd-chip" data-m={m} aria-label={`Send the ${LABEL[m]} next`}>
            {CHIP_ICON[m]}
            <span className="fd-bar"><i style={{ background: COLOR[m][1] }} /></span>
            <span className="fd-v">–</span>
          </button>
        ))}
      </div>
    </div>
  );
};
