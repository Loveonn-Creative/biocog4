// Section links (/pricing?plan=scale#plans) must land on the section in every case:
//   1. a normal click from /enterprise,
//   2. the one-time reload after a deploy (old tab asks for a chunk that is gone),
//   3. opening the link directly; and Back must keep the visitor's own position.
// Usage: node tests/e2e/section_link_after_reload.mjs [base]   (default https://senseible.earth)
// Needs the pre-installed Playwright; read-only, submits nothing.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const B = process.argv[2] || 'https://senseible.earth';
const onPlans = (p) => p.evaluate(() => Math.round(document.getElementById('plans')?.getBoundingClientRect().top ?? -1));
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`); };

async function page(width = 1366) {
  return (await browser.newContext({ viewport: { width, height: 860 } })).newPage();
}

for (const width of [1366, 390]) {
  const p = await page(width);
  let loads = 0; p.on('load', () => loads++);
  await p.goto(`${B}/enterprise`, { waitUntil: 'networkidle' });
  await p.getByRole('link', { name: /Explore plans/ }).first().click();
  await p.waitForURL(/pricing/); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
  const top = await onPlans(p);
  check(`click Explore plans (${width}px)`, loads === 1 && top >= 0 && top < 200, { loads, plansTop: top });
}

{
  const p = await page();
  let loads = 0; p.on('load', () => loads++);
  let gone = true;
  await p.route(/\/assets\/Pricing-[^/]*\.js$/, (r) => (gone ? ((gone = false), r.fulfill({ status: 404, body: '' })) : r.continue()));
  await p.goto(`${B}/enterprise`, { waitUntil: 'networkidle' });
  await p.getByRole('link', { name: /Explore plans/ }).first().click();
  await p.waitForTimeout(6000); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
  const top = await onPlans(p);
  check('after deploy reload', loads === 2 && top >= 0 && top < 200, { loads, plansTop: top });
}

{
  const p = await page(390);
  await p.goto(`${B}/pricing?plan=scale#plans`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const top = await onPlans(p);
  check('open link directly', top >= 0 && top < 200, { plansTop: top });
  await p.evaluate(() => scrollTo(0, 2500)); await p.waitForTimeout(300);
  await p.goto(`${B}/enterprise`, { waitUntil: 'networkidle' });
  await p.goBack({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const y = await p.evaluate(() => Math.round(scrollY));
  check('Back keeps position', Math.abs(y - 2500) < 50, { y });
}

await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
