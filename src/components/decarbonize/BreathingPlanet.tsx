import { useEffect, useRef, type MutableRefObject } from "react";
import { LAND_H, LAND_MASK_B64, LAND_W } from "@/lib/worldLandMask";
import { prefersReducedMotion } from "./useScrollProgress";

/** Industrial city clusters across India, where the smoke rises from. */
const CITIES: [number, number][] = [
  [28.6, 77.2], [19.1, 72.9], [22.6, 88.4], [13.1, 80.3], [12.97, 77.6], [23.0, 72.6],
  [26.4, 80.3], [30.9, 75.8], [21.2, 72.8], [11.1, 77.3], [17.4, 78.5], [22.3, 70.8],
];

const DEG = Math.PI / 180;
const TILT = 0.38; // north pole leans toward the viewer, so India sits well in view
const INDIA_LON = 79 * DEG;

type Pt = { lat: number; lon: number; india: boolean };

/** Land points, thinned by latitude so the dots stay evenly spaced on the sphere. */
function landPoints(): Pt[] {
  const bin = atob(LAND_MASK_B64);
  const pts: Pt[] = [];
  for (let y = 0; y < LAND_H; y += 1) {
    const lat = 90 - ((y + 0.5) / LAND_H) * 180;
    const stride = Math.max(1, Math.round(1 / Math.max(0.12, Math.cos(lat * DEG))));
    for (let x = 0; x < LAND_W; x += stride) {
      const byte = bin.charCodeAt(y * (LAND_W / 8) + (x >> 3));
      if (!((byte >> (7 - (x & 7))) & 1)) continue;
      const lon = ((x + 0.5) / LAND_W) * 360 - 180;
      pts.push({ lat: lat * DEG, lon: lon * DEG, india: lat > 7 && lat < 36 && lon > 67 && lon < 98 });
    }
  }
  return pts;
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const GREY = [176, 178, 182], GREEN = [104, 214, 146], GOLD = [250, 204, 102];
const OCEAN_SMOG = [22, 24, 28], OCEAN_CLEAR = [9, 44, 52];
const EMBER = [255, 138, 61];

/**
 * The Breathing Planet. A dotted Earth turns slowly, tilted so India faces the
 * visitor. City clusters across India glow and release smoke that wraps the
 * globe in haze. `progress` (0 to 1, driven by scroll) clears the haze, thins
 * the plumes to nothing and turns the land green and gold at sunrise.
 */
export function BreathingPlanet({ progress, className = "" }: { progress: MutableRefObject<number>; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const pts = landPoints();
    const particles: { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }[] = [];
    let size = 0, dpr = 1, raf = 0, visible = true, last = performance.now();
    let rot = INDIA_LON - 0.55; // India starts just left of centre and turns into view

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      size = Math.max(1, Math.round(Math.min(box.width, box.height)));
      canvas.width = size * dpr; canvas.height = size * dpr;
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); })
      : null;
    io?.observe(canvas);

    const project = (lat: number, lon: number, cx: number, cy: number, r: number) => {
      const dl = lon - rot;
      const cosc = Math.sin(TILT) * Math.sin(lat) + Math.cos(TILT) * Math.cos(lat) * Math.cos(dl);
      return {
        x: cx + r * Math.cos(lat) * Math.sin(dl),
        y: cy - r * (Math.cos(TILT) * Math.sin(lat) - Math.sin(TILT) * Math.cos(lat) * Math.cos(dl)),
        z: cosc,
      };
    };

    function frame(now: number) {
      raf = 0;
      const dt = Math.min(64, now - last); last = now;
      const p = progress.current;
      const clear = Math.min(1, Math.max(0, (p - 0.05) / 0.85)); // haze gone by 90% of the scroll
      const sunrise = Math.min(1, Math.max(0, (p - 0.55) / 0.45));
      if (!reduced) rot += dt * (2 * Math.PI / 90000); // one turn every 90 seconds

      const W = size * dpr, cx = W / 2, cy = W / 2, r = W * 0.4;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, W);

      // atmosphere: grey haze ring that becomes a green-gold dawn glow
      const halo = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.32);
      halo.addColorStop(0, rgba(mix([150, 150, 150], mix(GREEN, GOLD, sunrise), clear), 0.55));
      halo.addColorStop(1, rgba(mix([150, 150, 150], GOLD, clear), 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.32, 0, Math.PI * 2); ctx.fill();

      // ocean, lit from the lower left as the sun comes up
      const sea = ctx.createRadialGradient(cx - r * 0.45, cy + r * 0.35, r * 0.1, cx, cy, r);
      sea.addColorStop(0, rgba(mix(mix(OCEAN_SMOG, OCEAN_CLEAR, clear), [120, 92, 40], sunrise * 0.6), 1));
      sea.addColorStop(1, rgba(mix(OCEAN_SMOG, OCEAN_CLEAR, clear), 1));
      ctx.fillStyle = sea;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // land dots
      const dot = Math.max(1.4, r / 105);
      const land = mix(GREY, GREEN, clear);
      for (const pt of pts) {
        const q = project(pt.lat, pt.lon, cx, cy, r);
        if (q.z <= 0.02) continue;
        const shade = 0.45 + 0.55 * q.z;
        ctx.fillStyle = rgba(pt.india ? mix(land, GOLD, sunrise * 0.7) : land, shade);
        ctx.fillRect(q.x - dot / 2, q.y - dot / 2, dot, dot);
      }

      // cities: embers that cool to gold, each releasing smoke while hazy
      const emit = (1 - clear) * (reduced ? 0 : 1);
      for (const [lat, lon] of CITIES) {
        const q = project(lat * DEG, lon * DEG, cx, cy, r);
        if (q.z <= 0.05) continue;
        const glowR = dot * (3.2 - 1.6 * clear);
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, glowR * 2.4);
        const c = mix(EMBER, GOLD, clear);
        g.addColorStop(0, rgba(c, 0.95 * q.z)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(q.x, q.y, glowR * 2.4, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.22 * emit && particles.length < 260) {
          particles.push({ x: q.x, y: q.y, vx: (Math.random() - 0.3) * 0.25 * dpr, vy: -(0.25 + Math.random() * 0.35) * dpr, r: dot * 1.5, life: 0, max: 2200 + Math.random() * 1800 });
        }
      }

      // smoke plumes
      for (let i = particles.length - 1; i >= 0; i--) {
        const s = particles[i];
        s.life += dt; s.x += s.vx * dt * 0.06; s.y += s.vy * dt * 0.06; s.r += dt * 0.006 * dpr;
        const t = s.life / s.max;
        if (t >= 1) { particles.splice(i, 1); continue; }
        ctx.fillStyle = rgba([150, 150, 152], 0.28 * (1 - t) * (1 - clear * 0.7));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }

      // haze over the whole globe, thinning with the scroll
      if (clear < 1) {
        const haze = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.2, cx, cy, r * 1.25);
        haze.addColorStop(0, rgba([160, 160, 160], 0.38 * (1 - clear)));
        haze.addColorStop(1, rgba([120, 120, 125], 0.1 * (1 - clear)));
        ctx.fillStyle = haze;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2); ctx.fill();
      }

      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const onVis = () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [progress]);

  return <canvas ref={canvasRef} className={`block aspect-square w-full ${className}`} aria-hidden="true" />;
}

export default BreathingPlanet;
