// Live sky over Gurugram for the footer: sun altitude and hour angle from the
// NOAA approximation, moon phase from a known new moon, and a palette chosen
// by sun altitude. Pure functions, computed in the browser; no network.

const LAT = 28.46;
const LON = 77.03;
const RAD = Math.PI / 180;
const IST_OFFSET_MIN = 330;

export type RGB = [number, number, number];
export interface SkyPalette { top: RGB; mid: RGB; low: RGB; fg: RGB; muted: RGB; land: RGB; far: RGB }

/** Minutes past midnight in India for a given instant. */
export function istMinutes(d: Date): number {
  const m = (d.getUTCHours() * 60 + d.getUTCMinutes() + IST_OFFSET_MIN) % 1440;
  return m;
}

function istDayOfYear(d: Date): number {
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60000);
  const start = Date.UTC(ist.getUTCFullYear(), 0, 0);
  return Math.floor((ist.getTime() - start) / 864e5);
}

/** Sun altitude and hour angle (degrees) at an IST minute of the day. */
export function sunAt(d: Date, minutes: number): { alt: number; ha: number } {
  const n = istDayOfYear(d);
  const g = (2 * Math.PI / 365) * (n - 1 + (minutes / 60 - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g)
    - 0.040849 * Math.sin(2 * g));
  const solarMin = minutes + eqt + 4 * LON - IST_OFFSET_MIN;
  const ha = solarMin / 4 - 180;
  const alt = Math.asin(Math.sin(LAT * RAD) * Math.sin(decl) + Math.cos(LAT * RAD) * Math.cos(decl) * Math.cos(ha * RAD)) / RAD;
  return { alt, ha };
}

/** Moon phase 0..1 (0 new, 0.5 full). */
export function moonPhase(d: Date): number {
  const syn = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  return ((((d.getTime() - ref) / 864e5) % syn) + syn) % syn / syn;
}

const P: Record<'night' | 'twi' | 'golden' | 'day', SkyPalette> = {
  night: { top: [11, 20, 38], mid: [22, 36, 62], low: [38, 52, 80], fg: [242, 242, 242], muted: [176, 186, 204], land: [8, 14, 26], far: [26, 38, 60] },
  twi: { top: [44, 52, 98], mid: [150, 110, 140], low: [240, 160, 120], fg: [248, 246, 244], muted: [222, 214, 222], land: [30, 30, 46], far: [92, 82, 112] },
  golden: { top: [146, 186, 226], mid: [246, 214, 180], low: [252, 196, 140], fg: [20, 20, 20], muted: [70, 70, 76], land: [70, 64, 70], far: [176, 160, 160] },
  day: { top: [214, 236, 252], mid: [236, 246, 253], low: [250, 252, 254], fg: [20, 20, 20], muted: [96, 104, 112], land: [176, 190, 200], far: [214, 226, 236] },
};

export const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
export const rgb = (c: RGB) => `rgb(${c.join(',')})`;

/** Palette for a sun altitude: night, twilight, golden hour, day. */
export function paletteFor(alt: number): SkyPalette {
  const lerp = (A: SkyPalette, B: SkyPalette, t: number): SkyPalette => {
    const k = Math.max(0, Math.min(1, t));
    return Object.fromEntries(Object.keys(A).map((key) => [key, mix(A[key as keyof SkyPalette], B[key as keyof SkyPalette], k)])) as unknown as SkyPalette;
  };
  if (alt <= -12) return P.night;
  if (alt <= -4) return lerp(P.night, P.twi, (alt + 12) / 8);
  if (alt <= 6) return lerp(P.twi, P.golden, (alt + 4) / 10);
  return lerp(P.golden, P.day, (alt - 6) / 14);
}
