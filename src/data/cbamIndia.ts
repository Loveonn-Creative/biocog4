// /cbam: the CBAM page for Indian exporters of steel, aluminium, cement and
// fertilisers. Every rule below is sourced (code comments only, no citation
// lines on the page). Costs on the page are computed live by src/lib/cbamEngine.ts
// from src/lib/cbam/official.ts (Commission default values and benchmarks).
//
// Sources:
// - Definitive period from 1 January 2026; importers above 50 tonnes a year
//   need authorised declarant status: taxation-customs.ec.europa.eu,
//   carbon-border-adjustment-mechanism/cbam-definitive-regime_en (checked 24 Oct 2026).
// - First annual declaration for 2026 imports due 30 September 2027; certificates
//   on sale from February 2027 on the central platform; 2026 imports priced at the
//   quarterly price: price-cbam-certificates_en page, Answers
//   when-can-eu-importers-buy-cbam-certificates.
// - Default value mark-up 10% (2026), 20% (2027), 30% (2028 on), fertilisers 1%:
//   Guidance No. 3 s.4.10; official.ts DEFAULT_MARKUP, FERTILISER_MARKUP.
// - CBAM factor 97.5% (2026) to 0 (2034): Guidance No. 4 Table 2-1; official.ts CBAM_FACTOR.
// - One authorised declarant per tonne; the importer files and pays: Guidance No. 1.
// - Actual emissions must be verified by an accredited CBAM verifier, 5% materiality
//   per good; the verifier checks the monitoring plan, boundaries, processes, data
//   flows, control activities, measuring equipment, sampling and uncertainty:
//   CBAM verification and accreditation guidance (24 Aug 2026), cbam-verification_en.
// - Indirect emissions count only for cement and fertilisers: Guidance No. 3 s.4.1.3;
//   official.ts INDIRECT_COUNTED.
// - Operator emissions report on the Commission template where actual data are
//   used: Guidance No. 2.
// Capabilities (owner-confirmed, 24 Oct 2026): bill and invoice reading with anomaly
// checks, trust layer against greenwashing, custom-installed metering (sub-meters,
// flow, heat and steam meters, IoT loggers and gateways), SCADA and ERP links,
// monitoring plan, verifier-ready output, in-house checks, then sign-off by an
// accredited partner verifier or the client's own (owner, 30 October 2026).

export const CBAM_INDIA_PATH = '/cbam';

export interface CbamProduct { id: string; label: string; sectorId: string; routeId: string; own: number; ownMin: number }

/** Products an Indian exporter picks in the hero. `own` is an example plant figure the reader moves (t CO2e per tonne). */
export const CBAM_PRODUCTS: CbamProduct[] = [
  { id: 'hr-steel', label: 'Hot-rolled steel', sectorId: 'steel', routeId: 'bf-bof', own: 2.3, ownMin: 0.3 },
  { id: 'scrap-steel', label: 'Steel from scrap (EAF)', sectorId: 'steel', routeId: 'eaf-scrap', own: 0.6, ownMin: 0.2 },
  { id: 'al-profiles', label: 'Aluminium profiles', sectorId: 'aluminium', routeId: 'bars-profiles', own: 2.0, ownMin: 0.3 },
  { id: 'al-wire', label: 'Aluminium wire', sectorId: 'aluminium', routeId: 'wire', own: 1.6, ownMin: 0.3 },
];

export const CBAM_MILESTONES = [
  { when: '1 Jan 2026', what: 'Definitive period starts. Importers bringing in more than 50 tonnes a year need authorised declarant status.' },
  { when: 'Feb 2027', what: 'Certificates go on sale. Goods imported in 2026 are priced at the 2026 quarterly price.' },
  { when: '30 Sep 2027', what: 'First annual declaration, for everything imported in 2026.' },
  { when: '2028', what: 'Default values carry a 30% mark-up from here on.' },
  { when: '2034', what: 'Free allocation reaches zero. Every tonne is paid for.' },
];

export interface DataSource { id: string; name: string; reads: string }
export const DATA_SOURCES: DataSource[] = [
  { id: 'bills', name: 'Bills and invoices', reads: 'Fuel, power and purchased precursors, read line by line and checked for anomalies.' },
  { id: 'submeters', name: 'Smart sub-meters', reads: 'Electricity per furnace, mill or line, not just the plant total.' },
  { id: 'flow', name: 'Flow sensors', reads: 'Gas, oil and LPG burnt by each process.' },
  { id: 'heat', name: 'Heat and steam meters', reads: 'Steam and heat moving between processes.' },
  { id: 'loggers', name: 'IoT loggers and gateways', reads: 'Readings from older equipment that has no network of its own.' },
  { id: 'scada', name: 'SCADA', reads: 'Production counts and process data straight from the control system.' },
  { id: 'erp', name: 'ERP', reads: 'Tonnes produced and dispatched per product code.' },
];

export const VERIFIER_CHECKS = [
  'A written monitoring plan',
  'Installation boundaries',
  'Production processes, one per product group',
  'Data flows and control activities',
  'Measuring equipment and calibration',
  'Sampling plan',
  'Uncertainty assessment',
  'Embedded emissions per tonne, per CN code',
];

export const CBAM_INDIA_FAQS = [
  { question: 'Does CBAM apply to an Indian exporter?', answer: 'The EU importer files the declaration and buys the certificates. But the number they pay on is your plant\'s embedded emissions per tonne. If you cannot give a verified figure, they pay on the EU default value for India plus a mark-up, and that cost comes back to you in price talks.' },
  { question: 'Which Indian goods are covered?', answer: 'Iron and steel, aluminium, cement, fertilisers, hydrogen and electricity, by CN code. That includes many downstream steel goods such as wire, pipes, fasteners and structures, and aluminium bars, profiles and wire.' },
  { question: 'What happens if we send no data?', answer: 'Your buyer uses the Commission\'s default value for India, raised by 10% in 2026, 20% in 2027 and 30% from 2028. For hot-rolled steel that default is 4.28 t CO2e per tonne, well above most plants\' actual figure.' },
  { question: 'When is the first deadline?', answer: 'The first annual declaration, covering 2026 imports, is due by 30 September 2027. Certificates go on sale in February 2027. Your buyer will ask for your data well before that.' },
  { question: 'Will the EU accept data from Senseible?', answer: 'Yes, once an accredited verifier signs it off. We build the plan, the data trail and the report, check it in-house, then an accredited verifier we partner with signs. Or use your own.' },
  { question: 'Do indirect emissions count?', answer: 'For cement and fertilisers, yes. For iron, steel and aluminium only direct emissions are charged, though you still record electricity.' },
];
