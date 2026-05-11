// Unit tests for billing-cycle expiry math used in verify-razorpay-payment.
// Run with: deno test supabase/functions/verify-razorpay-payment/expiry_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

function computeExpiry(cycle: 'monthly' | 'yearly', from = new Date()): Date {
  const d = new Date(from);
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function normalizeCycle(input: unknown): 'monthly' | 'yearly' {
  return input === 'monthly' ? 'monthly' : 'yearly';
}

Deno.test("yearly cycle adds exactly +1 year", () => {
  const from = new Date("2026-05-11T10:00:00Z");
  const exp = computeExpiry('yearly', from);
  assertEquals(exp.toISOString(), "2027-05-11T10:00:00.000Z");
});

Deno.test("monthly cycle adds exactly +1 month", () => {
  const from = new Date("2026-05-11T10:00:00Z");
  const exp = computeExpiry('monthly', from);
  assertEquals(exp.toISOString(), "2026-06-11T10:00:00.000Z");
});

Deno.test("normalizeCycle defaults to yearly when missing or invalid", () => {
  assertEquals(normalizeCycle(undefined), 'yearly');
  assertEquals(normalizeCycle(null), 'yearly');
  assertEquals(normalizeCycle('weekly'), 'yearly');
  assertEquals(normalizeCycle('yearly'), 'yearly');
  assertEquals(normalizeCycle('monthly'), 'monthly');
});

Deno.test("monthly→yearly upsell: switching cycle on same day extends expiry by 11 months", () => {
  const from = new Date("2026-05-11T10:00:00Z");
  const monthly = computeExpiry('monthly', from);
  const yearly = computeExpiry('yearly', from);
  const diffMs = yearly.getTime() - monthly.getTime();
  // 11 months ≈ between 334 and 337 days
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 334 || days > 337) {
    throw new Error(`Expected ~11 months, got ${days} days`);
  }
});
