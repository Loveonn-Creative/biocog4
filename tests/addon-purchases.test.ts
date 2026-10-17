import { describe, expect, it } from "bun:test";
import { basePaiseFor, creditValidity, packExpiry, pageCountingFrom, parsePurchase, PAGE_COUNTING_STARTS, purchaseName } from "../supabase/functions/_shared/addonPurchases";
import { activateAddonOrder } from "../supabase/functions/_shared/addonActivation";
import { checkoutTotal } from "../supabase/functions/_shared/checkoutTotals";
import { creditsLeft, packUsableUntil, planReadsUsed, type PackRow } from "../src/lib/invoiceAllowance";
import { estimateReads } from "../src/lib/pdfLimit";
import { fitWithin } from "../src/lib/imageUpload";
import { ADDONS } from "../src/lib/pricing/pricingMath";

describe("prices and requests", () => {
  it("charges ₹79 per 100 invoices, ₹7,999 for the audit and ₹2,999 per fast-track report", () => {
    expect(basePaiseFor({ item: "credits", packs: 3 })).toBe(3 * 7900);
    expect(basePaiseFor({ item: "expert_audit", quantity: 1 })).toBe(799900);
    expect(basePaiseFor({ item: "fast_track", quantity: 2 })).toBe(2 * 299900);
    expect(checkoutTotal(7900, "upi").totalPaise).toBe(9322); // + 18% GST, no fee on UPI
  });
  it("pricing page shows the same prices the server charges", () => {
    const by = Object.fromEntries(ADDONS.map((a) => [a.id, a]));
    expect(by.scans.amount * 100).toBe(basePaiseFor({ item: "credits", packs: 1 }));
    expect(by.audit.amount * 100).toBe(basePaiseFor({ item: "expert_audit", quantity: 1 }));
    expect(by.fasttrack.amount * 100).toBe(basePaiseFor({ item: "fast_track", quantity: 1 }));
    expect(by.audit.price).toBe("₹7,999 one-time");
  });
  it("ignores client amounts and refuses what we do not sell", () => {
    expect(parsePurchase({ item: "credits", packs: 2, amount: 1 })).toEqual({ item: "credits", packs: 2 });
    expect(parsePurchase({ item: "credits", packs: 0 })).toBeNull();
    expect(parsePurchase({ item: "credits", packs: 51 })).toBeNull();
    expect(parsePurchase({ item: "expert_audit", quantity: 5 })).toEqual({ item: "expert_audit", quantity: 1 });
    expect(parsePurchase({ item: "fast_track", quantity: 21 })).toBeNull();
    expect(parsePurchase({ item: "plan" })).toBeNull();
    expect(purchaseName({ item: "credits", packs: 2 })).toBe("200 invoice credits");
  });
});

describe("validity and page counting", () => {
  it("credits last 12 months on a yearly plan, else 30 days", () => {
    const t = new Date("2026-11-05T00:00:00Z");
    expect(creditValidity("yearly")).toBe("yearly");
    expect(creditValidity("monthly")).toBe("monthly");
    expect(creditValidity(null)).toBe("monthly");
    expect(packExpiry("yearly", t).toISOString()).toBe("2027-11-05T00:00:00.000Z");
    expect(packExpiry("monthly", t).toISOString()).toBe("2026-12-05T00:00:00.000Z");
  });
  it("yearly packs stop 30 days after the plan ends", () => {
    const pack: PackRow = { id: "p", packs: 1, credits: 100, used: 40, validity: "yearly", status: "active", paid_at: "2026-11-01T00:00:00Z", expires_at: "2027-11-01T00:00:00Z", created_at: "2026-11-01T00:00:00Z" };
    expect(packUsableUntil(pack, "2027-01-01T00:00:00Z")).toBe("2027-01-31T00:00:00.000Z");
    expect(creditsLeft([pack], "2027-01-01T00:00:00Z", new Date("2027-01-20T00:00:00Z"))).toBe(60);
    expect(creditsLeft([pack], "2027-01-01T00:00:00Z", new Date("2027-02-05T00:00:00Z"))).toBe(0);
    expect(creditsLeft([{ ...pack, status: "refunded" }], null, new Date("2026-11-02T00:00:00Z"))).toBe(0);
  });
  it("switches yearly and free accounts on 1 November, monthly at the next billing date, all by 1 December", () => {
    const now = new Date("2026-10-20T00:00:00Z");
    expect(pageCountingFrom({ cycle: "yearly", expiresAt: "2027-05-01T00:00:00Z" }, now)).toBe(PAGE_COUNTING_STARTS);
    expect(pageCountingFrom({ cycle: null, expiresAt: null }, now)).toBe(PAGE_COUNTING_STARTS);
    expect(pageCountingFrom({ cycle: "monthly", expiresAt: "2026-11-12T00:00:00.000Z" }, now)).toBe("2026-11-12T00:00:00.000Z");
    expect(pageCountingFrom({ cycle: "monthly", expiresAt: "2026-10-25T00:00:00Z" }, now)).toBe(PAGE_COUNTING_STARTS);
    expect(pageCountingFrom({ cycle: "monthly", expiresAt: "2027-03-01T00:00:00Z" }, now)).toBe("2026-11-30T18:30:00.000Z");
  });
  it("estimates a 25-page PDF as 25 with page counting and 3 before", () => {
    expect(estimateReads([25], true)).toEqual({ reads: 25, pages: 25 });
    expect(estimateReads([25], false)).toEqual({ reads: 3, pages: 25 });
    expect(estimateReads([1, 1], true).reads).toBe(2);
  });
  it("counts committed reads and fresh reservations only", () => {
    const now = new Date("2026-11-10T10:00:00Z");
    expect(planReadsUsed([
      { plan_units: 3, status: "committed", created_at: "2026-11-02T00:00:00Z" },
      { plan_units: 2, status: "released", created_at: "2026-11-02T00:00:00Z" },
      { plan_units: 4, status: "reserved", created_at: "2026-11-10T09:55:00Z" },
      { plan_units: 9, status: "reserved", created_at: "2026-11-10T09:00:00Z" },
    ], now)).toBe(7);
  });
  it("resizes only images larger than 2,400 px on the long edge", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(1200, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});

// Minimal stand-in for the Supabase client used by activation.
function fakeDb(rows: Record<string, any[]>) {
  return {
    rows,
    from(table: string) {
      const filters: Array<(r: any) => boolean> = [];
      let patch: any = null;
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => { filters.push((r) => r[c] === v); return q; },
        neq: (c: string, v: any) => { filters.push((r) => r[c] !== v); return q; },
        update: (p: any) => { patch = p; return q; },
        maybeSingle: async () => ({ data: (rows[table] ?? []).find((r) => filters.every((f) => f(r))) ?? null }),
        then: (res: any) => {
          const hit = (rows[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (patch) hit.forEach((r) => Object.assign(r, patch));
          return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null }).then(res);
        },
      };
      return q;
    },
  };
}
const razorpay = (p: any) => ({
  getPayment: async () => p, listOrderPayments: async () => (p ? [p] : []),
  capture: async (id: string, amount: number) => ({ ...p, id, amount, status: "captured" }),
});

describe("payment activation", () => {
  const pending = () => ({ invoice_credit_packs: [{ id: "k1", user_id: "u1", status: "pending", amount_paise: 9322, validity: "monthly", razorpay_order_id: "order_1" }], service_orders: [{ id: "s1", user_id: "u1", status: "pending", amount_paise: 353882, kind: "fast_track", quantity: 1, razorpay_order_id: "order_2" }] });
  const now = new Date("2026-11-05T10:00:00Z");

  it("activates a credit pack once, with its expiry", async () => {
    const db = fakeDb(pending());
    const pay = { id: "pay_1", order_id: "order_1", amount: 9322, currency: "INR", status: "captured" };
    const r = await activateAddonOrder(db, razorpay(pay) as any, { orderId: "order_1", paymentId: "pay_1", expectedUserId: "u1", now });
    expect(r).toMatchObject({ ok: true, activated: true, kind: "credits" });
    expect(db.rows.invoice_credit_packs[0]).toMatchObject({ status: "active", razorpay_payment_id: "pay_1", expires_at: "2026-12-05T10:00:00.000Z" });
    const again = await activateAddonOrder(db, razorpay(pay) as any, { orderId: "order_1", paymentId: "pay_1", now });
    expect(again).toMatchObject({ ok: true, activated: false });
  });

  it("sets a 72-hour due time on fast-track orders", async () => {
    const db = fakeDb(pending());
    const pay = { id: "pay_2", order_id: "order_2", amount: 353882, currency: "INR", status: "authorized" };
    const r = await activateAddonOrder(db, razorpay(pay) as any, { orderId: "order_2", now });
    expect(r).toMatchObject({ ok: true, activated: true, table: "service_orders" });
    expect(db.rows.service_orders[0]).toMatchObject({ status: "paid", due_at: "2026-11-08T10:00:00.000Z" });
  });

  it("refuses a wrong amount, another user, an uncaptured payment and an unknown order", async () => {
    const db = fakeDb(pending());
    expect(await activateAddonOrder(db, razorpay({ id: "p", order_id: "order_1", amount: 100, currency: "INR", status: "captured" }) as any, { orderId: "order_1", now })).toEqual({ ok: false, code: "amount_mismatch" });
    expect(await activateAddonOrder(db, razorpay(null) as any, { orderId: "order_1", expectedUserId: "u2", now })).toEqual({ ok: false, code: "wrong_user" });
    expect(await activateAddonOrder(db, razorpay({ id: "p", order_id: "order_1", amount: 9322, currency: "INR", status: "failed" }) as any, { orderId: "order_1", now })).toEqual({ ok: false, code: "not_captured" });
    expect(await activateAddonOrder(db, razorpay(null) as any, { orderId: "order_x", now })).toEqual({ ok: false, code: "order_missing" });
    expect(db.rows.invoice_credit_packs[0].status).toBe("pending");
  });
});
