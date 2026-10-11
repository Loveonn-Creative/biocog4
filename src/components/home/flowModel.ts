// Invoice → verified → finance, as a small physics model on a 2D canvas.
//
// The motion encodes the method, not decoration:
//  1. Line items leave the invoice carrying an activity value (kWh, litres).
//  2. Crossing the factor lens, each becomes emissions = activity × factor;
//     the particle's AREA is proportional to its tCO2e.
//  3. The verification gate is a confidence band whose half-width shrinks as
//     k / sqrt(n) with n verified items (standard error of a mean). Particles
//     are pulled into the band by a damped spring (Hooke's law + drag).
//  4. Verified items settle under gravity into the finance reservoir, whose
//     level is the running total.
// No dependencies; pauses when hidden; caps work on low-end devices.

export interface FlowStats {
  verified: number;
  bandPct: number;
  totalT: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  scope: 1 | 2 | 3;
  activity: number;
  co2t: number;
  r: number;
  stage: 0 | 1 | 2 | 3; // raw, multiplied, verified, settled
}

const SCOPES = [
  { scope: 1 as const, factor: 2.68e-3, weight: 0.3 },   // diesel, tCO2 per litre
  { scope: 2 as const, factor: 0.710e-3, weight: 0.5 },  // grid power, tCO2 per kWh (CEA v21.0)
  { scope: 3 as const, factor: 1.2e-3, weight: 0.2 },    // purchased goods, illustrative
];

const BAND_K = 18;      // band half-width in % at n = 1
const BAND_MIN = 2;     // floor so the band never collapses to a line
const BAND_SCALE = 4;   // maps the band's % half-width to flow-space units for display

function cssColor(name: string, fallback: string) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? `hsl(${v})` : fallback;
  } catch { return fallback; }
}

export function startFlow(canvas: HTMLCanvasElement, onStats: (s: FlowStats) => void): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
  const frameMs = lowEnd ? 1000 / 30 : 1000 / 60;
  const maxParticles = lowEnd ? 40 : 70;
  const colors = {
    fg: cssColor('--foreground', '#141414'),
    muted: cssColor('--muted-foreground', '#737373'),
    border: cssColor('--border', '#ebebeb'),
    s1: cssColor('--warning', '#f59e0b'),
    s2: cssColor('--primary', '#1f5e44'),
    s3: cssColor('--success', '#29a36a'),
  };
  const scopeColor = (s: 1 | 2 | 3) => (s === 1 ? colors.s1 : s === 2 ? colors.s2 : colors.s3);

  let w = 0, h = 0, dpr = 1, vertical = false;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vertical = w < 640; // matches the `sm` breakpoint used by the container
  };
  resize();

  // Geometry in "flow space": u runs along the flow (0..1), v across it (-1..1).
  const toXY = (u: number, v: number): [number, number] =>
    vertical ? [w / 2 + v * w * 0.32, 24 + u * (h - 48)] : [24 + u * (w - 48), h / 2 + v * h * 0.32];
  const LENS_U = 0.33, GATE_U = 0.62, POOL_U = 0.86;

  const particles: Particle[] = [];
  let verified = 0, totalT = 0, poolLevel = 0, spawnAcc = 0;
  let last = performance.now(), statsAcc = 0, raf = 0, running = true;

  const spawn = () => {
    const pick = Math.random();
    const def = pick < SCOPES[0].weight ? SCOPES[0] : pick < SCOPES[0].weight + SCOPES[1].weight ? SCOPES[1] : SCOPES[2];
    // Log-normal activity: most line items are small, a few are large.
    const activity = Math.exp(Math.log(def.scope === 2 ? 900 : 120) + (Math.random() - 0.5) * 1.4);
    particles.push({ x: 0.03, y: (Math.random() - 0.5) * 0.2, vx: 0.15 + Math.random() * 0.04, vy: 0, scope: def.scope, activity, co2t: activity * def.factor, r: 2.2, stage: 0 });
  };

  const bandHalf = () => Math.max(BAND_MIN, BAND_K / Math.sqrt(Math.max(1, verified))) / 100;

  const step = (dt: number) => {
    spawnAcc += dt;
    if (spawnAcc > 0.38 && particles.length < maxParticles) { spawnAcc = 0; spawn(); }
    const band = bandHalf() * BAND_SCALE;
    for (const p of particles) {
      if (p.stage < 3) p.x += p.vx * dt;                       // x holds u
      if (p.stage === 0 && p.x >= LENS_U) { p.stage = 1; p.r = 2 + Math.sqrt(p.co2t) * 7; }
      if (p.stage <= 1) {
        p.vy += (Math.random() - 0.5) * 2.4 * dt;              // measurement noise
      } else if (p.stage === 2 && p.x >= POOL_U) {
        p.stage = 3; totalT += p.co2t; poolLevel = Math.min(1, poolLevel + p.co2t / 12);
      }
      if (p.x >= GATE_U && p.stage === 1) { p.stage = 2; verified += 1; }
      if (p.x >= GATE_U - 0.08 && p.stage <= 2) {
        // Damped spring toward the band centre; stiffer outside the band.
        const k = Math.abs(p.y) > band ? 26 : 9;
        p.vy += (-k * p.y - 5 * p.vy) * dt;
      }
      p.y += p.vy * dt;
      p.y = Math.max(-1, Math.min(1, p.y));
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].stage === 3) particles.splice(i, 1);
    if (poolLevel >= 1) { poolLevel = 0; verified = 0; totalT = 0; } // loop the story
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    // Invoice glyph
    const [ix, iy] = toXY(0.02, 0);
    ctx.strokeStyle = colors.fg; ctx.fillStyle = 'transparent';
    ctx.strokeRect(ix - 13, iy - 17, 26, 34);
    ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(ix - 8, iy - 9 + i * 6); ctx.lineTo(ix + 8 - (i === 3 ? 6 : 0), iy - 9 + i * 6); } ctx.stroke();
    // Factor lens
    ctx.strokeStyle = colors.muted; ctx.setLineDash([3, 4]);
    const [l1x, l1y] = toXY(LENS_U, -1), [l2x, l2y] = toXY(LENS_U, 1);
    ctx.beginPath(); ctx.moveTo(l1x, l1y); ctx.lineTo(l2x, l2y); ctx.stroke(); ctx.setLineDash([]);
    // Confidence band, narrowing as 1/sqrt(n)
    const band = bandHalf() * BAND_SCALE;
    ctx.strokeStyle = colors.s2; ctx.globalAlpha = 0.55;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let u = GATE_U - 0.08; u <= POOL_U; u += 0.01) {
        const spread = u < GATE_U ? band + (GATE_U - u) * 4 : band;
        const [x, y] = toXY(u, side * Math.min(1, spread));
        if (u === GATE_U - 0.08) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Finance reservoir
    const [p1x, p1y] = toXY(POOL_U + 0.02, -0.75), [p2x, p2y] = toXY(0.99, 0.75);
    const px = Math.min(p1x, p2x), py = Math.min(p1y, p2y), pw = Math.abs(p2x - p1x) || 30, ph = Math.abs(p2y - p1y) || 30;
    ctx.strokeStyle = colors.fg; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = colors.s2; ctx.globalAlpha = 0.85;
    ctx.fillRect(px, py + ph * (1 - poolLevel), pw, ph * poolLevel);
    ctx.globalAlpha = 1;
    // Particles
    for (const p of particles) {
      const [x, y] = toXY(p.x, p.y);
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = scopeColor(p.scope);
      ctx.globalAlpha = p.stage === 0 ? 0.45 : p.stage === 1 ? 0.7 : 1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const elapsed = now - last;
    if (elapsed < frameMs - 1) return;
    last = now;
    const dt = Math.min(elapsed, 64) / 1000;
    step(dt); draw();
    statsAcc += dt;
    if (statsAcc > 0.25) { statsAcc = 0; onStats({ verified, bandPct: Math.max(BAND_MIN, BAND_K / Math.sqrt(Math.max(1, verified))), totalT }); }
  };

  const pause = () => { running = false; cancelAnimationFrame(raf); };
  const resume = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } };

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? resume() : pause()), { threshold: 0.05 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? pause() : resume());
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  raf = requestAnimationFrame(loop);
  return () => { pause(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}
