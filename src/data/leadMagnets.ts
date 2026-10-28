// Copy shared by the two lead magnet pages and their prerendered SEO content.
// Every answer is checked against the code: capability statuses come from
// src/data/enterpriseCapabilities.ts, factors from src/lib/factors.ts.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';

export const SUPPLIER_EVIDENCE_META = {
  path: '/scope-3-supplier-evidence',
  title: 'Scope 3 Supplier Evidence Check',
  description: 'See how much of your Scope 3 Category 1 supplier base is backed by evidence, the pace to close the gap before you report, and a supplier request to send today.',
  h1: 'Can you defend your Scope 3 number, one supplier at a time?',
};

export const MSME_CARBON_META = {
  path: '/msme-carbon-number',
  title: 'Your Carbon Number for Buyers and Banks',
  description: 'A buyer or bank asked for your carbon footprint? Type the units from your electricity bill, see your number now and get a reply to send. Free, no sign-up.',
  h1: 'Your buyer asked for your carbon number. Reply this week.',
};

export const SUPPLIER_EVIDENCE_FAQS = [
  { q: 'Our suppliers are small. Will they actually do this?', a: 'They are asked for bills they already keep, not a questionnaire. A PDF or a phone photo of an electricity bill or fuel invoice is enough; Senseible reads it.' },
  { q: 'Which GHG Protocol method does this support?', a: 'A supplier’s bills give the activity data for the hybrid method in the GHG Protocol Scope 3 Technical Guidance for Category 1. Suppliers without bills stay on average-data or spend-based estimates, labelled as such, so the share of each method is always visible.' },
  { q: 'How do supplier documents get into Senseible?', a: 'Today, documents are uploaded in Senseible, up to 10 files per batch, and read automatically. Supplier invitations and a supplier portal, intake by email or WhatsApp, and ERP feeds are set up for each enterprise on request.' },
  { q: 'Is this an assurance opinion or a compliance certificate?', a: 'No. Senseible produces the evidence trail a reviewer looks for: the method, the emission factor and its source, and the original document for each line. Assurance is given by an independent assurance provider.' },
  { q: 'How are documents protected?', a: 'Each document is fingerprinted with SHA-256 so the same bill cannot be counted twice, and records sit in your organisation’s account. The Trust page sets out how data is handled.' },
  { q: 'What does it cost?', a: 'The plan on this page is free. Enterprise work is priced to your supplier count and integrations after a short scoping conversation; published plans are on the pricing page.' },
];

export const MSME_CARBON_FAQS = [
  { q: 'Is it really free?', a: 'Yes, to start. This estimate needs no sign-up. The Snapshot plan is free and reads up to 10 bills a month for a bill-by-bill record.' },
  { q: 'Is the estimate enough for my buyer?', a: 'It is enough to reply quickly. Buyers and banks that check will want the bill-by-bill record, which shows the emission factor and its source for every line.' },
  { q: 'Do I need a consultant?', a: 'No. You upload the electricity bills and fuel invoices you already have, and the record is built from them.' },
  { q: 'Which numbers does the estimate use?', a: `Grid electricity at ${INDIA_GRID_FACTOR_KG_PER_KWH.toFixed(3)} kg CO₂ per kWh, the India grid average Senseible uses, and diesel at ${FUEL_FACTORS.DIESEL.value} kg CO₂ per litre. The full product uses the same factors.` },
  { q: 'What if my bill is handwritten or hard to read?', a: 'An unclear number is flagged for you to check instead of being guessed.' },
  { q: 'Who sees my bills?', a: 'Your records sit in your own account. You decide what to send to a buyer or a bank.' },
];
