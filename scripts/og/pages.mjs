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
  {
    slug: 'careers', eyebrow: 'Careers',
    title: 'Build climate infrastructure for small businesses',
    sub: 'Come build the parts that don’t exist yet.', cta: 'See open roles', size: 50,
    chips: ['Engineering', 'Applied AI', 'Climate research', 'Design', 'Growth'],
    art: `<path d="M30 350 H380"/>
      <rect x="40" y="280" width="70" height="70" rx="8"/><rect x="120" y="280" width="70" height="70" rx="8"/><rect x="200" y="280" width="70" height="70" rx="8"/>
      <rect x="80" y="200" width="70" height="70" rx="8"/><rect x="160" y="200" width="70" height="70" rx="8"/>
      <rect x="120" y="120" width="70" height="70" rx="8"/>
      <rect x="200" y="120" width="70" height="70" rx="8" class="sun" style="stroke-dasharray:14 12"/>
      <path class="soft" d="M300 230 C 330 200, 330 160, 290 150"/><path d="M296 140 l-14 12 l18 6"/>
      <circle class="sunfill" cx="330" cy="70" r="26"/>`
  },
  {
    slug: 'mission', eyebrow: 'Mission',
    title: 'Carbon accounting every MSME can use',
    sub: 'Carbon verification for the businesses climate finance leaves out.', cta: 'Read our mission', size: 58,
    art: `<path d="M40 330 H360"/><path d="M70 330 V200 L130 150 L190 200 V330 M110 330 V270 h40 v60"/><path d="M60 208 L130 140 L200 208"/>
      <path class="soft" d="M200 250 C 250 240, 250 180, 290 170"/>${seal(310, 150, 52)}<circle class="sunfill" cx="70" cy="80" r="24"/>`,
  },
  {
    slug: 'partners', eyebrow: 'Partners',
    title: 'Verified MSME emission data, inside your product',
    sub: 'For banks, auditors, carbon credit buyers and ERP providers.', cta: 'Become a partner', size: 54,
    art: `${seal(200, 200, 58)}
      <path class="soft" d="M150 160 L100 110 M250 160 L300 110 M150 240 L100 290 M250 240 L300 290"/>
      <path d="M50 110 L80 80 L110 110 Z M56 110 v30 h48 v-30"/><rect x="270" y="70" width="60" height="70" rx="6"/><path d="M284 92 h32 M284 112 h20"/>
      <circle cx="80" cy="310" r="32"/><path d="M68 310 l9 9 l17 -18"/><rect x="270" y="280" width="64" height="50" rx="6" class="sun"/><path class="sun" d="M284 300 h36 M284 314 h22"/>`,
  },
  {
    slug: 'cbam', eyebrow: 'CBAM',
    title: 'CBAM, explained and costed',
    sub: 'The rules for the definitive period, and the cost per tonne sector by sector.', cta: 'Work out your cost', size: 60,
    art: `<path d="M200 70 V330 M140 330 H260 M80 120 H320"/><circle class="sunfill" cx="200" cy="70" r="12"/>
      <path d="M80 120 L40 220 H120 Z M320 120 L280 220 H360 Z"/>
      <path d="M50 220 h60 v-34 h-60 Z M62 186 v-20 h36 v20"/>
      <circle class="sunfill" cx="320" cy="206" r="14"/><circle class="sunfill" cx="304" cy="190" r="14"/><circle class="sunfill" cx="336" cy="190" r="14"/>`,
  },
  {
    slug: 'green-finance', eyebrow: 'Green Finance',
    title: 'Get ready for a green loan',
    sub: 'See what a lender will ask for, backed by verified emissions.', cta: 'Check your readiness', size: 60,
    art: `<path d="M60 340 H360"/><ellipse cx="140" cy="320" rx="60" ry="14"/><path d="M80 320 v-20 M200 320 v-20"/><ellipse cx="140" cy="294" rx="60" ry="14"/><path d="M80 294 v-20 M200 294 v-20"/><ellipse cx="140" cy="268" rx="60" ry="14"/>
      <path d="M140 254 V170"/><path d="M140 200 C 90 200, 80 150, 90 130 C 120 130, 140 160, 140 200 Z M140 180 C 180 180, 200 130, 190 110 C 160 110, 140 140, 140 180 Z"/>
      <rect x="250" y="120" width="110" height="150" rx="8"/><path d="M270 160 l10 10 l18 -20 M270 205 l10 10 l18 -20 M310 162 h30 M310 207 h30"/><path class="sun" d="M270 248 h70"/>`,
  },
  {
    slug: 'carbon-accounting', eyebrow: 'Carbon Accounting',
    title: 'Scope 1, 2 and 3, from your bills',
    sub: 'A GHG inventory built from the invoices you already have.', cta: 'See your hotspots', size: 60,
    art: `<circle cx="230" cy="210" r="150" class="soft"/><circle cx="230" cy="210" r="102"/><circle class="fill" cx="230" cy="210" r="52"/>
      <text x="230" y="226" text-anchor="middle" style="fill:#fff;stroke:none;font:600 44px SG">1</text>
      <text x="230" y="140" text-anchor="middle" style="fill:#1F513A;stroke:none;font:600 34px SG">2</text>
      <text x="230" y="90" text-anchor="middle" style="fill:#F59E0B;stroke:none;font:600 30px SG">3</text>
      ${invoice(10, 250, 0.55)}`,
  },
  {
    slug: 'calculators', eyebrow: 'Factors and Calculators',
    title: 'Free carbon calculators and emission factors',
    sub: 'Product footprints, freight, fuels and grid, line by line.', cta: 'Open a calculator', size: 54,
    art: `<rect x="60" y="60" width="180" height="270" rx="16"/><rect x="84" y="86" width="132" height="54" rx="6" class="sun"/>
      ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${86 + c * 46}" y="${164 + r * 50}" width="32" height="32" rx="6"/>`).join('')).join('')}
      <path d="M300 330 C 260 270, 270 190, 340 160 C 370 230, 350 300, 300 330 Z M300 330 C 310 270, 320 220, 340 160"/>`,
  },
  {
    slug: 'guides', eyebrow: 'Guides and Answers',
    title: 'Straight answers on carbon, CBAM and finance',
    sub: 'Guides on CBAM, Scope 3, BRSR and green finance for MSMEs and exporters.', cta: 'Start reading', size: 54,
    art: `<path d="M200 330 C 150 300, 90 300, 40 320 V160 C 90 140, 150 140, 200 170 Z M200 330 C 250 300, 310 300, 360 320 V160 C 310 140, 250 140, 200 170"/>
      <path d="M70 200 h90 M70 235 h90 M70 270 h60 M240 200 h90 M240 235 h90"/>
      <path class="sun" d="M250 40 h110 a14 14 0 0 1 14 14 v50 a14 14 0 0 1 -14 14 h-70 l-26 22 v-22 h-14 a14 14 0 0 1 -14 -14 v-50 a14 14 0 0 1 14 -14 Z"/>
      <text x="305" y="99" text-anchor="middle" style="fill:#F59E0B;stroke:none;font:600 46px SG">?</text>`,
  },
  {
    slug: 'enterprise', eyebrow: 'Enterprise Scope 3',
    title: 'Every supplier’s emissions, in one record',
    sub: 'Supplier invoices and bills become Scope 3 records with a source and factor.', cta: 'See how it works', size: 56,
    art: `<rect x="30" y="60" width="70" height="56" rx="6"/><rect x="30" y="172" width="70" height="56" rx="6"/><rect x="30" y="284" width="70" height="56" rx="6"/>
      <path class="soft" d="M108 88 C 170 88, 170 200, 220 200 M108 200 H220 M108 312 C 170 312, 170 200, 220 200"/>
      <rect x="230" y="100" width="140" height="200" rx="10"/><path d="M252 140 h96 M252 175 h96 M252 210 h96 M252 245 h60"/><circle class="sunfill" cx="350" cy="265" r="14"/>`,
  },
  {
    slug: 'credit-pricing', eyebrow: 'Carbon Credit Pricing',
    title: 'How carbon credits are actually priced',
    sub: 'One name, several different products. What drives the spread.', cta: 'Read the guide', size: 58,
    art: `<g transform="translate(40 230) rotate(-12)"><path d="M0 0 h80 l30 30 l-30 30 h-80 Z"/><circle cx="82" cy="30" r="7"/></g>
      <g transform="translate(150 160) rotate(-6)"><path d="M0 0 h100 l36 40 l-36 40 h-100 Z"/><circle cx="104" cy="40" r="8"/></g>
      <g transform="translate(220 60) rotate(4)"><path class="sun" d="M0 0 h120 l40 50 l-40 50 h-120 Z"/><circle class="sunfill" cx="124" cy="50" r="9"/></g>
      <path class="soft" d="M40 360 C 140 340, 240 300, 360 200"/>`,
  },
  {
    slug: 'marketplace', eyebrow: 'Marketplace',
    title: 'Carbon credits, with their provenance',
    sub: 'MSME credit listings with verification status and evidence links.', cta: 'Browse listings', size: 58,
    art: `<path d="M40 150 H360 L340 100 H60 Z M60 150 V330 H340 V150"/><path class="sun" d="M100 100 v50 M160 100 v50 M220 100 v50 M280 100 v50"/>
      ${invoice(90, 190, 0.6)}${seal(270, 250, 46)}<path d="M40 330 H360"/>`,
  },
  {
    slug: 'white-paper', eyebrow: 'White Paper',
    title: 'How an invoice becomes an emission figure',
    sub: 'Equations, factor governance, uncertainty, AI limits and the audit trail.', cta: 'Read the paper', size: 56,
    art: `<path d="M70 40 h170 l50 50 v260 h-220 Z M240 40 v50 h50"/><path d="M100 130 h150 M100 165 h150 M100 200 h100"/>
      <text x="100" y="262" style="fill:#1F513A;stroke:none;font:600 32px SG">E = A × EF</text>
      <path class="sun" d="M300 300 a22 22 0 1 1 0 44 a22 22 0 1 1 0 -44 M330 270 a22 22 0 1 1 0 44 a22 22 0 1 1 0 -44"/>`,
  },
];
