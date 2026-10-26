// Large phone photos are resized in the browser before upload, so a 6-12 MB
// photo does not take most of the read time just to upload on a mobile
// network. Only JPEG, PNG and WebP over 3 MB are touched; the long edge is
// kept at 2,400 px and quality at 0.9, which keeps printed and handwritten
// digits legible. PDFs, HEIC and anything the browser cannot decode are sent
// as they are. The original stays on the device (guest copies use it).
// With a byte limit (guests), any photo over it is shrunk step by step until
// it fits.

export const RESIZE_ABOVE_BYTES = 3 * 1024 * 1024;
export const MAX_EDGE_PX = 2400;
const RESIZABLE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/** Target size for an image: unchanged when already within the limit. */
export function fitWithin(width: number, height: number, max = MAX_EDGE_PX): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const k = max / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** Long edge and quality tried in turn when a photo must fit a byte limit. */
const FIT_STEPS: Array<[number, number]> = [[MAX_EDGE_PX, 0.9], [MAX_EDGE_PX, 0.8], [2000, 0.8], [1700, 0.75]];

export async function prepareImageForUpload(file: File, maxBytes?: number): Promise<File> {
  const over = maxBytes ? file.size > maxBytes : file.size > RESIZE_ABOVE_BYTES;
  if (!RESIZABLE.has(file.type) || !over || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    let best: Blob | null = null;
    for (const [edge, quality] of maxBytes ? FIT_STEPS : FIT_STEPS.slice(0, 1)) {
      const size = fitWithin(bitmap.width, bitmap.height, edge);
      const canvas = document.createElement('canvas');
      canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(bitmap, 0, 0, size.width, size.height);
      best = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
      if (!best || !maxBytes || best.size <= maxBytes) break;
    }
    bitmap.close?.();
    if (!best || best.size >= file.size) return file;
    return new File([best], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
