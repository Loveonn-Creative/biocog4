import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { FormattedContent } from '../src/components/FormattedContent';

const html = (md: string) => renderToStaticMarkup(<MemoryRouter><FormattedContent content={md} /></MemoryRouter>);

test('markdown links in article text become real links', () => {
  const out = html('See [green finance](/green-finance) and [EUR-Lex](https://eur-lex.europa.eu).\n\n- Use the [CBAM calculator](/cbam-calculator)\n\n| A | B |\n|---|---|\n| [Cement](/cbam-cost/cement) | x |');
  expect(out).toContain('href="/green-finance"');
  expect(out).toContain('href="https://eur-lex.europa.eu"');
  expect(out).toContain('rel="noopener noreferrer"');
  expect(out).toContain('href="/cbam-calculator"');
  expect(out).toContain('href="/cbam-cost/cement"');
  expect(out).not.toContain('](');
});
