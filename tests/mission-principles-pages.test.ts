import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// Redesigns change presentation only: the words on the page stay.
describe('/mission keeps its words', () => {
  const page = readFileSync('src/pages/Mission.tsx', 'utf8');
  test.each([
    'Most small businesses are invisible to climate finance', 'What We Observed', 'Our Constraint', 'The Consequence',
    '1 upload', '₹0', '14+', 'invoices, bills, receipts', 'revenue from carbon', "Founder's Note",
    'We measure in seconds, not months.', 'we should talk.',
  ])('%s', t => expect(page).toContain(t));
});
