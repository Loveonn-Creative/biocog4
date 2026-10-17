import { describe, expect, it } from "bun:test";
import { documentKind, documentKindLabel, storedDocumentKind } from "../supabase/functions/_shared/documentKind";
import { normalizeDocumentType } from "../supabase/functions/_shared/extractionRead";
import { buildEmissionRows } from "../supabase/functions/_shared/emissionRows";
import { priceCheck } from "../supabase/functions/_shared/priceCheck";
import { median, monthOnMonth, recordInsights, type InsightRow } from "../supabase/functions/_shared/recordInsights";
import { recordCalculation, NOT_RECORDED } from "../src/lib/recordCalculation";
import { documentEmissionStatus } from "../src/lib/emissionLedger";

describe("document kinds (rules library)", () => {
  const k = (documentTitle: string, extra: Record<string, unknown> = {}) => documentKind({ documentTitle, ...extra });
  it("labels the seven kinds from the printed heading and billing signals", () => {
    expect(k("Tax Invoice")).toBe("tax_invoice");
    expect(k("Bill of Supply")).toBe("tax_invoice");
    expect(k("CREDIT NOTE")).toBe("credit_note");
    expect(k("Credit Note against Invoice No. 42")).toBe("credit_note");
    expect(k("Purchase Order")).toBe("purchase_order");
    expect(k("E-Way Bill")).toBe("eway_bill");
    expect(k("Lorry Receipt")).toBe("lorry_receipt");
    expect(k("Consignment Note")).toBe("lorry_receipt");
    expect(k("Bilty")).toBe("lorry_receipt");
    expect(k("Bill", { utilityBill: true })).toBe("electricity_bill");
    expect(k("Cash Memo", { lineCategories: ["FUEL"] })).toBe("fuel_slip");
    expect(k("", { documentType: "receipt", lineCategories: ["FUEL", "FUEL"] })).toBe("fuel_slip");
  });

  it("keeps a pump's tax invoice a tax invoice, and mixed lines are not a fuel slip", () => {
    expect(k("Tax Invoice", { lineCategories: ["FUEL"] })).toBe("tax_invoice");
    expect(k("Receipt", { lineCategories: ["FUEL", "RAW_MATERIAL"] })).toBe("other");
  });

  it("does not read a P.O. box or a stray 'note' as an order or a credit note", () => {
    expect(k("Tax Invoice", { documentType: "invoice" })).toBe("tax_invoice");
    expect(k("Delivery note")).toBe("other");
  });

  it("labels older stored reads by the same rules", () => {
    expect(storedDocumentKind({ documentType: "bill", electricityBill: { tariffCategory: "LT-II" }, lineItems: [] })).toBe("electricity_bill");
    expect(storedDocumentKind({ documentType: "invoice", lineItems: [{ hsn_code: "27160000" }] })).toBe("electricity_bill");
    expect(storedDocumentKind({ documentKind: "credit_note" })).toBe("credit_note");
    expect(documentKindLabel({ documentType: "certificate" }, "certificate")).toBe("Certificate");
    expect(documentKindLabel(null, "invoice")).toBe("Tax invoice");
  });

  it("accepts credit notes, orders and consignment notes instead of refusing them", () => {
    expect(normalizeDocumentType("Credit Note")).toBe("invoice");
    expect(normalizeDocumentType("Purchase Order")).toBe("invoice");
    expect(normalizeDocumentType("Consignment Note")).toBe("receipt");
    expect(normalizeDocumentType("Tax Invoice")).toBe("invoice");
    expect(normalizeDocumentType("Electricity Bill")).toBe("bill");
  });
});

const counted = {
  description: "HSD Diesel", hsn_code: "2710", quantity: 100, unit: "litre", productCategory: "FUEL", scope: 1,
  co2Kg: 268, emissionFactor: 2.68, factorSource: "BIOCOG_MVR_INDIA_v1.1:DIESEL", classificationMethod: "HSN" as const,
  sourcePage: 2, assumptions: ["Classified from HSN 2710"],
};
const own = { documentId: "d1", sessionId: null, userId: "u1" };

describe("credit notes and purchase orders are evidence, never counted", () => {
  it("makes no emission row for either, even when a line could be calculated", () => {
    expect(buildEmissionRows({ documentKind: "credit_note", confidence: 90, lineItems: [counted] }, own)).toEqual([]);
    expect(buildEmissionRows({ documentKind: "purchase_order", confidence: 90, lineItems: [counted] }, own)).toEqual([]);
  });

  it("still counts a tax invoice exactly as before", () => {
    const rows = buildEmissionRows({ documentKind: "tax_invoice", confidence: 90, lineItems: [counted] }, own);
    expect(rows.length).toBe(1);
    expect(rows[0].co2_kg).toBe(268);
    expect(rows[0].activity_data * rows[0].emission_factor).toBeCloseTo(rows[0].co2_kg, 6);
  });

  it("shows History status 'evidence' for a stored credit note with no rows", () => {
    expect(documentEmissionStatus([], { documentKind: "credit_note", lineItems: [] })).toEqual({ kind: "evidence", label: "Credit note" });
    // An invoice with rows is unaffected.
    expect(documentEmissionStatus([{ verified: true }], { documentKind: "tax_invoice" }).kind).toBe("verified");
  });
});

describe("calculation stored with each new record", () => {
  it("keeps the factor set version, page and assumptions; older rows say not recorded", () => {
    const [row] = buildEmissionRows({ documentKind: "tax_invoice", confidence: 90, methodology: { factorVersion: "IND_EF_2026_10" }, lineItems: [counted] }, own);
    const c = recordCalculation({ ...row, co2_kg: row.co2_kg });
    expect(c.line).toBe("100 litre × 2.68 kg/litre = 268 kg CO₂e");
    expect(c.factorSource).toBe("BIOCOG_MVR_INDIA_v1.1:DIESEL");
    expect(c.page).toBe("page 2");
    expect(c.factorSetVersion).toBe("IND_EF_2026_10");
    expect(c.assumptions).toEqual(["Classified from HSN 2710"]);

    const legacy = recordCalculation(
      { activity_data: 342, activity_unit: "kWh", emission_factor: 0.727, co2_kg: 248.634, verification_notes: JSON.stringify({ factorSource: "CEA", sourceDescription: "Electricity consumed" }) },
      { lineItems: [{ description: "Electricity consumed", sourcePage: 1 }] },
    );
    expect(legacy.page).toBe("page 1"); // found on the stored read
    expect(legacy.factorSetVersion).toBe(NOT_RECORDED);
    expect(legacy.assumptions).toBeNull();
    expect(recordCalculation({ activity_data: null, activity_unit: null, emission_factor: null, co2_kg: 0, verification_notes: "free text" }).line).toBeNull();
  });
});

describe("price check: a warning only", () => {
  it("passes lines that agree within 2% or ₹1", () => {
    expect(priceCheck(100, 92.5, 9250)).toBeNull();
    expect(priceCheck(3, 33.33, 100)).toBeNull(); // paise rounding
    expect(priceCheck(100, 92.5, 9400)).toBeNull(); // 1.6%
  });
  it("flags a gap and says nothing changed", () => {
    const pc = priceCheck(100, 92.5, 925)!; // misread digit
    expect(pc.expected).toBe(9250);
    expect(pc.diffPct).toBe(900);
    expect(pc.message).toContain("figures are unchanged");
  });
  it("needs all three figures", () => {
    expect(priceCheck(undefined, 92.5, 925)).toBeNull();
    expect(priceCheck(10, 0, 925)).toBeNull();
  });
});

const row = (id: string, date: string, kg: number, extra: Partial<InsightRow> = {}): InsightRow => ({
  id, date, co2_kg: kg, scope: 2, category: "electricity", verified: true, activity_data: kg / 0.727, activity_unit: "kWh", document_id: `doc-${id}`, ...extra,
});
const NOW = new Date("2026-10-17T00:00:00Z");

describe("month-on-month by category", () => {
  it("works out change % = (this − previous) ÷ previous × 100", () => {
    const m = monthOnMonth([row("a", "2026-08-10", 100), row("b", "2026-09-12", 130)], { now: NOW });
    expect(m.latestMonth).toBe("2026-09");
    expect(m.rows[0]).toMatchObject({ category: "electricity", kg: 130, previousKg: 100, changeKg: 30, changePct: 30 });
    expect(m.rows[0].quality.level).toBe("good");
  });
  it("gives no change when the previous month has no records", () => {
    const m = monthOnMonth([row("a", "2026-07-10", 100), row("b", "2026-09-12", 130)], { now: NOW });
    expect(m.rows[0].changePct).toBeNull();
    expect(m.rows[0].quality.reasons).toContain("No records in the previous month");
  });
  it("uses verified records when any exist, and flags unverified estimates otherwise", () => {
    const m = monthOnMonth([row("a", "2026-08-10", 100), row("b", "2026-09-12", 130, { verified: false })], { now: NOW });
    expect(m.basis).toBe("verified");
    expect(m.latestMonth).toBe("2026-08");
    const u = monthOnMonth([row("a", "2026-08-10", 100, { verified: false }), row("b", "2026-09-12", 130, { verified: false })], { now: NOW });
    expect(u.basis).toBe("unverified");
    expect(u.rows[0].quality.reasons).toContain("Unverified estimates");
  });
  it("marks the current month as not over", () => {
    const m = monthOnMonth([row("a", "2026-09-10", 100), row("b", "2026-10-02", 20)], { now: NOW });
    expect(m.rows[0].quality.reasons).toContain("The latest month is not over yet");
  });
});

describe("spikes, missing months and unit cost", () => {
  it("median of an even and odd set", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("flags a month more than 30% above the median of the 6 before", () => {
    const months = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
    const base = months.map((m, i) => row(`m${i}`, `${m}-05`, 100));
    const spike = recordInsights([...base, row("s", "2026-09-05", 200)], [], { now: NOW }).insights.find((i) => i.kind === "spike")!;
    expect(spike.values).toMatchObject({ kg: 200, medianKg: 100, abovePct: 100, monthsInMedian: 6 });
    expect(spike.recordIds).toContain("s");
    expect(recordInsights([...base, row("s", "2026-09-05", 125)], [], { now: NOW }).insights.some((i) => i.kind === "spike")).toBe(false);
  });

  it("needs at least 3 earlier months before calling a spike", () => {
    const r = recordInsights([row("a", "2026-07-05", 100), row("b", "2026-08-05", 100), row("c", "2026-09-05", 300)], [], { now: NOW });
    expect(r.insights.some((i) => i.kind === "spike")).toBe(false);
  });

  it("lists missing months for a recurring category, never as zero", () => {
    const r = recordInsights([row("a", "2026-05-05", 100), row("b", "2026-06-05", 100), row("c", "2026-08-05", 100), row("d", "2026-09-05", 100)], [], { now: NOW });
    const miss = r.insights.find((i) => i.kind === "missing")!;
    expect(miss.values.missingMonths).toBe("2026-07");
    expect(miss.assumptions.join(" ")).toContain("not zero");
  });

  it("flags a unit-cost jump above 20% from invoice amount ÷ quantity", () => {
    const rows = [
      { ...row("a", "2026-08-05", 72.7), activity_data: 100 },
      { ...row("b", "2026-09-05", 72.7), activity_data: 100 },
    ];
    const docs = [{ id: "doc-a", amount: 1000, currency: "INR" }, { id: "doc-b", amount: 1300, currency: "INR" }];
    const jump = recordInsights(rows, docs, { now: NOW }).insights.find((i) => i.kind === "unit_cost")!;
    expect(jump.values).toMatchObject({ unitCost: 13, previousUnitCost: 10, changePct: 30, unit: "kWh" });
    expect(jump.quality.level).not.toBe("good");
    const flat = recordInsights(rows, [{ id: "doc-a", amount: 1000 }, { id: "doc-b", amount: 1100 }], { now: NOW });
    expect(flat.insights.some((i) => i.kind === "unit_cost")).toBe(false);
  });

  it("every insight links records, fields, formula, units, assumptions and quality", () => {
    const r = recordInsights([row("a", "2026-08-10", 100), row("b", "2026-09-12", 130)], [], { now: NOW });
    for (const i of r.insights) {
      expect(i.recordIds.length).toBeGreaterThan(0);
      expect(i.fields.length).toBeGreaterThan(0);
      expect(i.formula).toBeTruthy();
      expect(i.units).toBeTruthy();
      expect(i.assumptions.length).toBeGreaterThan(0);
      expect(["good", "check", "weak"]).toContain(i.quality.level);
    }
  });

  it("counts an emission id once", () => {
    const m = monthOnMonth([row("a", "2026-08-10", 100), row("a", "2026-08-10", 100), row("b", "2026-09-12", 130)], { now: NOW });
    expect(m.rows[0].previousKg).toBe(100);
  });
});
