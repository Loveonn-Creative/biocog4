import { describe, expect, it } from "bun:test";
import { estimateReads } from "../src/lib/pdfLimit";
import { runPool, stopsBatch } from "../src/lib/functionErrors";

const err = (status: number, body: unknown) => ({ context: new Response(JSON.stringify(body), { status }) });

describe("upload batch", () => {
  it("estimates reads the way the server counts them today", () => {
    expect(estimateReads([1, 1, 3])).toEqual({ reads: 3, pages: 5 });
    expect(estimateReads([10])).toEqual({ reads: 1, pages: 10 });
    expect(estimateReads([80])).toEqual({ reads: 8, pages: 80 }); // 10-page parts
    expect(estimateReads([0])).toEqual({ reads: 1, pages: 1 });
  });

  it("stops on a pause or outage on our side (503), not only on 402/429", async () => {
    expect(await stopsBatch(err(503, { code: "ai_unavailable" }))).toBe(true);
    expect(await stopsBatch(err(503, { code: "ai_down" }))).toBe(true);
    expect(await stopsBatch(err(429, { code: "monthly_limit" }))).toBe(true);
    expect(await stopsBatch(err(402, {}))).toBe(true);
    expect(await stopsBatch(err(422, { code: "unreadable" }))).toBe(false);
    expect(await stopsBatch(err(409, {}))).toBe(false);
  });

  it("runs two at a time and skips the rest once stopped", async () => {
    let live = 0, peak = 0;
    const seen: number[] = [], skipped: number[] = [];
    let stop = false;
    await runPool([0, 1, 2, 3, 4, 5], 2, async (n) => {
      live++; peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      if (n === 2) stop = true;
      live--;
    }, () => stop, (n) => skipped.push(n));
    expect(peak).toBe(2);
    expect(seen).toContain(2);
    expect(seen.length + skipped.length).toBe(6);
    expect(skipped.length).toBeGreaterThan(0);
  });
});
