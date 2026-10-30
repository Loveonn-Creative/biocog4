// The reply sheet from /brsr-reporting: what an MSME supplier sends back when
// a listed customer asks for BRSR value chain figures. Asks, units and the
// paper behind each come from src/data/brsrHub.ts (REPLY_ROWS); the value
// column is left blank for the supplier to fill.
import { REPLY_ROWS } from '@/data/brsrHub';
import { cleanName, fileDate, toCsv, type SendableFile } from './sendableFile';

export interface ReplyInput { company?: string; customer?: string; date?: Date }

const HEAD = ['What you asked for', 'Value', 'Unit', 'Paper that proves it'];
const PERIOD = 'April ______ to March ______';
const BLANK = '____________________';
const rows = () => REPLY_ROWS.map((r) => [r.ask, '', r.unit, r.proof.replace(/\.$/, '')]);
const to = (customer?: string) => ['The sustainability team', cleanName(customer)].filter(Boolean).join(', ');

export function brsrReplyFile({ company, customer, date }: ReplyInput = {}): SendableFile {
  return {
    title: 'BRSR value chain figures',
    to: to(customer),
    from: cleanName(company),
    date: fileDate(date),
    subject: `Our figures for your BRSR value chain disclosure, for ${PERIOD}.`,
    blocks: [
      { heading: 'Our figures', table: { head: HEAD, widths: [28, 18, 10, 44], rows: rows() } },
      {
        heading: 'Method, papers and contact',
        lines: [
          `Emission factors used, with source and year: ${BLANK}`,
          '[ ] Copies of the papers named above are attached',
          '[ ] Waste split by category attached',
          `Contact for questions: ${BLANK}`,
          `Phone and email: ${BLANK}`,
        ],
      },
    ],
    footer: ['Reply sheet from senseible.earth/brsr-reporting'],
  };
}

/** The same sheet as CSV, for a buyer who collects replies in a spreadsheet. */
export function brsrReplyCsv({ company, customer, date }: ReplyInput = {}): string {
  return toCsv([
    ['To', to(customer)],
    ['From', cleanName(company) ?? ''],
    ['Date', fileDate(date)],
    ['Period', PERIOD],
    [],
    HEAD,
    ...rows(),
    [],
    ['Emission factors used, with source and year', ''],
    ['Copies of the papers attached (yes or no)', ''],
    ['Waste split by category attached (yes or no)', ''],
    ['Contact name', ''],
    ['Contact phone', ''],
    ['Contact email', ''],
  ]);
}

export const REPLY_FILE_NAME = 'brsr-value-chain-figures';
