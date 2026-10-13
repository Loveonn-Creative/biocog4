import { expect, test } from 'bun:test';
import { serviceNav } from '../src/data/services/nav';
import { serviceFooterGroups } from '../src/data/services/footerGroups';

test('every service page keeps exactly one footer link', () => {
  const grouped = serviceFooterGroups.flatMap(g => g.slugs);
  expect([...grouped].sort()).toEqual(serviceNav.map(s => s.slug).sort());
  expect(new Set(grouped).size).toBe(grouped.length);
});
