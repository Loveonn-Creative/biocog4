// /cbam-authorised-declarant: who must be the authorised CBAM declarant, by
// when, the 50-tonne line, and what the Indian supplier sends. Every rule is
// sourced here (code comments only, no citation lines on the page). Default
// values and mark-ups on the page come from src/lib/cbam/official.ts.
//
// Sources (all already in the repository):
// - Status only for persons established in an EU member state, granted by that
//   state's competent authority through the CBAM Registry; Indian exporters
//   cannot hold it: Answers what-is-an-authorised-cbam-declarant,
//   can-non-eu-exporter-be-cbam-declarant-ddp (Regulation (EU) 2023/956,
//   Articles 5 and 17; Regulation (EU) 2025/2083).
// - Customs will not release CBAM goods above the yearly threshold without it:
//   what-is-an-authorised-cbam-declarant; check-eu-buyer-is-authorised-cbam-declarant.
// - DDP: seller usually importer; an indirect customs representative takes the
//   role only by agreement and many charge for the risk; or an EU entity of your
//   own: can-non-eu-exporter-be-cbam-declarant-ddp (Union Customs Code Art. 18).
// - 50 tonnes: per importer, per calendar year, by net mass, across iron and
//   steel, aluminium, cement and fertiliser goods together; hydrogen and
//   electricity have no threshold: cbam-50-tonne-threshold-how-counted.
// - No public register; ask for the CBAM account number and member state:
//   check-eu-buyer-is-authorised-cbam-declarant.
// - Dates: definitive period from 1 January 2026; applications by 31 March 2026
//   could keep importing while assessed, anyone applying now needs the status
//   before importing; certificates on sale from February 2027; first annual
//   declaration for 2026 imports by 30 September 2027: Climate Intelligence
//   become-cbam-authorised-declarant, src/data/cbamIndia.ts CBAM_MILESTONES,
//   Answers cbam-timeline-what-indian-exporters-send-when.
// - Actual values must be verified by an accredited verifier; default values
//   need no verification but carry the mark-up: cbam-actual-emissions-need-
//   verification-importer; mark-up 10% / 20% / 30%: official.ts DEFAULT_MARKUP.
// - What the supplier sends (installation identity, route, period, specific
//   embedded emissions direct and indirect, embedded free allocation, precursor
//   details and their verification reports): what-cbam-data-besides-emissions-
//   supplier-sends, eu-importer-asks-installation-details-cbam.
// - Optional operator registration in the CBAM Registry: does-indian-exporter-
//   need-cbam-registration.
// - Senseible's part: CBAM suite steps (Plant, Goods, Precursors, Results,
//   Verify) in src/pages/CbamSuite.tsx and src/components/cbam-suite/panels.tsx;
//   supplier pack per CN code, actual or default with source, in
//   src/lib/cbam/suite/supplierPack.ts. Senseible is not a declarant or customs
//   representative and does not file declarations (Answers "senseible" lines).

import { DEFAULT_MARKUP, FERTILISER_MARKUP } from '@/lib/cbam/official';

const pct = (y: number) => `${Math.round(DEFAULT_MARKUP[y] * 100)}%`;
/** The default-value mark-up schedule (all sectors but fertilisers), in words, from official.ts. */
export const MARKUP_SCHEDULE = `${pct(2026)} in 2026, ${pct(2027)} in 2027 and ${pct(2028)} from 2028`;
export const FERT_PCT = `${Math.round(FERTILISER_MARKUP * 100)}%`;

export const CBAM_DECLARANT_PATH = '/cbam-authorised-declarant';

export type Clears = 'buyer' | 'seller';
export type Volume = 'under' | 'over';

export interface FinderAnswer { who: string; body: string; ask: string }

/** Who has to hold authorised declarant status for one shipment. */
export function findDeclarant(clears: Clears, volume: Volume, hydrogenOrPower: boolean): FinderAnswer {
  if (volume === 'under' && hydrogenOrPower) {
    return clears === 'buyer'
      ? { who: 'Your buyer, for the hydrogen or electricity.', body: 'Hydrogen and electricity have no threshold. Your steel, aluminium, cement or fertiliser goods stay exempt while the buyer\'s yearly total is 50 tonnes or less.', ask: 'Ask your buyer to confirm their yearly total in writing. Volumes move.' }
      : { who: 'Someone in the EU, for the hydrogen or electricity.', body: 'Hydrogen and electricity have no threshold, and only a company established in an EU country can hold the status. Your other goods stay exempt at 50 tonnes or less a year.', ask: 'Find an EU customs representative who agrees to take the role, or import through an EU company of your own.' };
  }
  if (volume === 'under') {
    return clears === 'buyer'
      ? { who: 'Nobody, for now.', body: 'An importer bringing in 50 tonnes or less a year of these goods is exempt and needs no declarant status.', ask: 'Ask your buyer to confirm their yearly total in writing. Volumes move.' }
      : { who: 'Nobody, for now.', body: 'Under DDP you are usually the importer, and at 50 tonnes or less a year these goods are exempt.', ask: 'Cross 50 tonnes and you will need someone in the EU to hold the status for you.' };
  }
  return clears === 'buyer'
    ? { who: 'Your buyer, or its customs representative.', body: 'They need the status before your goods arrive, or EU customs will not release them.', ask: 'Ask for their CBAM account number and the EU country that authorised them. There is no public register to check.' }
    : { who: 'Someone in the EU. Not your Indian company.', body: 'Only a company established in an EU country can hold the status. Under DDP that means an indirect customs representative who agrees to take the role, or an EU company of your own.', ask: 'Agree in writing who buys and surrenders the certificates. Many representatives charge for the risk.' };
}

export const THRESHOLD_TONNES = 50;

export interface Milestone { iso: string; when: string; what: string }
export const DECLARANT_MILESTONES: Milestone[] = [
  { iso: '2026-01-01', when: '1 Jan 2026', what: 'Declarant status needed above 50 tonnes a year, or for any hydrogen or electricity.' },
  { iso: '2026-03-31', when: '31 Mar 2026', what: 'Importers who applied by this date could keep importing while they waited. Anyone applying now needs the status first.' },
  { iso: '2027-02-01', when: 'Feb 2027', what: 'Your buyer can start buying CBAM certificates, which pay the carbon charge on goods imported in 2026.' },
  { iso: '2027-09-30', when: '30 Sep 2027', what: 'First annual declaration, for everything imported in 2026.' },
];
export const FIRST_DECLARATION_ISO = '2027-09-30';

/** The main lines the declarant needs from the Indian supplier; each one is built in the CBAM suite (Plant, Goods, Precursors, Results, Verify). */
export const PACK_ROWS: string[] = [
  'Plant name, address, coordinates and reporting period',
  'Your goods by CN code, with how each is made',
  'Materials you bought in, such as billets or ingots, with each supplier\'s figure and report',
  'Emissions per tonne of each good, direct and indirect',
  'Free allocation per tonne (the free share an EU plant would get), which cuts the certificates your buyer owes',
  'Who verified the figures, and their opinion',
];

export const CBAM_DECLARANT_FAQS = [
  { question: 'Can an Indian company be an authorised CBAM declarant?', answer: 'No. The status is granted only to a company established in an EU country, by that country\'s authority. You can register your plant in the CBAM Registry as an operator so declarants can see your verified figures, but that does not make you a declarant.' },
  { question: 'Does my Indian company need to register for CBAM?', answer: 'No. Declarant registration is for EU importers. Registering your plant as an operator is optional. It helps when you sell to several EU buyers and are tired of sending each one the same figures.' },
  { question: 'How do I check my EU buyer has the status?', answer: 'There is no public register. Ask for their CBAM account number and the EU country that authorised them, and write the duty to hold the status into your contract.' },
  { question: 'We sell DDP. Who files?', answer: 'Not your Indian company. An EU indirect customs representative has to agree to take the declarant role for your shipments, or you import through an EU company of your own. Or move to a term where your buyer clears import. Have an EU customs adviser confirm the setup before you ship.' },
  { question: 'Do our actual emissions need to be verified?', answer: `Yes. Actual values in a declaration must be verified by an accredited CBAM verifier. Default values need no verification, but carry a mark-up of ${MARKUP_SCHEDULE}. Fertilisers carry ${FERT_PCT} instead.` },
  { question: 'Does Senseible file the CBAM declaration?', answer: 'No. Senseible is not a declarant or customs representative. It builds your plant\'s emissions figures, the file a verifier checks and the pack you send your buyer\'s declarant.' },
];
