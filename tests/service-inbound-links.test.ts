import { expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { serviceNav } from '../src/data/services/nav';
import { cmsArticles } from '../src/data/cmsContent';

// The footer no longer lists service pages, so each one must stay reachable
// through visible links in page content: the calculators hub and at least one
// article that discusses the topic.
test('every service page has a contextual inbound link outside the footer', () => {
  const hub = readFileSync('src/pages/calculators/CalculatorsHub.tsx', 'utf8');
  expect(hub).toContain('serviceNav.map');
  const md = cmsArticles.map(a => a.content).join('\n');
  for (const s of serviceNav) expect(md.includes(`](/${s.slug})`)).toBe(true);
});

test('the footer does not render a services column', () => {
  const footer = readFileSync('src/components/Footer.tsx', 'utf8');
  expect(footer).not.toContain('serviceNav');
});
