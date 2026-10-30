// What an Indian exporter of CBAM goods sends from /cbam-authorised-declarant:
// a short message asking the EU buyer (or, under DDP, the EU representative)
// for the declarant's account number and authorising country, and a one-page
// data checklist for the declarant and the verifier. Rules, rows, dates and
// mark-ups come from src/data/cbamDeclarant.ts.
import {
  DECLARANT_MILESTONES, FERT_PCT, MARKUP_SCHEDULE, PACK_ROWS, THRESHOLD_TONNES, type Clears,
} from '@/data/cbamDeclarant';
import { cleanName, fileDate, type SendableFile } from './sendableFile';

export interface KitInput { clears: Clears; company?: string; date?: Date }

/** PACK_ROWS are written to the exporter; in the exporter's own words they read as "we".
 * Only the buyer who clears the goods owes the certificates, so only it reads "you owe". */
export function inOurWords(row: string, toBuyer = false): string {
  return row
    .replace(/^Your /, 'Our ')
    .replace(/\byou bought\b/g, 'we bought')
    .replace(/the certificates your buyer owes/g, toBuyer ? 'the certificates you owe' : 'the certificates owed')
    .replace(/^Who verified the figures, and their opinion$/, 'Our verifier\'s name and verification report');
}

const STATUS_FROM = DECLARANT_MILESTONES[0];
const FIRST_DECLARATION = DECLARANT_MILESTONES[DECLARANT_MILESTONES.length - 1];
const longDate = (iso: string) => fileDate(new Date(`${iso}T12:00:00Z`));

/** The declarant details to ask for: account number and authorising country, plus certificates under DDP. */
function asks(clears: Clears): string[] {
  return clears === 'buyer'
    ? ['Your CBAM account number, or your customs representative\'s if they file for you', 'The EU country that authorised you as a CBAM declarant']
    : ['The CBAM account number of whoever will act as declarant for our shipments', 'The EU country that authorised them', 'In writing, who buys and surrenders the CBAM certificates'];
}

export function buyerMessage({ clears, company }: KitInput): string {
  const name = cleanName(company);
  const rule = `Since ${longDate(STATUS_FROM.iso)}, an EU importer bringing in more than ${THRESHOLD_TONNES} tonnes of CBAM goods a year needs an authorised CBAM declarant, or customs will not release the goods.`;
  return [
    clears === 'buyer' ? 'Subject: CBAM: your declarant details, and our plant data' : 'Subject: CBAM declarant for our DDP shipments',
    '',
    'Hello,',
    '',
    ...(clears === 'buyer'
      ? [`${rule} So that our plant's figures reach the right declarant, please send us:`]
      : [`We ship our goods to the EU on DDP terms. ${rule} For our shipments to clear, please confirm:`]),
    '',
    ...asks(clears).map((a, i) => `${i + 1}. ${a}`),
    '',
    'For each shipment we will provide:',
    ...PACK_ROWS.map((r) => `- ${inOurWords(r, clears === 'buyer')}`),
    '',
    `Without our verified figures, the declaration uses the EU default value for India, with a mark-up of ${MARKUP_SCHEDULE} (${FERT_PCT} for fertilisers).`,
    '',
    'Regards,',
    ...(name ? [name] : []),
  ].join('\n');
}

export function cbamChecklistFile({ clears, company, date }: KitInput): SendableFile {
  return {
    title: 'CBAM data checklist',
    to: clears === 'buyer' ? 'The CBAM declarant for our EU buyer, and our accredited verifier' : 'The CBAM declarant for our shipments, and our accredited verifier',
    from: cleanName(company),
    date: fileDate(date),
    subject: 'What we provide for each shipment of CBAM goods, and what we need from the declarant.',
    blocks: [
      {
        heading: 'From us, for each shipment',
        table: { head: ['Item', 'Sent on', 'Notes'], widths: [60, 16, 24], rows: PACK_ROWS.map((r) => [inOurWords(r), '', '']) },
      },
      {
        heading: 'From the declarant',
        lines: [
          'CBAM account number of the declarant',
          'EU country that authorised the declarant',
          ...(clears === 'seller' ? ['Who buys and surrenders the CBAM certificates'] : []),
        ].map((l) => `${l}: ______________________________`),
      },
      {
        heading: 'Default or actual values',
        lines: [
          'Actual values must be verified by an accredited CBAM verifier, and carry no mark-up.',
          `Default values need no verification, but carry a mark-up of ${MARKUP_SCHEDULE} (${FERT_PCT} for fertilisers).`,
          `Key date, ${longDate(FIRST_DECLARATION.iso)}: ${FIRST_DECLARATION.what.charAt(0).toLowerCase()}${FIRST_DECLARATION.what.slice(1)}`,
        ],
      },
    ],
    footer: ['Senseible is not a declarant or customs representative and does not file declarations. senseible.earth/cbam-authorised-declarant'],
  };
}

export const CHECKLIST_FILE_NAME = 'cbam-data-checklist.pdf';
