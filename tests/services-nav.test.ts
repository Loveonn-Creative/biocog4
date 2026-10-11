import { expect, test } from 'bun:test';
import { serviceNav } from '../src/data/services/nav';
import { servicePages } from '../src/data/services';

test('route, footer and SEO list matches the service configs', () => {
  expect(serviceNav).toEqual(servicePages.map(s => ({ slug: s.slug, nav: s.nav, title: s.seo.title, description: s.seo.description })));
});
