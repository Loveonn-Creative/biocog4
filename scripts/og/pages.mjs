// Copy and doodle for each link preview. Copy comes from the page itself;
// keep it free of figures the page does not state. Doodles are 400x400 SVG
// fragments drawn in the page's own motif. The route-to-image map the site
// uses lives in src/lib/seo/seoMeta.ts (OG_IMAGES); keep slugs in sync.

const invoice = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M0 0 h90 l30 30 v130 h-120 Z M90 0 v30 h30"/><path d="M22 58 h76 M22 84 h76 M22 110 h50"/></g>`;
const seal = (cx, cy, r = 62) => `<circle class="fill" cx="${cx}" cy="${cy}" r="${r}"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 13}" style="stroke:#fff;stroke-opacity:.45;stroke-width:3;stroke-dasharray:4 7"/>
  <path d="M${cx - 24} ${cy + 2} l16 17 l34 -36" style="stroke:#fff;stroke-width:8"/>`;

export const OG_PAGES = [
  {
    slug: 'default', eyebrow: 'Carbon MRV for MSMEs',
    title: 'Turn invoices into verified carbon records',
    sub: 'Audit-ready numbers for buyers, lenders and regulators.', cta: 'Upload a bill', size: 56,
    art: `${invoice(30, 60)}<path class="soft" d="M170 140 C 220 120, 240 170, 268 200"/><path d="M252 186 l18 16 l-24 6"/>${seal(310, 260)}`,
  },
  {
    slug: 'platform', eyebrow: 'The Platform',
    title: 'Every claim, with its source.',
    sub: 'Invoices in. Verified, audit-ready records out.', cta: 'See how it works',
    art: `${invoice(20, 40, 0.7)}${invoice(60, 80, 0.7)}${invoice(100, 120, 0.7)}<path d="M200 170 C 240 170, 250 230, 290 230"/><path d="M276 216 l16 14 l-20 8"/>${seal(318, 300, 56)}`,
  },
  {
    slug: 'pricing', eyebrow: 'Pricing',
    title: 'Start free. Upgrade when your records grow.',
    sub: 'Snapshot, Essential, Pro and Scale, with add-ons.', cta: 'Compare plans', size: 54,
    art: `<path d="M40 340 H360"/><path d="M60 340 v-50 h60 v50 M150 340 v-110 h60 v110 M240 340 v-180 h60 v180"/>
      <path class="soft" d="M90 270 C 140 220, 200 200, 270 130"/><path d="M270 130 v-70 l46 18 l-46 18"/><circle class="sunfill" cx="340" cy="70" r="18"/>`,
  },
  {
    slug: 'trust', eyebrow: 'Trust',
    title: 'Trust, made structural.',
    sub: 'Fingerprinted documents, pinned methods, a four-layer evidence chain.', cta: 'Break the chain yourself',
    art: `${seal(90, 110, 50)}${seal(220, 200, 50)}${seal(320, 320, 50)}<path class="soft" d="M128 140 L182 172 M258 232 L290 280"/>`,
  },
  {
    slug: 'carbon-credits', eyebrow: 'Carbon Credits',
    title: 'Three gates before any credit signal.',
    sub: 'Additionality, evidence linkage, methodology lock.', cta: 'Try failing a gate',
    art: `<path class="soft" d="M20 300 H380"/><path d="M90 300 V200 a32 32 0 0 1 64 0 V300 M180 300 V200 a32 32 0 0 1 64 0 V300 M270 300 V200 a32 32 0 0 1 64 0 V300"/>
      <path d="M372 300 V226 l-28 11 l28 11"/>${invoice(30, 236, 0.4)}`,
  },
  {
    slug: 'about', eyebrow: 'About',
    title: 'Why Senseible exists',
    sub: 'An invoice becomes a carbon calculation.', cta: 'Read the story',
    art: `${invoice(30, 100)}<path d="M40 150 L140 230" class="sun"/><path class="soft" d="M170 180 C 210 160, 230 200, 262 200"/><path d="M248 188 l16 12 l-20 8"/>
      <path d="M300 130 C 250 170, 270 270, 330 290 C 380 240, 370 160, 300 130 Z M318 160 C 312 210, 318 250, 330 290"/>`,
  },
  {
    slug: 'contact', eyebrow: 'Contact',
    title: 'Talk to the Senseible team',
    sub: 'WhatsApp or email, matched to your question.', cta: 'Get in touch',
    art: `<path class="soft" d="M30 330 C 110 350, 120 210, 200 230 S 300 330, 240 290 S 290 160, 340 130"/>
      <g transform="translate(340 120) rotate(-28)"><path d="M-46 -30 L46 0 L-46 30 L-24 0 Z M-24 0 L46 0"/></g>`,
  },
  {
    slug: 'decarbonize-india', eyebrow: 'Decarbonize India',
    title: 'Become an Impact Ambassador',
    sub: 'Help MSMEs near you take real climate action.', cta: 'Apply',
    art: `<circle class="sunfill" cx="200" cy="250" r="70"/><path class="sun" d="M200 140 v-34 M120 175 l-24 -24 M280 175 l24 -24 M90 250 h-34 M310 250 h34"/>
      <path d="M30 330 V270 h40 v-30 h40 v90 M140 330 V230 h50 v100 M220 330 V260 h40 v-40 h40 v110 M320 330 V280 h50 v50"/><path d="M20 330 H380"/>`,
  },
  {
    slug: 'cbam-calculator', eyebrow: 'CBAM Calculator',
    title: 'Know your CBAM exposure',
    sub: 'Year-by-year cost estimate for EU imports, 2026 to 2034.', cta: 'Estimate now',
    art: `<path d="M40 260 h300 l-40 50 H80 Z"/><path d="M110 260 v-50 h60 v50 M180 260 v-80 h60 v80 M250 260 v-50 h50 v50"/>
      <path class="soft" d="M20 340 C 120 320, 260 360, 380 330"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle class="sunfill" cx="${(330 + Math.cos(a) * 44).toFixed(1)}" cy="${(90 + Math.sin(a) * 44).toFixed(1)}" r="6"/>`; }).join('')}`,
  },
  {
    slug: 'climate-finance', eyebrow: 'Climate Finance',
    title: 'Verified data lenders can underwrite.',
    sub: 'Fingerprinted, methodology-locked records from your invoices.', cta: 'See what lenders check', size: 58,
    art: `<path d="M50 150 L190 80 L330 150 Z M60 170 H320 M80 190 v110 M140 190 v110 M200 190 v110 M260 190 v110 M50 320 H330"/>${seal(320, 300, 52)}`,
  },
  {
    slug: 'industries', eyebrow: 'Industries',
    title: 'Carbon, sector by sector',
    sub: 'Where emissions sit in your industry, and what to measure first.', cta: 'Find your sector',
    art: `<path d="M30 330 V200 l70 40 v-40 l70 40 v-40 l70 40 V120 h40 v-40 h40 v250 Z"/><path d="M20 330 H380"/>
      <path class="soft" d="M300 70 C 280 50, 320 30, 300 10 M340 70 C 320 50, 360 30, 340 10"/><path d="M80 280 h30 M160 280 h30 M240 280 h30"/>`,
  },
  {
    slug: 'net-zero', eyebrow: 'Net-Zero Engine',
    title: 'A baseline becomes a roadmap.',
    sub: 'Sector-aware reduction steps from your verified records.', cta: 'Start your baseline',
    art: `<path class="soft" d="M40 360 C 140 330, 60 250, 170 230 S 230 140, 320 110"/><circle class="fill" cx="40" cy="360" r="12"/><circle class="fill" cx="170" cy="230" r="10"/>
      <path d="M320 110 V30 l50 18 l-50 18"/><circle class="sunfill" cx="110" cy="80" r="26"/>`,
  },
];
