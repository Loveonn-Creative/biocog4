import { describe, expect, test, beforeEach } from "bun:test";
import { analyticsEvents } from "../src/lib/analytics";

// gtag pushes the arguments object onto window.dataLayer.
const g = globalThis as unknown as { window?: { dataLayer: unknown[]; location?: unknown } };

describe("resource download events", () => {
  beforeEach(() => { g.window = { dataLayer: [] }; });

  test("one GA4 file_download per file, with the fixed resource name", () => {
    analyticsEvents.resourceDownload("template-scope-2-tracker", "xlsx", "templates");
    analyticsEvents.resourceDownload("template-scope-2-tracker", "xlsx", "templates");
    const hits = g.window!.dataLayer.map((a) => Array.from(a as ArrayLike<unknown>));
    expect(hits.length).toBe(2);
    expect(hits[0]).toEqual(["event", "file_download", { resource: "template-scope-2-tracker", file_extension: "xlsx", page: "templates" }]);
  });

  test("anything that is not a code slug is dropped (no personal data can pass)", () => {
    for (const bad of ["Meera@kalpana.in", "Kalpana Castings", "", "x".repeat(65), "<script>"]) analyticsEvents.resourceDownload(bad, "pdf", "templates");
    expect(g.window!.dataLayer.length).toBe(0);
  });
});
