import { describe, expect, test } from "bun:test";
import { dropRepeatedLines, fillMissingHeader, lineSignature, parseSplitPart, shiftPages } from "../supabase/functions/_shared/splitPart";

const hash = "a".repeat(64);

describe("long PDF parts", () => {
  test("accepts only a valid fingerprint and page range", () => {
    expect(parseSplitPart({ sourceHash: hash, fromPage: 6, toPage: 10, totalPages: 23 })).toEqual({ sourceHash: hash, fromPage: 6, toPage: 10, totalPages: 23 });
    expect(parseSplitPart({ sourceHash: "xyz", fromPage: 1, toPage: 5, totalPages: 5 })).toBeNull();
    expect(parseSplitPart({ sourceHash: hash, fromPage: 6, toPage: 5, totalPages: 9 })).toBeNull();
    expect(parseSplitPart({ sourceHash: hash, fromPage: 1, toPage: 12, totalPages: 9 })).toBeNull();
    expect(parseSplitPart({ sourceHash: hash, fromPage: 1.5, toPage: 5, totalPages: 9 })).toBeNull();
    expect(parseSplitPart(null)).toBeNull();
  });

  test("a continuation page with no header takes it from the first part", () => {
    const ocr: Record<string, unknown> = { lineItems: [] };
    const filled = fillMissingHeader(ocr, { vendor: "Shree Steel", invoiceNumber: "INV-9", date: "12/10/2026", supplierGstin: "27AAACS1234F1Z5" });
    expect(filled).toEqual(["vendor", "invoiceNumber", "date", "supplierGstin"]);
    expect(ocr.vendor).toBe("Shree Steel");
  });

  test("a page that prints its own header is never changed", () => {
    const ocr: Record<string, unknown> = { vendor: "Other Supplier" };
    expect(fillMissingHeader(ocr, { vendor: "Shree Steel", invoiceNumber: "INV-9" })).toEqual([]);
    expect(ocr.vendor).toBe("Other Supplier");
    expect(ocr.invoiceNumber).toBeUndefined();
  });

  test("a printed duplicate copy is counted once; new lines are kept", () => {
    const first = [{ description: "HSD Diesel", quantity: "1,000", total: "₹92,000.00" }, { description: "Freight", total: 2500 }];
    const seen = new Set(first.map(lineSignature));
    const copy = dropRepeatedLines([{ description: "HSD  diesel", quantity: 1000, total: 92000 }, { description: "Freight", total: "2,500" }], seen);
    expect(copy).toEqual({ kept: [], dropped: 2 });
    const next = dropRepeatedLines([{ description: "HSD Diesel", quantity: 500, total: 46000 }], seen);
    expect(next.dropped).toBe(0);
    expect(next.kept).toHaveLength(1);
  });

  test("page numbers become pages of the original PDF", () => {
    expect(shiftPages([{ sourcePage: 2 }, {}], 6)).toEqual([{ sourcePage: 7 }, {}]);
    expect(shiftPages([{ sourcePage: 3 }], 1)).toEqual([{ sourcePage: 3 }]);
  });
});
