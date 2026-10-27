// Plan-ending email: who is due one, and what it says. Pure (no Deno
// imports) so the website tests run it. Sent by lifecycle-mailer.
//
// Two moments per paid period, each sent once (the send log keys on the
// account, the moment and the expiry date):
//   ending_7d   from 7 days before the paid period ends until it ends
//   grace_day1  the first 2 days of grace (GRACE_DAYS after expiry)
// Nothing is sent when another paid period continues after this one
// (renewed early, or a different plan bought), when the plan has no expiry
// (manual grant), or when the account is Snapshot.

import { canonicalPlan, GRACE_DAYS, normalizePlanTier, type PlanTier } from './planLimits.ts';

const DAY_MS = 86_400_000;
const RANK: Record<PlanTier, number> = { snapshot: 0, essential: 1, pro: 2, scale: 3 };

export type PlanEndingMoment = 'ending_7d' | 'grace_day1';

export interface SubscriptionRow { tier: string | null; expires_at: string | null; status?: string | null }

export interface PlanEndingDue {
  moment: PlanEndingMoment;
  tier: Exclude<PlanTier, 'snapshot'>;
  expiresAt: string;
  graceEndsAt: string;
  dedupeKey: string;
}

/** The moment, if any, a paid period ending at expiresAt is due an email at now. */
export function planEndingMoment(expiresAt: string, now: Date): PlanEndingMoment | null {
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return null;
  const n = now.getTime();
  if (n >= t - 7 * DAY_MS && n < t) return 'ending_7d';
  if (n >= t && n < t + 2 * DAY_MS) return 'grace_day1';
  return null;
}

/**
 * Whether this account is due a plan-ending email now, from its active
 * subscription rows and the profile copy of the plan. Uses the same rule as
 * the plan in force (canonicalPlan), so the email never names a plan the
 * account is not on.
 */
export function planEndingDue(
  userId: string,
  profile: { tier: string | null; expiresAt: string | null } | null,
  activeRows: SubscriptionRow[],
  now: Date,
): PlanEndingDue | null {
  const canon = canonicalPlan(profile, activeRows, now);
  const tier = normalizePlanTier(canon.tier);
  if (tier === 'snapshot' || !canon.expiresAt) return null;
  const end = Date.parse(canon.expiresAt);
  if (!Number.isFinite(end)) return null;
  // Another paid period running past this one, or a paid plan with no end
  // date: nothing is ending, so nothing is sent (the safe direction).
  // Only a period on the same or a higher plan counts: a cheaper plan running
  // on still means this plan is ending.
  const rank = RANK[tier];
  const later = [...activeRows.map((r) => ({ tier: r.tier, exp: r.expires_at })), { tier: profile?.tier ?? null, exp: profile?.expiresAt ?? null }]
    .some((r) => RANK[normalizePlanTier(r.tier)] >= rank && (r.exp === null || Date.parse(r.exp) > end));
  if (later) return null;
  const moment = planEndingMoment(canon.expiresAt, now);
  if (!moment) return null;
  const expiresAt = new Date(end).toISOString();
  return {
    moment,
    tier,
    expiresAt,
    graceEndsAt: new Date(end + GRACE_DAYS * DAY_MS).toISOString(),
    dedupeKey: `plan_${moment}:${userId}:${expiresAt.slice(0, 10)}`,
  };
}

const PLAN_NAME: Record<Exclude<PlanTier, 'snapshot'>, string> = { essential: 'Essential', pro: 'Pro', scale: 'Scale' };

/** "3 November", with the year only when it is not the current year (India time). */
export function istDate(iso: string, now: Date): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' };
  const year = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', year(d) === year(now) ? opts : { ...opts, year: 'numeric' });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export interface PlanEndingEmail { subject: string; preheader: string; text: string; html: string }

/** The email itself. businessName is optional; without it the copy says "Your ... plan". */
export function planEndingEmail(due: PlanEndingDue, businessName: string | null, now: Date, siteUrl = 'https://senseible.earth'): PlanEndingEmail {
  const plan = PLAN_NAME[due.tier];
  const ends = istDate(due.expiresAt, now);
  const graceEnd = istDate(due.graceEndsAt, now);
  const biz = businessName?.trim() ? businessName.trim().slice(0, 120) : null;
  const planOf = biz ? `The ${plan} plan for ${biz}` : `Your ${plan} plan`;
  const renewUrl = `${siteUrl}/pricing`;
  const prefsUrl = `${siteUrl}/settings#emails`;

  const copy = due.moment === 'ending_7d'
    ? {
        subject: `Your ${plan} plan ends on ${ends}`,
        preheader: 'Your records stay either way.',
        heading: `Your ${plan} plan ends on ${ends}`,
        lines: [
          `Renew before then and nothing changes for ${biz ?? 'your account'}.`,
          `If it lapses, everything keeps working until ${graceEnd}. After that the account moves to the free Snapshot plan. Your records stay.`,
        ],
      }
    : {
        subject: `Your ${plan} plan has ended. Everything works until ${graceEnd}`,
        preheader: `Renew by ${graceEnd} to keep your ${plan} plan.`,
        heading: `You have until ${graceEnd}`,
        lines: [
          `${planOf} ended on ${ends}. Everything keeps working until ${graceEnd}.`,
          `After that the account moves to the free Snapshot plan. Your records stay, and paid allowances stop.`,
        ],
      };

  const button = `Renew ${plan}`;
  const why = `You're getting this because ${biz ?? 'your account'} has a paid Senseible plan.`;
  const text = [copy.heading, '', ...copy.lines.flatMap((l) => [l, '']), `${button}: ${renewUrl}`, '', why, `Email settings: ${prefsUrl}`].join('\n');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f2;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(copy.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f2;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #dfe5e0;">
<tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.08em;color:#1d5a3e;font-weight:bold;">SENSEIBLE</td></tr>
<tr><td style="padding:8px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:#15211b;font-weight:bold;">${esc(copy.heading)}</td></tr>
${copy.lines.map((l) => `<tr><td style="padding:14px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2b3a32;">${esc(l)}</td></tr>`).join('\n')}
<tr><td style="padding:24px 28px 28px;"><a href="${renewUrl}" style="display:inline-block;background:#1d5a3e;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px;">${esc(button)}</a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#66746c;">${esc(why)} <a href="${prefsUrl}" style="color:#66746c;">Email settings</a></td></tr></table>
</td></tr></table></body></html>`;

  return { subject: copy.subject, preheader: copy.preheader, text, html };
}
