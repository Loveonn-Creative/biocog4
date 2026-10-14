// Usage: node render.mjs stills landscape 1,5,8,10.6,11.8,14.8,19
//        node render.mjs video landscape out.mp4
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const [mode, orient = 'landscape', arg] = process.argv.slice(2);
const size = orient === 'portrait' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const FPS = 30, DUR = Number(process.env.DUR || 20);
const url = 'file://' + path.resolve(process.env.FILE || 'launch.html') + '?o=' + orient;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

if (mode === 'stills') {
  for (const t of arg.split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: `${process.env.PFX || 'still'}-${orient}-${t}.png` });
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', arg],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  const F0 = Number(process.env.F0 || 0), F1 = Number(process.env.F1 || FPS * DUR);
  for (let f = F0; f < F1; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
