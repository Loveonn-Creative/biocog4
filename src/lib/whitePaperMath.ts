// Arithmetic behind the White Paper's interactive examples. Pure, so tested.

/** A printed number and how many decimals it was printed with. Commas and spaces are digit grouping. */
export function printedNumber(raw: string): { value: number; decimals: number } | null {
  const s = raw.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const dot = s.indexOf('.');
  return { value: Number(s), decimals: dot === -1 ? 0 : s.length - dot - 1 };
}

/**
 * |q × r − a| ≤ τ, τ = ½·10^−dq·r + ½·10^−dr·q + ½·10^−da: the largest gap
 * rounding of the printed quantity, rate and amount could cause on its own.
 */
export function roundingCheck(qRaw: string, rRaw: string, aRaw: string) {
  const q = printedNumber(qRaw), r = printedNumber(rRaw), a = printedNumber(aRaw);
  if (!q || !r || !a || q.value <= 0 || r.value <= 0 || a.value <= 0) return null;
  const product = q.value * r.value;
  const gap = Math.abs(product - a.value);
  const tau = 0.5 * 10 ** -q.decimals * r.value + 0.5 * 10 ** -r.decimals * q.value + 0.5 * 10 ** -a.decimals;
  // A tiny allowance for binary floating point, far below any printed digit.
  return { product, gap, tau, pass: gap <= tau + 1e-9, dq: q.decimals, dr: r.decimals, da: a.decimals };
}

/** Relative uncertainty of a total of n equal lines sharing one factor: √(u_F² + u_A²/n). */
export const sharedFactorUncertainty = (uF: number, uA: number, n: number) => Math.sqrt(uF * uF + (uA * uA) / n);
