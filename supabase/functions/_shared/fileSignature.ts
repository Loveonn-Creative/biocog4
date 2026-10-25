// What a file really is, from its first bytes, not from the type the browser
// claims. The reader accepts only PDFs and photos; anything else (scripts,
// archives, office files renamed to .pdf) is refused before any AI call or
// storage write. A real PDF or photo sent with the wrong label still passes,
// as phones often mislabel HEIC and JPEG, so live uploads keep working.

export type FileKind = 'pdf' | 'jpeg' | 'png' | 'webp' | 'heic';

const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'];

/** The first bytes of a base64 payload (a data: URL prefix is ignored). */
function head(b64: string, bytes = 1024): Uint8Array {
  const body = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  const chars = Math.ceil(bytes / 3) * 4;
  try {
    const bin = atob(body.slice(0, chars));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));

export function detectFileKind(b64: string): FileKind | null {
  const b = head(b64);
  if (b.length < 4) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (ascii(b, 4, 4) === 'ftyp' && HEIF_BRANDS.includes(ascii(b, 8, 4))) return 'heic';
  // The PDF header may follow a few junk bytes; readers accept it within the first 1 KB.
  if (ascii(b, 0, b.length).includes('%PDF-')) return 'pdf';
  return null;
}
