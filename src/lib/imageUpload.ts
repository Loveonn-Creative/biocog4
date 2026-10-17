// Large phone photos are resized in the browser before upload, so a 6-12 MB
// photo does not take most of the read time just to upload on a mobile
// network. Only JPEG, PNG and WebP over 3 MB are touched; the long edge is
// kept at 2,400 px and quality at 0.9, which keeps printed and handwritten
// digits legible. PDFs, HEIC and anything the browser cannot decode are sent
// as they are. The original stays on the device (guest copies use it).

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

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type) || file.size <= RESIZE_ABOVE_BYTES || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
