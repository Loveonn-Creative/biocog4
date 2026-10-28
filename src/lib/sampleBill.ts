import { gridFactorFor } from "../../supabase/functions/_shared/emissionFactors";

// Sample bill run: the whole journey (read, result, verify, certificate) on one
// fictional electricity bill. It runs in the browser from this stored result:
// no upload, no AI call, no read counted and nothing saved, so it cannot touch
// real records. Kill switch: build with VITE_SAMPLE_BILL=off to hide it.
export const SAMPLE_BILL_ENABLED = import.meta.env.VITE_SAMPLE_BILL !== "off";

export const SAMPLE_COMPANY = "Sample Castings Pvt Ltd";
const BILL_DATE = "2026-09-30";
// The CEA factor for the bill's financial year, as a real upload would get.
const GRID = gridFactorFor(BILL_DATE);
const KWH = 12_400;
const KG = Math.round(KWH * GRID.value);

/** Shaped exactly like a real reader result, so the real result screen shows it. */
export const SAMPLE_BILL_RESULT = {
  documentType: "electricity_bill",
  vendor: "Sample Power Distribution Co.",
  date: BILL_DATE,
  amount: 118_400,
  currency: "INR",
  emissionCategory: "electricity",
  primaryScope: 2,
  totalCO2Kg: KG,
  confidence: 0.95,
  classificationMethod: "KEYWORD",
  validationFlags: [] as string[],
  electricityBill: { billingPeriodStart: "2026-09-01", billingPeriodEnd: "2026-09-30", tariffCategory: "HT industrial", sanctionedLoadKw: 150 },
  documentCapture: "printed" as const,
  lineItems: [
    {
      description: "Energy charges",
      quantity: KWH,
      unit: "kWh",
      scope: 2,
      co2Kg: KG,
      emissionFactor: GRID.value,
      factorSource: GRID.source,
      classificationMethod: "KEYWORD" as const,
      guidance: { status: "counted" as const, need: null, nextStep: null },
    },
    { description: "Fixed and demand charges", guidance: { status: "bill_charge" as const, need: null, nextStep: null } },
  ],
  guidance: { counted: 1, needsData: 0, notCovered: 0, unclassified: 0, nextStep: null, billCharges: 1 },
};

export const SAMPLE_BILL = { kwh: KWH, kg: KG, factor: GRID.value, periodLabel: "1 Sep to 30 Sep 2026" };
