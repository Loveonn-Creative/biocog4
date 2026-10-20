// Help Center articles (English), shared by the website (/help and the in-app
// panel) and the help-ask edge function, which answers only from this text.
// Pure: no Deno or browser imports.
//
// Every fact here must match the code it describes; where each one comes from
// is noted beside it, never shown on the page:
//   plan reads: _shared/planLimits.ts (PLAN_MONTHLY_INVOICES)
//   guest limits and file types: _shared/guestScan.ts; signed-in 15 MB: src/pages/Index.tsx
//   files at once: src/components/BulkUpload.tsx (maxFiles = 10)
//   credits, validity, page counting: _shared/addonPurchases.ts
//   GST and payment fee: _shared/checkoutTotals.ts
//   Verify score: _shared/verifyGate.ts (starts at 100, passes at 80)
//   grid factor: _shared/emissionFactors.ts (0.710, CEA CO2 Baseline Database v21.0)
//   data kept: src/data/legalContent.ts (Privacy Policy, section 9), as written
//   refunds and cancelling: owner decision, October 2026
//   features named on Pricing or in the terms but not in the product: owner
//   decision, October 2026: built on request, at extra cost
//   voice: src/pages/Index.tsx (ask by voice, answer read aloud);
//   _shared/intelligence.ts (real-time voice on Pro and Scale)

export type HelpSection = 'start' | 'upload' | 'numbers' | 'billing';
export type HelpVisual = 'formula' | 'score' | 'gst' | 'split';
export type ContactTopic = 'technical' | 'sales' | 'general';

export interface HelpArticle {
  slug: string;
  section: HelpSection;
  /** The question, as people ask it. */
  q: string;
  /** The answer in one line. */
  a: string;
  /** Short label and value pairs, shown as tiles. */
  facts?: [string, string][];
  /** Two or three short steps. */
  steps?: string[];
  /** The one button that does the task. */
  cta?: { label: string; to: string };
  /** A small picture that explains the idea. */
  visual?: HelpVisual;
  /** Other words people use for this, for search only. */
  keywords: string[];
  /** App pages where the in-app panel lists this article first. */
  pages?: string[];
  /** Contact form topic when the article does not answer it. */
  contact?: ContactTopic;
}

export interface HelpFix {
  /** Part of the message as people see it on screen (lower case). */
  match: string;
  fix: string;
  slug?: string;
}

export const HELP_SECTIONS: { id: HelpSection; title: string; blurb: string }[] = [
  { id: 'start', title: 'Get started', blurb: 'Try it, plans, voice, your data' },
  { id: 'upload', title: 'Upload a bill', blurb: 'Files, long PDFs, repeats' },
  { id: 'numbers', title: 'My numbers and Verify', blurb: 'How a figure is worked out' },
  { id: 'billing', title: 'Plans and payments', blurb: 'Reads, credits, GST, receipts' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'try-without-an-account',
    section: 'start',
    q: 'Can I try it without an account?',
    a: 'Yes. Upload a bill on the home page and see the result straight away.',
    facts: [['Without an account', '30 invoices a day on one device'], ['Your results', 'Kept in this browser for 24 hours']],
    steps: ['Sign in free to keep your results. We read your files again under your account.'],
    cta: { label: 'Upload a bill', to: '/' },
    keywords: ['guest', 'sign up', 'signup', 'register', 'trial', 'demo', 'login', 'no account'],
  },
  {
    slug: 'is-senseible-free',
    section: 'start',
    q: 'Is Senseible free?',
    a: 'Yes. The Snapshot plan is free, forever.',
    facts: [['Invoice reads', '10 a month'], ['Team seats', '1']],
    steps: ['Paid plans give you more reads and more features.'],
    cta: { label: 'See plans', to: '/pricing' },
    keywords: ['price', 'cost', 'free plan', 'snapshot', 'trial', 'charge'],
    pages: ['/subscription'],
  },
  {
    slug: 'ask-by-voice',
    section: 'start',
    q: 'Can I ask by voice?',
    a: 'Yes. Tap the mic on the home page, ask your question, and hear the answer read aloud.',
    steps: ['Voice works in Chrome or Edge. Allow the microphone when your browser asks.', 'Pro and Scale plans also get live voice conversations in Biocog Intelligence.'],
    cta: { label: 'Go to the home page', to: '/' },
    keywords: ['mic', 'microphone', 'speak', 'talk', 'voice ai', 'audio', 'listen'],
    pages: ['/intelligence'],
  },
  {
    slug: 'how-long-is-my-data-kept',
    section: 'start',
    q: 'How long is my data kept?',
    a: 'Up to 3 months without an account, and up to 18 months for signed-in or paid accounts.',
    steps: ['These are the standard periods in our Privacy Policy.', 'They can be longer where the law, an audit or a dispute needs it.'],
    cta: { label: 'Read the Privacy Policy', to: '/legal/privacy' },
    keywords: ['retention', 'delete', 'privacy', 'storage', 'stored', 'how long', 'keep', 'backup'],
    pages: ['/settings', '/profile'],
    contact: 'general',
  },
  {
    slug: 'what-can-i-upload',
    section: 'upload',
    q: 'What can I upload?',
    a: 'A PDF or a photo of your bill.',
    facts: [['File types', 'PDF, JPG, PNG, WEBP, HEIC'], ['File size', '10 MB without an account, 15 MB signed in'], ['At once', 'Up to 10 files']],
    steps: ['Tax invoices, electricity bills, fuel slips and freight records are read.', 'Anything else is turned away with a message. It does not use a read.'],
    cta: { label: 'Upload a bill', to: '/' },
    keywords: ['file', 'format', 'size', 'mb', 'pdf', 'photo', 'image', 'jpg', 'png', 'heic', 'document', 'invoice', 'bulk'],
    pages: ['/', '/history'],
    contact: 'technical',
  },
  {
    slug: 'long-pdfs',
    section: 'upload',
    q: 'How are long PDFs read?',
    a: 'Upload the whole file. Your browser splits it into parts, and we read them one by one.',
    visual: 'split',
    steps: ['Each part is saved on its own, so one unclear page won’t hold up the rest.', 'From your page-counting date, each PDF page and each photo counts as one read.'],
    facts: [['Page counting starts', '1 November 2026 on yearly and free plans'], ['Monthly plans', 'At the next billing date, by 1 December 2026']],
    keywords: ['pages', 'many pages', 'big pdf', 'multi page', 'page count', 'split', 'parts'],
    pages: ['/', '/history'],
    contact: 'technical',
  },
  {
    slug: 'same-invoice-twice',
    section: 'upload',
    q: 'What if I upload the same invoice twice?',
    a: 'It is counted once.',
    steps: ['We recognise the same file and show you the result from the first time.', 'The same invoice saved as a different file is caught too.', 'An invoice that’s already in your records doesn’t use a read.'],
    keywords: ['duplicate', 'again', 'repeat', 'twice', 'double', 'same file', 'already'],
    pages: ['/', '/history'],
  },
  {
    slug: 'blurry-or-handwritten-bill',
    section: 'upload',
    q: 'My bill is blurry or handwritten',
    a: 'Unclear numbers are flagged, never guessed.',
    steps: ['Take the photo again with the whole page in view and good light, or upload the original PDF.', 'Hand-written quantities are marked, and they score lower in Verify.'],
    cta: { label: 'Upload again', to: '/' },
    keywords: ['blur', 'unclear', 'handwritten', 'hand written', 'photo quality', 'dark', 'cannot read', 'wrong number'],
    pages: ['/', '/verify'],
    contact: 'technical',
  },
  {
    slug: 'electricity-bill',
    section: 'upload',
    q: 'What do you read from my electricity bill?',
    a: 'Only the billing details: the period, tariff category, sanctioned load and units.',
    steps: ['Your name, address, phone, consumer, account and meter numbers are never taken.', 'If the bill shows only kVAh, we use the printed kWh, or kVAh × the printed power factor (marked as an estimate), or kWh you type in.'],
    keywords: ['electricity', 'power', 'discom', 'kwh', 'kvah', 'units', 'meter', 'tariff', 'load', 'power factor'],
    pages: ['/', '/history'],
  },
  {
    slug: 'how-is-my-number-worked-out',
    section: 'numbers',
    q: 'How is my number worked out?',
    a: 'The quantity on your bill × a published emission factor.',
    visual: 'formula',
    facts: [['Grid electricity, India', '0.710 kg CO₂ per kWh (CEA)']],
    steps: ['Every line shows the factor used, so you can check it.', 'No quantity on the bill means no figure. Gaps are never filled with guesses.'],
    keywords: ['calculate', 'calculation', 'formula', 'factor', 'emission factor', 'co2', 'carbon', 'how', 'number', 'wrong', 'grid'],
    pages: ['/dashboard', '/history', '/mrv-dashboard', '/reports'],
    contact: 'technical',
  },
  {
    slug: 'needs-data',
    section: 'numbers',
    q: 'What does "Needs Data" mean?',
    a: 'Something needed for the figure is missing: a quantity, a unit, the transport mode or a factor.',
    steps: ['The line stays in your records but is not added to your total.', 'The screen says what is missing. Add it, or upload a clearer copy.'],
    keywords: ['needs data', 'missing', 'incomplete', 'not counted', 'zero', 'blank', 'pending'],
    pages: ['/history', '/dashboard', '/mrv-dashboard', '/verify'],
  },
  {
    slug: 'what-verified-means',
    section: 'numbers',
    q: 'What does "Verified" mean?',
    a: 'Your record passed our checks: reviewed independently by Senseible, with expert guidance.',
    visual: 'score',
    steps: ['Each record starts at 100 points and loses points for gaps: a missing quantity, unit or factor, an unusual amount, an unclear read, or an estimated or hand-written value.', 'A record passes at 80.', 'Verified records stay in your audit trail and can’t be deleted.'],
    cta: { label: 'Open Verify', to: '/verify' },
    keywords: ['verify', 'verified', 'verification', 'score', 'audit', 'check', 'pass', 'fail', 'confidence'],
    pages: ['/verify', '/reports', '/mrv-dashboard', '/monetize'],
  },
  {
    slug: 'monthly-reads',
    section: 'billing',
    q: 'How many reads do I get each month?',
    a: 'It depends on your plan. Reads reset on the 1st of each month, India time.',
    facts: [['Snapshot (free)', '10'], ['Essential', '100'], ['Pro', '1,000'], ['Scale', '10,000']],
    steps: ['An invoice that’s already in your records doesn’t use a read.'],
    cta: { label: 'See plans', to: '/pricing' },
    keywords: ['reads', 'scans', 'quota', 'allowance', 'how many', 'monthly', 'plan limit', 'reset'],
    pages: ['/', '/subscription', '/profile', '/billing'],
  },
  {
    slug: 'hit-my-limit',
    section: 'billing',
    q: 'I hit my limit. What now?',
    a: 'Top up credits, wait for the 1st, or move to a bigger plan.',
    facts: [['Invoice credits', '₹79 for 100 invoices'], ['Credits last', '12 months on a yearly plan, 30 days otherwise']],
    steps: ['Buy credits on your profile. They are used after your monthly reads run out.', 'Or wait for the 1st of next month, when your reads reset.'],
    cta: { label: 'Top up now', to: '/profile#top-up' },
    keywords: ['limit', 'page limit', 'used up', 'top up', 'topup', 'credits', 'buy more', 'exceeded', 'quota'],
    pages: ['/', '/profile', '/subscription'],
  },
  {
    slug: 'do-prices-include-gst',
    section: 'billing',
    q: 'Do prices include GST?',
    a: 'No. Prices on the site are before GST.',
    visual: 'gst',
    facts: [['UPI', 'Price + 18% GST'], ['Card, netbanking or wallet', 'Price + 4% payment fee, then 18% GST']],
    keywords: ['gst', 'tax', 'fee', 'upi', 'card', 'netbanking', 'wallet', 'total', 'invoice amount', 'extra charge'],
    pages: ['/subscription', '/profile', '/billing'],
  },
  {
    slug: 'paid-but-plan-not-active',
    section: 'billing',
    q: 'I paid, but my plan is not active',
    a: 'Please don’t pay again. Your plan turns on as soon as the payment is confirmed.',
    steps: ['Refresh your profile after a few minutes.', 'If money left your account and the plan is still off, message us with the payment reference from the payment screen.'],
    cta: { label: 'Message us about a payment', to: '/contact?topic=technical&msg=I%20paid%20but%20my%20plan%20is%20not%20active.%20Payment%20reference%3A%20' },
    keywords: ['paid', 'payment', 'not active', 'not working', 'money deducted', 'charged', 'razorpay', 'upgrade failed', 'pro not showing'],
    pages: ['/subscription', '/profile', '/billing'],
    contact: 'technical',
  },
  {
    slug: 'where-are-my-receipts',
    section: 'billing',
    q: 'Where are my receipts?',
    a: 'On the Billing page, under "Download your payment receipts".',
    cta: { label: 'Open Billing', to: '/billing' },
    keywords: ['receipt', 'invoice', 'bill', 'download', 'tax invoice', 'gst invoice', 'payment proof'],
    pages: ['/billing', '/subscription', '/profile'],
  },
  {
    slug: 'cancel-or-refund',
    section: 'billing',
    q: 'Can I cancel or get a refund?',
    a: 'There are no refunds. If you cancel, your plan does not renew.',
    steps: ['What you have already paid for stays yours until it ends.', 'A service you have already bought is not refunded.', 'To cancel, email impact@senseible.earth.'],
    cta: { label: 'Email us to cancel', to: 'mailto:impact@senseible.earth?subject=Cancel%20my%20plan%20renewal' },
    keywords: ['refund', 'cancel', 'money back', 'stop', 'renew', 'renewal', 'unsubscribe', 'auto renew'],
    pages: ['/subscription', '/billing'],
    contact: 'general',
  },
  {
    slug: 'feature-not-in-the-app',
    section: 'billing',
    q: 'I saw a feature on Pricing that I can’t find in the app',
    a: 'Some features on Pricing and in our terms are built for you on request, at an extra cost.',
    steps: ['Tell us what you need.', 'We’ll come back with what it takes and what it costs.'],
    cta: { label: 'Tell us what you need', to: '/contact?topic=sales&msg=I%20would%20like%20this%20feature%3A%20' },
    keywords: ['custom', 'feature', 'missing', 'dashboard', 'multi entity', 'streaming', 'integration', 'api', 'build', 'on request'],
    pages: ['/subscription'],
    contact: 'sales',
  },
];

/** Messages people see in the product, and what to do. */
export const HELP_FIXES: HelpFix[] = [
  { match: 'page limit reached', fix: 'Your monthly reads are used up. Buy credits on your profile (₹79 for 100 invoices), wait for the 1st, or move to a bigger plan.', slug: 'hit-my-limit' },
  { match: 'high volume of bills', fix: 'Many bills are being read at once. Wait a minute and try again. Nothing was counted.' },
  { match: 'catching up with demand', fix: 'Reading is catching up on our side. Your account is fine. Try again in a few minutes. Nothing was counted.' },
  { match: 'hard to read', fix: 'Take a sharper photo with the whole page in view, or upload the original PDF.', slug: 'blurry-or-handwritten-bill' },
  { match: "couldn't finish reading", fix: 'Try again. If it happens again, upload a clear photo of the page.' },
  { match: 'busy right now', fix: 'Reading is busy on our side. Wait a minute and try again. Nothing was counted.' },
  { match: 'paused on our side', fix: 'Reading is paused on our side. Your account is fine. Try again later. Nothing was counted.' },
  { match: 'taking too long', fix: 'Try again, or upload a photo of just the page with the totals. Nothing was counted.', slug: 'long-pdfs' },
  { match: 'could not read this file', fix: 'Take a sharper photo with the whole page in view, or upload the original PDF.', slug: 'blurry-or-handwritten-bill' },
  { match: 'not supported for carbon accounting', fix: 'Upload an invoice, electricity bill, fuel slip or freight record.', slug: 'what-can-i-upload' },
  { match: 'invoices today without an account', fix: 'That is the daily limit without an account. Sign in free to keep going and save your results.', slug: 'try-without-an-account' },
  { match: 'the limit is 10 mb', fix: 'Without an account, files can be up to 10 MB. Take a photo of the page, or sign in for 15 MB.', slug: 'what-can-i-upload' },
  { match: 'the limit is 15 mb', fix: 'Take a photo of the page, or save the PDF at a lower quality.', slug: 'what-can-i-upload' },
  { match: 'already in your records', fix: 'Nothing to do. That invoice is already saved and is counted once.', slug: 'same-invoice-twice' },
  { match: 'session has expired', fix: 'Sign in again, then try again.' },
  { match: 'team role cannot add invoices', fix: 'Your role in this team can’t add invoices. Ask the owner or an admin to change it.' },
  { match: 'payment gateway could not load', fix: 'An ad blocker may be stopping checkout. Allow checkout.razorpay.com and try again.' },
  { match: 'could not confirm it yet', fix: 'Don’t pay again. Your plan turns on once the payment is confirmed.', slug: 'paid-but-plan-not-active' },
  { match: 'microphone access', fix: 'Allow the microphone for this site in your browser settings, then try again.', slug: 'ask-by-voice' },
  { match: 'not supported in your browser', fix: 'Voice needs Chrome or Edge.', slug: 'ask-by-voice' },
  { match: 'cannot be deleted', fix: 'This is expected. Verified records stay in your audit trail.', slug: 'what-verified-means' },
];

export const helpArticle = (slug: string): HelpArticle | undefined => HELP_ARTICLES.find((a) => a.slug === slug);

/** The article's words as plain text: what search reads and what the help assistant may answer from. */
export function articleText(a: Pick<HelpArticle, 'q' | 'a' | 'facts' | 'steps'>): string {
  return [a.q, a.a, ...(a.facts ?? []).map(([k, v]) => `${k}: ${v}`), ...(a.steps ?? [])].join('\n');
}

// ---------------------------------------------------------------- search

const STOP = new Set([
  'the', 'and', 'but', 'not', 'what', 'how', 'can', 'does', 'with', 'for', 'are', 'you', 'why', 'did', 'has', 'have', 'was',
  'is', 'my', 'me', 'it', 'to', 'of', 'in', 'on', 'a', 'an', 'do', 'i', 'we', 'our', 'your', 'this', 'that', 'there', 'when', 'where', 'will', 'from', 'get', 'any',
]);

/** Lower-case words in any script; numbers and ₹ kept. */
export function helpTokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{M}\p{N}₹]+/gu) ?? ([] as string[])).filter((w) => w.length > 1 && !STOP.has(w));
}

export interface Searchable { slug: string; q: string; a: string; facts?: [string, string][]; steps?: string[]; keywords: string[] }
export interface HelpHit { slug: string; score: number }

/**
 * Ranks articles for a query: words in the question count most, then the
 * extra search words, then the answer and steps. Words match on their start,
 * so "refunds" finds "refund". Only results scoring at least 60% of the best
 * are returned, so weak matches are left out.
 */
export function rankHelp(query: string, items: Searchable[], max = 4): HelpHit[] {
  const words = helpTokens(query);
  if (!words.length) return [];
  const hits = items.map((it) => {
    const q = helpTokens(it.q);
    const kw = helpTokens(it.keywords.join(' '));
    const body = helpTokens([it.a, ...(it.facts ?? []).flat(), ...(it.steps ?? [])].join(' '));
    const has = (list: string[], w: string) => list.some((t) => t === w || (w.length > 3 && (t.startsWith(w) || w.startsWith(t)) && Math.min(t.length, w.length) > 3));
    let score = 0;
    for (const w of words) score += has(q, w) ? 3 : has(kw, w) ? 2 : has(body, w) ? 1 : 0;
    // A typed phrase that appears whole in the question or search words is a strong signal.
    const phrase = query.toLowerCase().trim();
    if (phrase.length > 4 && [it.q, ...it.keywords].some((s) => s.toLowerCase().includes(phrase))) score += 3;
    return { slug: it.slug, score };
  }).filter((h) => h.score > 0).sort((x, y) => y.score - x.score);
  if (!hits.length) return [];
  const floor = hits[0].score * 0.6;
  return hits.filter((h) => h.score >= floor).slice(0, max);
}

/** The fix for a pasted message, if we know it. */
export function findFix(message: string, fixes: HelpFix[] = HELP_FIXES): HelpFix | undefined {
  const v = message.toLowerCase().replace(/\s+/g, ' ').trim();
  if (v.length < 4) return undefined;
  return fixes.find((f) => v.includes(f.match) || (v.length >= 8 && f.match.includes(v)));
}
