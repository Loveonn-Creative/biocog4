// Supplier network for /enterprise, drawn on a 2D canvas.
//
// The buyer sits at the centre. Suppliers sit on rings and relax into place
// with spring forces (each pulled to its ring radius, pushed from neighbours).
// Records travel inward through five stage rings: invite, collect, clean,
// verify, report. A record slows at the verify ring when its confidence is
// low, so the exception path is visible. Node colour is the supplier's data
// tier: primary data, document-derived, or spend-based estimate.
// Pauses when off-screen or hidden; no dependencies.

export type Tier = 'primary' | 'document' | 'estimate';

export interface GraphSupplier {
  id: string;
  tier: Tier;
  channel: string;
}

interface Node extends GraphSupplier {
  angle: number; ring: number; r: number; x: number; y: number; vx: number; vy: number;
}

interface Packet { from: Node; t: number; speed: number; lowConfidence: boolean }

const STAGES = 5;

function css(name: string, fallback: string) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? `hsl(${v})` : fallback;
  } catch { return fallback; }
}

export function startGraph(
  canvas: HTMLCanvasElement,
  suppliers: GraphSupplier[],
  onSelect: (id: string) => void,
): { stop: () => void; highlight: (id: string | null) => void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { stop: () => {}, highlight: () => {} };

  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
  const frameMs = lowEnd ? 1000 / 30 : 1000 / 60;
  const color = {
    fg: css('--foreground', '#141414'),
    muted: css('--muted-foreground', '#737373'),
    ring: css('--border', '#e5e5e5'),
    primary: css('--primary', '#1f5e44'),
    success: css('--success', '#29a36a'),
    warning: css('--warning', '#f59e0b'),
  };
  const tierColor = (t: Tier) => (t === 'primary' ? color.primary : t === 'document' ? color.success : color.warning);

  let w = 0, h = 0, cx = 0, cy = 0, R = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height; cx = w / 2; cy = h / 2;
    R = Math.min(w, h) * 0.46;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const nodes: Node[] = suppliers.map((s, i) => {
    const ring = s.tier === 'primary' ? 0.62 : s.tier === 'document' ? 0.8 : 0.96;
    const angle = (i / suppliers.length) * Math.PI * 2 + (i % 3) * 0.13;
    const r = s.tier === 'primary' ? 6 : s.tier === 'document' ? 4.5 : 3.2;
    return { ...s, ring, angle, r, x: cx + Math.cos(angle) * R * ring, y: cy + Math.sin(angle) * R * ring, vx: 0, vy: 0 };
  });

  const packets: Packet[] = [];
  let selected: string | null = null;
  let spawnAcc = 0, last = performance.now(), raf = 0, running = true, time = 0;

  const step = (dt: number) => {
    time += dt;
    // Spring relaxation: pull to ring radius, repel close neighbours, slow drift.
    for (const n of nodes) {
      n.angle += dt * 0.02 * (n.tier === 'estimate' ? 0.6 : 1);
      const tx = cx + Math.cos(n.angle) * R * n.ring;
      const ty = cy + Math.sin(n.angle) * R * n.ring;
      n.vx += (tx - n.x) * 6 * dt;
      n.vy += (ty - n.y) * 6 * dt;
      for (const m of nodes) {
        if (m === n) continue;
        const dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 400) { const f = (400 - d2) / 400 * 40 * dt; n.vx += dx * f / Math.sqrt(d2); n.vy += dy * f / Math.sqrt(d2); }
      }
      n.vx *= 0.86; n.vy *= 0.86;
      n.x += n.vx * dt * 10; n.y += n.vy * dt * 10;
    }
    spawnAcc += dt;
    if (spawnAcc > (lowEnd ? 0.45 : 0.28) && packets.length < 40) {
      spawnAcc = 0;
      const from = nodes[Math.floor(Math.random() * nodes.length)];
      packets.push({ from, t: 0, speed: 0.22 + Math.random() * 0.1, lowConfidence: from.tier === 'estimate' ? Math.random() < 0.6 : Math.random() < 0.12 });
    }
    for (const p of packets) {
      // Low-confidence records dwell at the verify ring (the exception queue).
      const atVerify = p.t > 0.62 && p.t < 0.74;
      p.t += dt * p.speed * (p.lowConfidence && atVerify ? 0.18 : 1);
    }
    for (let i = packets.length - 1; i >= 0; i--) if (packets[i].t >= 1) packets.splice(i, 1);
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    // Stage rings, from the supplier edge inward.
    for (let s = 0; s < STAGES; s++) {
      const rr = R * (0.52 - s * 0.09);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(rr, 6), 0, Math.PI * 2);
      ctx.strokeStyle = color.ring; ctx.lineWidth = 1;
      ctx.setLineDash(s === 3 ? [2, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    // Packets travel along a curve from the supplier to the centre.
    for (const p of packets) {
      const e = 1 - Math.pow(1 - p.t, 2);
      const x = p.from.x + (cx - p.from.x) * e;
      const y = p.from.y + (cy - p.from.y) * e + Math.sin(p.t * Math.PI) * 6;
      ctx.beginPath(); ctx.arc(x, y, p.lowConfidence ? 2.4 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = p.lowConfidence ? color.warning : color.primary;
      ctx.globalAlpha = 0.35 + 0.65 * p.t; ctx.fill(); ctx.globalAlpha = 1;
    }
    // Suppliers
    for (const n of nodes) {
      const isSel = n.id === selected;
      ctx.beginPath(); ctx.arc(n.x, n.y, isSel ? n.r + 3 : n.r, 0, Math.PI * 2);
      ctx.fillStyle = tierColor(n.tier); ctx.globalAlpha = selected && !isSel ? 0.35 : 0.95; ctx.fill(); ctx.globalAlpha = 1;
      if (isSel) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2); ctx.strokeStyle = color.fg; ctx.stroke(); }
    }
    // Buyer at the centre.
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fillStyle = color.fg; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 16 + Math.sin(time * 1.6) * 1.2, 0, Math.PI * 2); ctx.strokeStyle = color.fg; ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
  };

  const loop = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const el = now - last;
    if (el < frameMs - 1) return;
    last = now;
    const dt = Math.min(el, 64) / 1000;
    step(dt); draw();
  };

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best: Node | null = null, bestD = 22 * 22;
    for (const n of nodes) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bestD) { bestD = d; best = n; } }
    if (best) onSelect(best.id);
  };
  canvas.addEventListener('click', onClick);

  const pause = () => { running = false; cancelAnimationFrame(raf); };
  const resume = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } };
  const io = new IntersectionObserver(([en]) => (en.isIntersecting ? resume() : pause()), { threshold: 0.05 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? pause() : resume());
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas);
  raf = requestAnimationFrame(loop);

  return {
    stop: () => { pause(); io.disconnect(); ro.disconnect(); canvas.removeEventListener('click', onClick); document.removeEventListener('visibilitychange', onVis); },
    highlight: (id) => { selected = id; },
  };
}
