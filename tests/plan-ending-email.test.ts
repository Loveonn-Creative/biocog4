import { describe, expect, test } from "bun:test";
import { planEndingDue, planEndingEmail, planEndingMoment } from "../supabase/functions/_shared/planEndingEmail";

const U = "00000000-0000-4000-8000-000000000001";
const day = 86_400_000;
const exp = "2026-11-03T18:30:00.000Z"; // 4 Nov 00:00 IST
const at = (offsetDays: number) => new Date(Date.parse(exp) + offsetDays * day);

describe("plan-ending timing", () => {
  test("7-day window, grace window, nothing else", () => {
    expect(planEndingMoment(exp, at(-8))).toBeNull();
    expect(planEndingMoment(exp, at(-7))).toBe("ending_7d");
    expect(planEndingMoment(exp, at(-0.01))).toBe("ending_7d");
    expect(planEndingMoment(exp, at(0))).toBe("grace_day1");
    expect(planEndingMoment(exp, at(1.9))).toBe("grace_day1");
    expect(planEndingMoment(exp, at(2))).toBeNull();
  });

  test("due for the plan in force, with one key per moment and period", () => {
    const due = planEndingDue(U, null, [{ tier: "pro", expires_at: exp }], at(-5));
    expect(due?.moment).toBe("ending_7d");
    expect(due?.tier).toBe("pro");
    expect(due?.dedupeKey).toBe(`plan_ending_7d:${U}:2026-11-03`);
    expect(planEndingDue(U, null, [{ tier: "pro", expires_at: exp }], at(1))?.dedupeKey).toBe(`plan_grace_day1:${U}:2026-11-03`);
  });

  test("renewed early: a later period means nothing is ending", () => {
    const later = new Date(Date.parse(exp) + 30 * day).toISOString();
    expect(planEndingDue(U, null, [{ tier: "pro", expires_at: exp }, { tier: "pro", expires_at: later }], at(-5))).toBeNull();
    expect(planEndingDue(U, null, [{ tier: "pro", expires_at: exp }, { tier: "scale", expires_at: later }], at(-5))).toBeNull();
    // A cheaper plan running on: the Pro plan is still ending.
    expect(planEndingDue(U, null, [{ tier: "pro", expires_at: exp }, { tier: "essential", expires_at: later }], at(-5))?.tier).toBe("pro");
  });

  test("no email for Snapshot, manual grants without an end date, or after grace", () => {
    expect(planEndingDue(U, { tier: "snapshot", expiresAt: null }, [], at(-5))).toBeNull();
    expect(planEndingDue(U, { tier: "pro", expiresAt: null }, [], at(-5))).toBeNull();
    expect(planEndingDue(U, null, [{ tier: "pro", expires_at: exp }], at(5))).toBeNull();
  });

  test("profile-only plans are covered", () => {
    expect(planEndingDue(U, { tier: "essential", expiresAt: exp }, [], at(-3))?.tier).toBe("essential");
  });
});

describe("plan-ending copy", () => {
  const now = at(-5);
  const banned = /—|–|🎉|⏰|platform|recompute|leverage|seamless|unlock|journey|!|\bplease\b/i;

  test("7 days before: plan, dates, records stay, one button", () => {
    const due = planEndingDue(U, null, [{ tier: "pro", expires_at: exp }], now)!;
    const m = planEndingEmail(due, "Kalpana Castings", now);
    expect(m.subject).toBe("Your Pro plan ends on 4 November");
    expect(m.text).toContain("Renew before then and nothing changes for Kalpana Castings.");
    expect(m.text).toContain("everything keeps working until 11 November");
    expect(m.text).toContain("Your records stay.");
    expect(m.html.match(/<a href="https:\/\/senseible.earth\/pricing"/g)?.length).toBe(1);
    for (const s of [m.subject, m.preheader, m.text]) expect(s).not.toMatch(banned);
  });

  test("grace day 1 and no business name", () => {
    const g = at(1);
    const due = planEndingDue(U, null, [{ tier: "essential", expires_at: exp }], g)!;
    const m = planEndingEmail(due, null, g);
    expect(m.subject).toBe("Your Essential plan has ended. Everything works until 11 November");
    expect(m.text).toContain("Your Essential plan ended on 4 November.");
    expect(m.text).toContain("Your records stay, and paid allowances stop.");
    for (const s of [m.subject, m.preheader, m.text]) expect(s).not.toMatch(banned);
  });

  test("business names are escaped in HTML", () => {
    const due = planEndingDue(U, null, [{ tier: "pro", expires_at: exp }], now)!;
    expect(planEndingEmail(due, "<b>A&B</b>", now).html).toContain("&lt;b&gt;A&amp;B&lt;/b&gt;");
  });
});
