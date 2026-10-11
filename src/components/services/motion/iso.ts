// Isometric projection for canvas "3D" scenes: x to the right-down, y to the
// left-down, z up. Cheap, crisp on low-end phones, and readable as depth.

export const ISO = { cos: Math.cos(Math.PI / 6), sin: Math.sin(Math.PI / 6) };

export function project(x: number, y: number, z: number, ox: number, oy: number, s = 1): [number, number] {
  return [ox + (x - y) * ISO.cos * s, oy + (x + y) * ISO.sin * s - z * s];
}

/** A box with top, left and right faces shaded from one base colour. */
export function isoBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, z: number, w: number, d: number, h: number,
  ox: number, oy: number, s: number,
  faces: { top: string; left: string; right: string; stroke?: string },
) {
  const P = (a: number, b: number, c: number) => project(a, b, c, ox, oy, s);
  const poly = (pts: [number, number][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (faces.stroke) { ctx.strokeStyle = faces.stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };
  poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], faces.left);
  poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], faces.right);
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], faces.top);
}
