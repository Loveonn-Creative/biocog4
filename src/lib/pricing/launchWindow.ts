// The launch-price review date shown on the website (owner, 22 October 2026:
// "launch pricing will be revised on 31 December"). Display only: checkout
// prices come from supabase/functions/_shared/planPricing.ts and do not change
// on this date. Notices and countdowns hide once it passes.
export const LAUNCH_REVIEW_AT = '2027-01-01T00:00:00+05:30';

/** Last launch day as shown, e.g. "31 December". */
export const launchEndsLabel = (at: string = LAUNCH_REVIEW_AT) =>
  new Date(Date.parse(at) - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

export const launchWindowOpen = (now = new Date(), at: string = LAUNCH_REVIEW_AT) => now.getTime() < Date.parse(at);
