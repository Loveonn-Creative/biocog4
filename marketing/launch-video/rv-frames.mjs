// Resumable frame renderer: node rv-frames.mjs <file> <orient> <outdir> <f0> <f1>; skips frames already written.
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [file, orient, dir, F0, F1] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
const size = orient === 'portrait' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: size, deviceScaleFactor: 1 });
await pg.goto('file://' + path.resolve(file) + '?o=' + orient);
await pg.evaluate(() => document.fonts.ready);
let first = true;
for (let f = +F0; f < +F1; f++) {
  const out = path.join(dir, String(f).padStart(5, '0') + '.jpg');
  if (fs.existsSync(out) && fs.statSync(out).size > 0) continue;
  if (first) { for (let g = Math.max(+F0, f - 90); g < f; g += 3) await pg.evaluate(t => window.render(t), g / 30); first = false; } // warm stateful ink
  await pg.evaluate(t => window.render(t), f / 30);
  await pg.screenshot({ path: out + '.tmp.jpg', type: 'jpeg', quality: 94 });
  fs.renameSync(out + '.tmp.jpg', out);
}
await b.close(); console.log('done', file, F0, F1);
