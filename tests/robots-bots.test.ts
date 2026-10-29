import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// Reads public/robots.txt the way crawlers do: a crawler obeys the one group
// that names it, else the "*" group; within it the longest matching rule wins.
const robots = readFileSync('public/robots.txt', 'utf8');
const groups = robots.split(/\n\s*\n/).map((block) => {
  const lines = block.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  return {
    agents: lines.filter((l) => /^user-agent:/i.test(l)).map((l) => l.split(':')[1].trim().toLowerCase()),
    rules: lines.filter((l) => /^(allow|disallow):/i.test(l)).map((l) => ({ allow: /^allow/i.test(l), path: l.slice(l.indexOf(':') + 1).trim() })),
  };
}).filter((g) => g.agents.length);

function allowed(bot: string, path: string) {
  const g = groups.find((x) => x.agents.includes(bot.toLowerCase())) ?? groups.find((x) => x.agents.includes('*'));
  const hits = (g?.rules ?? []).filter((r) => r.path && path.startsWith(r.path)).sort((a, b) => b.path.length - a.path.length);
  return hits.length ? hits[0].allow : true;
}

describe('robots.txt', () => {
  const page = '/answers/what-is-an-authorised-cbam-declarant';
  test('search engines, AI assistants and social previews can read public pages', () => {
    for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Applebot', 'Google-Extended', 'CCBot', 'LinkedInBot', 'facebookexternalhit', 'DuckDuckBot', 'SomeNewBot']) {
      expect(allowed(bot, page)).toBe(true);
      expect(allowed(bot, '/')).toBe(true);
    }
  });
  test('private areas stay closed to everyone', () => {
    for (const bot of ['Googlebot', 'GPTBot', 'SomeNewBot']) expect(allowed(bot, '/dashboard')).toBe(false);
  });
  test('bulk copying and SEO-research crawlers are refused everywhere', () => {
    for (const bot of ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'Bytespider', 'Diffbot', 'DataForSeoBot']) {
      expect(allowed(bot, page)).toBe(false);
      expect(allowed(bot, '/')).toBe(false);
    }
  });
});
