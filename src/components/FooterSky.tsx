import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { istMinutes, mix, moonPhase, paletteFor, rgb, sunAt } from "@/lib/indiaSky";

// Footer "live India sky": the sky behind the footer follows the real sun and
// moon over Gurugram. At night the stars are out and the night shift is lit;
// by day the rooftop solar catches the sun. Smoke, a goods truck and twinkling
// stars move only while the footer is on screen and never with reduced
// motion. Styles: .ftr-sky in src/index.css.

export interface IndiaSky {
  style: CSSProperties;
  dark: boolean;
  alt: number;
  ha: number;
  phase: number;
  land: string;
  far: string;
  road: string;
  panelA: string;
  panelB: string;
  playing: boolean;
}

export function useIndiaSky(ref: RefObject<HTMLElement>): IndiaSky {
  const [now, setNow] = useState(() => new Date());
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  // Animate only while the footer is visible.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setPlaying(es.some((e) => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  return useMemo(() => {
    const { alt, ha } = sunAt(now, istMinutes(now));
    const p = paletteFor(alt);
    const dark = p.fg[0] > 128;
    const s = Math.max(0, Math.min(1, alt / 50));
    const style = {
      "--sky-top": rgb(p.top),
      "--sky-mid": rgb(p.mid),
      "--sky-low": rgb(p.low),
      "--sky-fg": rgb(p.fg),
      "--sky-muted": rgb(p.muted),
      "--sky-chip": dark ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.7)",
      "--sky-chip-hover": dark ? "rgba(255,255,255,.24)" : "#fff",
      "--sky-rule": dark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.08)",
      "--sky-ground": rgb(dark ? mix(p.land, [0, 0, 0], 0.3) : p.low),
      "--sky-smoke": dark ? "#9aa4b4" : "#b9bcbf",
      "--sky-smoke-o": dark ? ".35" : ".5",
    } as CSSProperties;
    return {
      style, dark, alt, ha, phase: moonPhase(now),
      land: rgb(p.land), far: rgb(p.far), road: rgb(mix(p.land, [0, 0, 0], 0.25)),
      panelA: rgb(mix([40, 52, 72], [120, 190, 255], s)), panelB: rgb(mix([24, 30, 44], [40, 90, 170], s)),
      playing,
    };
  }, [now, playing]);
}

// Fixed star positions so the sky is the same on every visit.
const STARS = (() => {
  let s = 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: 70 }, () => ({ x: rnd() * 1440, y: rnd() * 250, r: rnd() * 1.1 + 0.4, d: -rnd() * 4 }));
})();

export const SkyStars = ({ sky }: { sky: IndiaSky }) => (
  <div className="ftr-sky-stars" aria-hidden="true" style={{ opacity: Math.max(0, Math.min(1, (-sky.alt - 6) / 8)) }}>
    <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
      {STARS.map((st, i) => (
        <circle key={i} className="ftr-star" cx={st.x.toFixed(1)} cy={st.y.toFixed(1)} r={st.r.toFixed(2)} fill="#fff" style={{ animationDelay: `${st.d.toFixed(2)}s` }} />
      ))}
    </svg>
  </div>
);

export const TownBand = ({ sky }: { sky: IndiaSky }) => {
  const { alt, ha, phase, dark } = sky;
  const sx = 720 + ha * 7.2;
  const sy = 372 - Math.max(-10, alt) * 1.5;
  // The moon trails the sun by its phase angle.
  const mha = ((((ha - phase * 360) % 360) + 540) % 360) - 180;
  const mx = Math.max(80, Math.min(1360, 720 + mha * 6));
  const my = 300 - Math.cos(mha * Math.PI / 180) * 40;
  const shade = (phase < 0.5 ? -1 : 1) * 26 * (1 - Math.abs(0.5 - phase) * 2);
  const lights = dark ? 1 : alt < 2 ? 0.5 : 0;

  return (
    <div className="ftr-sky-band" aria-hidden="true">
      <svg viewBox="0 236 1440 150" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="ftrSunGlow"><stop offset="0" stopColor="#fff6d8" stopOpacity=".9" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" /></radialGradient>
          <linearGradient id="ftrPanel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={sky.panelA} /><stop offset="1" stopColor={sky.panelB} /></linearGradient>
        </defs>
        <g transform={`translate(${sx} ${sy})`} opacity={alt > -3 ? 1 : 0}>
          <circle r="60" fill="url(#ftrSunGlow)" /><circle r="15" fill="#ffe7a3" />
        </g>
        <g transform={`translate(${mx} ${my})`} opacity={alt < -2 && Math.abs(mha) < 100 ? 1 : 0}>
          <circle r="13" fill="#f3efe1" /><circle r="13" cx={shade} style={{ fill: "var(--sky-top)" }} />
        </g>

        <path fill={sky.far} d="M0 360 L60 352 L60 330 L90 330 L90 345 L150 345 L150 322 L170 322 L170 342 L260 342 L260 334 L330 334 L330 350 L420 350 L420 328 L440 328 L440 346 L560 346 L560 338 L700 338 L700 352 L820 352 L820 330 L846 330 L846 348 L980 348 L980 336 L1100 336 L1100 350 L1220 350 L1220 326 L1240 326 L1240 346 L1440 346 L1440 420 L0 420 Z" />
        <g fill={sky.land}>
          <path d="M180 380 L195 350 H290 L305 380 Z" />
          <rect x="265" y="290" width="14" height="62" />
          <path d="M420 380 V344 L452 326 V344 L484 326 V344 L516 326 V344 L548 326 V380 Z" />
          <path d="M760 380 V352 L800 334 L840 352 V380 Z" />
          <rect x="818" y="320" width="10" height="26" />
          <rect x="1040" y="344" width="110" height="36" />
          <circle cx="360" cy="356" r="16" /><rect x="358" y="364" width="4" height="16" />
          <circle cx="640" cy="352" r="20" /><rect x="638" y="362" width="4" height="18" />
          <circle cx="960" cy="358" r="15" /><rect x="958" y="366" width="4" height="14" />
          <circle cx="1290" cy="354" r="18" /><rect x="1288" y="362" width="4" height="18" />
        </g>
        <g fill="url(#ftrPanel)">
          <path d="M424 341 L450 327 L450 331 L424 345 Z" /><path d="M456 341 L482 327 L482 331 L456 345 Z" />
          <path d="M488 341 L514 327 L514 331 L488 345 Z" /><path d="M520 341 L546 327 L546 331 L520 345 Z" />
          <rect x="1048" y="338" width="28" height="5" /><rect x="1080" y="338" width="28" height="5" /><rect x="1112" y="338" width="28" height="5" />
        </g>
        <g opacity={lights} fill="#ffd27a">
          <rect className="ftr-flicker" x="436" y="356" width="10" height="7" /><rect x="468" y="356" width="10" height="7" />
          <rect className="ftr-flicker" x="500" y="356" width="10" height="7" /><rect x="532" y="356" width="10" height="7" />
          <rect x="790" y="362" width="18" height="10" />
          <path d="M210 380 L220 362 H265 L275 380 Z" fill="#ff8a3d" opacity=".55" />
        </g>
        <g transform="translate(272 284)" className="ftr-smoke-src">
          <circle className="ftr-smoke" r="9" /><circle className="ftr-smoke ftr-s2" r="9" /><circle className="ftr-smoke ftr-s3" r="9" />
        </g>
        <rect x="0" y="380" width="1440" height="6" fill={sky.road} />
        <g className="ftr-truck">
          <g transform="translate(0 366)" fill={rgbLift(sky.land)}>
            <rect x="0" y="0" width="58" height="22" rx="2" />
            <path d="M58 6 H74 L82 14 V22 H58 Z" />
            <circle cx="16" cy="24" r="5" fill="#222" /><circle cx="66" cy="24" r="5" fill="#222" />
            <circle cx="82" cy="17" r="2.4" fill="#fff3c4" opacity={dark ? 1 : 0} />
          </g>
        </g>
      </svg>
    </div>
  );
};

function rgbLift(c: string): string {
  const m = c.match(/\d+/g);
  if (!m) return c;
  return rgb(mix(m.map(Number) as [number, number, number], [255, 255, 255], 0.15));
}

/** Ref helper so Footer can observe its own element. */
export const useFooterRef = () => useRef<HTMLElement>(null);
