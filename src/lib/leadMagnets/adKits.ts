// Free kits handed out on the ad landing pages (/go/*): a one-page PDF the
// visitor keeps, built in the browser from what they typed. Pure text
// builders are tested; the PDF itself is drawn by downloadKitPdf. Estimates
// are labelled as estimates, financing is never promised, nothing is sent
// anywhere unless the visitor asks for a call.
import type { CarbonEstimate } from './msmeCarbonReply';
import { PRESSURE_LABEL, SUPPLIER_REQUEST, type EvidencePlan, type Pressure } from './supplierEvidence';

export interface KitSection { heading: string; lines: string[] }
export interface Kit { title: string; subtitle: string; sections: KitSection[]; footer: string }

const t = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });

/** What a lender usually asks an MSME for, alongside the carbon baseline. */
export const LENDER_CHECKLIST = [
  'Last 6 to 12 months of electricity bills',
  'Fuel invoices: diesel, LPG, PNG, coal or biomass',
  'Quotation for the green project (solar, efficient motors, cleaner fuel)',
  'GST registration and last two years of financial statements',
  'Udyam registration certificate',
];

export function msmeKit(estimate: CarbonEstimate | null, page: string): Kit {
  const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
  return {
    title: 'Green-loan readiness kit',
    subtitle: 'Your starting carbon number and the papers a lender asks for.',
    sections: [
      {
        heading: 'Your carbon number (estimate)',
        lines: estimate
          ? [
              `About ${t(estimate.totalTonnes)} tonnes CO2 a year, from the monthly numbers you typed.`,
              `${estimate.electricityPct}% from electricity, ${100 - estimate.electricityPct}% from diesel.`,
              `Factors: grid ${estimate.factors.grid.toFixed(3)} kg CO2/kWh (CEA), diesel ${estimate.factors.diesel} kg CO2/litre.`,
              'A lender can check a number read from your actual bills. This estimate is your starting point.',
            ]
          : ['Add your monthly units to see your number. It sits next to "Units consumed" on your bill.'],
      },
      { heading: 'Bring these to your bank', lines: LENDER_CHECKLIST.map((l) => `[ ] ${l}`) },
      {
        heading: '6-month bill tracker',
        lines: months.map((m) => `${m}:  units ________ kWh   diesel ________ litres`),
      },
      {
        heading: 'What happens next',
        lines: [
          'Book a 10-minute call. We read your six bills with you and build the file your bank can check.',
          'Lenders decide on loans. We get your proof ready.',
        ],
      },
    ],
    footer: `Senseible · senseible.earth${page}`,
  };
}

export function supplierKit(plan: EvidencePlan, pressure: Pressure, page: string): Kit {
  return {
    title: 'Supplier evidence kit',
    subtitle: `Your plan to move Scope 3 suppliers from spend estimates to bills (${PRESSURE_LABEL[pressure]}).`,
    sections: [
      {
        heading: 'Where you stand',
        lines: [
          `${plan.suppliers} suppliers behind about 80% of spend. ${plan.withData} send activity data today (${plan.coveragePct}%).`,
          `${plan.missing} to bring on in ${plan.months} months: about ${plan.perMonth} a month.`,
          ...plan.waves.map((w) => `${w.label}: ${w.suppliers} suppliers by month ${w.byMonth}.`),
        ],
      },
      { heading: 'What reviewers will ask', lines: plan.questions.map((q) => `- ${q}`) },
      { heading: 'Request to send your suppliers', lines: SUPPLIER_REQUEST.split('\n') },
      {
        heading: 'What happens next',
        lines: [
          'Book a 10-minute call. Send one supplier\'s bills and see their emissions report, with method, factor, source and document on every line.',
          'Integrations, supplier invitations and reporting formats are set up for your organisation.',
        ],
      },
    ],
    footer: `Senseible · senseible.earth${page}`,
  };
}

/** The call request as one plain message, readable in the team inbox. */
export function callbackMessage(input: { page: string; industry: string; whatsapp: string; summary?: string }): string {
  return [
    '10-minute call requested.',
    `Page: ${input.page}`,
    `Industry: ${input.industry}`,
    `WhatsApp: ${input.whatsapp}`,
    ...(input.summary ? [`From the page: ${input.summary}`] : []),
  ].join('\n');
}

/** Draws the kit as a one-page A4 PDF and saves it. */
export async function downloadKitPdf(kit: Kit, fileName: string, accent: [number, number, number]): Promise<void> {
  const { default: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(kit.title, M, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(kit.subtitle, W - 2 * M), M, 25);
  let y = 46;
  doc.setTextColor(25, 30, 28);
  for (const s of kit.sections) {
    if (y > 262) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
    doc.setTextColor(...accent); doc.text(s.heading, M, y); y += 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 46, 43);
    for (const line of s.lines) {
      const wrapped = doc.splitTextToSize(line || ' ', W - 2 * M);
      if (y + wrapped.length * 5 > 280) { doc.addPage(); y = 20; }
      doc.text(wrapped, M, y); y += wrapped.length * 5;
    }
    y += 5;
  }
  doc.setFontSize(9); doc.setTextColor(110, 116, 113);
  doc.text(kit.footer, M, 290);
  doc.save(fileName);
}
