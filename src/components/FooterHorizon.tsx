import { useEffect, useRef, useState } from "react";

// Footer "ledger horizon": a perforated invoice edge is stitched into one line;
// each MSME unit on it (loom shed, brick kiln, forge, cold store) breathes out
// one puff that settles as a leaf and gets its tick, and the line ends in a
// sprout. Plays once when the footer is first seen, then stays still. The
// column in use lights its unit. Styles: .ftr-horizon in src/index.css.

export type FooterColumn = "platform" | "solutions" | "company" | "legal";

export const FooterHorizon = ({ active }: { active: FooterColumn | null }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [play, setPlay] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setPlay(true); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setPlay(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Phones show the right half of the line at a readable size.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fit = () => setNarrow(mq.matches);
    fit();
    mq.addEventListener("change", fit);
    return () => mq.removeEventListener("change", fit);
  }, []);

  const unit = (id: FooterColumn) => `ftr-unit${active === id ? " is-on" : ""}`;

  return (
    <svg
      ref={ref}
      className={`ftr-horizon${play ? " play" : ""}`}
      viewBox={narrow ? "500 0 660 96" : "0 0 1152 96"}
      aria-hidden="true"
      focusable="false"
    >
      <line className="ftr-tear" x1="16" y1="84" x2="1112" y2="84" />
      <path className="ftr-stitch" d="M16 84 H1112" />

      <g className={`${unit("platform")} ftr-wide`} style={{ ["--d" as string]: ".35s" }}>
        <path d="M300 84 V58 L322 46 V58 L344 46 V58 L366 46 V58 L388 46 V84" />
        <line x1="378" y1="50" x2="378" y2="40" />
        <circle className="ftr-puff" cx="378" cy="34" r="5" />
        <path className="ftr-leaf" d="M378 34 c4 -6 11 -6 13 0 c-2 6 -9 6 -13 0z" />
        <path className="ftr-tick" d="M338 76 l4 4 l8 -9" />
      </g>

      <g className={unit("solutions")} style={{ ["--d" as string]: ".7s" }}>
        <path d="M528 84 L538 62 H602 L612 84" />
        <path d="M590 62 V30 H600 V62" />
        <circle className="ftr-puff" cx="595" cy="24" r="6" />
        <path className="ftr-leaf" d="M595 24 c4 -6 11 -6 13 0 c-2 6 -9 6 -13 0z" />
        <path className="ftr-tick" d="M556 76 l4 4 l8 -9" />
      </g>

      <g className={unit("company")} style={{ ["--d" as string]: "1.05s" }}>
        <path d="M762 84 V60 L800 42 L838 60 V84" />
        <path d="M820 51 V32 H829 V55" />
        <rect x="788" y="68" width="22" height="16" />
        <circle className="ftr-puff" cx="824" cy="26" r="5.5" />
        <path className="ftr-leaf" d="M824 26 c4 -6 11 -6 13 0 c-2 6 -9 6 -13 0z" />
        <path className="ftr-tick" d="M772 76 l4 4 l8 -9" />
      </g>

      <g className={unit("legal")} style={{ ["--d" as string]: "1.35s" }}>
        <rect x="992" y="54" width="80" height="30" />
        <circle cx="1012" cy="69" r="7" />
        <line x1="1012" y1="62" x2="1012" y2="76" />
        <line x1="1005" y1="69" x2="1019" y2="69" />
        <path d="M1056 54 V44 H1064 V54" />
        <circle className="ftr-puff" cx="1060" cy="38" r="5" />
        <path className="ftr-leaf" d="M1060 38 c4 -6 11 -6 13 0 c-2 6 -9 6 -13 0z" />
        <path className="ftr-tick" d="M1034 76 l4 4 l8 -9" />
      </g>

      <path className="ftr-sprout-stem" d="M1124 84 C1124 74 1122 66 1125 56" />
      <path className="ftr-sprout-leaf ftr-l" d="M1125 58 c-4 -10 -14 -12 -20 -8 c4 8 12 11 20 8z" />
      <path className="ftr-sprout-leaf ftr-r" d="M1125 58 c3 -9 12 -12 18 -9 c-3 8 -11 11 -18 9z" />
    </svg>
  );
};
