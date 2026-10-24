// German copy for the /de CBAM pages. Facts come from the CBAM engine
// (src/lib/cbamEngine.ts) and from Commission documents already used in the
// Answers library:
// - Certificate prices 2026 (Q1 €75.36, Q2 €75.28, Q3 €82.32), weekly from
//   2027: taxation-customs.ec.europa.eu, "Price of CBAM certificates".
// - Sales from February 2027, first declaration by 30 September 2027:
//   taxation-customs.ec.europa.eu, CBAM definitive regime and verification pages.
// - Default value mark-ups 10/20/30%, fertilisers 1%: Implementing Regulation
//   (EU) 2025/2621 as corrected by 2026/1740 (Commission DV correcting act).
// - 50 t threshold (not electricity or hydrogen): Regulation (EU) 2025/2083.
// - DEHSt as Germany's competent authority: Commission list of national
//   competent authorities, 26 June 2026.
// - One declarant per tonne; supplier data pack: Guidance No. 1 and No. 2.
// Every line here waits for a native review (DE_PAGES_REVIEWED).
import { CERTIFICATE_PRICES } from '@/lib/cbam/official';

export interface DeMeta { title: string; description: string; h1: string }

export const DE_META: Record<string, DeMeta> = {
  '/de/cbam-kosten': {
    title: 'CBAM-Kosten für Importe aus Indien, 2026 bis 2034',
    description: 'Was CBAM-Zertifikate für Stahl, Aluminium, Zement und Dünger aus Indien kosten: Rechnung je Tonne, Preise 2026, Fristen und der Hebel echter Lieferantendaten.',
    h1: 'Was kostet Ihre Lieferung aus Indien an der EU-Grenze?',
  },
  '/de/cbam-rechner': {
    title: 'CBAM-Rechner: Zertifikatskosten 2026 bis 2034',
    description: 'Kostenloser CBAM-Rechner für Importeure: Warengruppe, Menge und Emissionswert eingeben und die Zertifikatskosten Jahr für Jahr bis 2034 sehen.',
    h1: 'CBAM-Rechner',
  },
  '/de/cbam-indische-lieferanten': {
    title: 'CBAM-Daten von indischen Lieferanten anfordern',
    description: 'Welche Daten Ihr indischer Lieferant für Ihre CBAM-Erklärung liefern muss, mit Checkliste und einer fertigen Anfrage auf Englisch zum Kopieren.',
    h1: 'Welche Daten Sie von Ihrem indischen Lieferanten brauchen',
  },
};

export const SECTOR_DE: Record<string, string> = {
  steel: 'Eisen und Stahl',
  aluminium: 'Aluminium',
  cement: 'Zement',
  fertilizers: 'Düngemittel',
  electricity: 'Strom',
  hydrogen: 'Wasserstoff',
};

export const ROUTE_DE: Record<string, string> = {
  'bf-bof': 'Hochofen (BF-BOF)',
  'eaf-scrap': 'Elektrolichtbogen, Schrott',
  'eaf-dri': 'Elektrolichtbogen mit DRI',
  'dri-gas': 'DRI (Erdgas)',
  unwrought: 'Rohaluminium (KN 7601)',
  wire: 'Draht (KN 7605)',
  'bars-profiles': 'Stangen, Profile (KN 7604)',
  'plates-sheets': 'Bleche, Bänder (KN 7606)',
  'grey-clinker': 'Grauer Klinker (Trockenverfahren)',
  'white-clinker': 'Weißer Klinker',
  blended: 'Mischzement (PPC)',
  'haber-bosch-gas': 'Haber-Bosch (Erdgas)',
  'haber-bosch-coal': 'Haber-Bosch (Kohle)',
  'haber-bosch-naphtha': 'Haber-Bosch (Naphtha)',
  coal: 'Kohlekraftwerk',
  gas: 'Gaskraftwerk (GuD)',
  mixed: 'Netzmix',
  'grey-smr': 'Grau (Dampfreformierung)',
  'blue-ccs': 'Blau (mit CCS)',
  'green-electrolysis': 'Grün (Elektrolyse)',
};

/** Quarterly certificate prices for 2026 imports, € per tonne CO2e. */
export const PRICES_2026 = CERTIFICATE_PRICES
  .filter((p) => p.period.startsWith('2026-Q'))
  .map((p) => ({ q: `${p.period.slice(-1)}. Quartal 2026`, eur: p.eur }));

export const DE_DATES = [
  { when: 'Januar 2026', what: 'Die endgültige Phase beginnt. Importeure beantragen den Status als zugelassener CBAM-Anmelder.' },
  { when: 'Januar 2027', what: 'Erste Prüfberichte für 2026 können ausgestellt werden.' },
  { when: 'Februar 2027', what: 'Der Verkauf von CBAM-Zertifikaten auf der zentralen Plattform beginnt.' },
  { when: '30. September 2027', what: 'Die erste Jahreserklärung für Einfuhren aus 2026 ist fällig.' },
];

export const KOSTEN_FAQ = [
  { question: 'Wer zahlt CBAM, der indische Lieferant oder der Importeur?', answer: 'Der zugelassene CBAM-Anmelder in der EU, meist der Importeur oder sein indirekter Zollvertreter. Für jede Tonne ist genau ein Anmelder zuständig. Der indische Lieferant zahlt nichts, liefert aber die Emissionsdaten, die den Betrag bestimmen.' },
  { question: 'Gibt es eine Mengenschwelle?', answer: 'Ja. Wer in einem Kalenderjahr insgesamt höchstens 50 Tonnen erfasster Waren einführt, ist befreit. Für Strom und Wasserstoff gilt die Schwelle nicht.' },
  { question: 'Warum sind Standardwerte teurer?', answer: 'Standardwerte erhalten einen Aufschlag: 10 % für 2026, 20 % für 2027 und 30 % ab 2028 bei Stahl, Aluminium, Zement und Wasserstoff, 1 % bei Düngemitteln. Geprüfte Ist-Werte des Werks vermeiden diesen Aufschlag.' },
  { question: 'Welche Behörde ist in Deutschland zuständig?', answer: 'Die Deutsche Emissionshandelsstelle (DEHSt). Dort beantragen Sie den Anmelderstatus und kaufen die Zertifikate. Die Erklärung selbst läuft über das EU-weite CBAM-Register.' },
];

export const DATA_PACK = [
  { id: 'installation', label: 'Anlage, Produktionsroute und Berichtszeitraum', en: 'Installation name, address and identifier, production route, and the reporting period' },
  { id: 'emissions', label: 'Spezifische eingebettete Emissionen je Tonne', en: 'Specific embedded emissions per tonne (direct; indirect only where in scope for the product)' },
  { id: 'allocation', label: 'Spezifische eingebettete kostenlose Zuteilung', en: 'Specific embedded free allocation for the goods' },
  { id: 'carbonprice', label: 'In Indien gezahlter CO2-Preis, mit Bescheinigung', en: 'Any carbon price effectively paid in India, certified by an independent person (state "none" if none)' },
  { id: 'parameters', label: 'Qualifizierende Parameter, etwa Klinkeranteil oder Stickstoffform', en: 'Qualifying parameters required for the product (for example clinker content for cement, nitrogen forms for fertilisers)' },
  { id: 'precursors', label: 'Vorprodukte mit ihren Prüfberichten', en: 'Precursor goods used, with their embedded emissions and verification reports' },
  { id: 'verification', label: 'Prüfbericht einer akkreditierten Prüfstelle', en: 'The verification report from an accredited CBAM verifier for the emissions above' },
];
