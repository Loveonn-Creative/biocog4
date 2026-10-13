// Build-only route registry. Every indexable page is derived from a data file,
// so adding an article, solution, comparison, industry or legal document to its
// data file automatically gives it a prerendered page, a sitemap entry, a
// Markdown mirror and an llms.txt line. Consumed by scripts/generate-static-html.js
// and scripts/validate-seo.mjs; never imported by the client.
import { cmsArticles, cmsCategories } from '@/data/cmsContent';
import { relatedArticles, anchorFor } from '@/data/articleRelated';
import { solutionPages } from '@/data/solutionsData';
import { servicePages } from '@/data/services';
import { competitorData } from '@/data/competitorData';
import { industries } from '@/data/industriesData';
import { answers, ANSWER_TOPICS } from '@/data/answers';
import { legalDocuments } from '@/data/legalContent';
import { careersRoles } from '@/data/careersRoles';
import { trustSafeguards } from '@/data/trustSafeguards';
import { articleRedirects } from '@/data/articleRedirects';
import * as di from '@/data/decarbonizeIndia';
import { ORGANIZATION, ORG_REF, entityJsonLd } from './entity';
import { FACTOR_HUB_ANSWER, FACTOR_HUB_META, FACTOR_HUB_PATH, FACTOR_PAGES, factorAnswer, factorFaqs, factorMeta, factorPath } from '@/data/factorLibrary';
import { CBAM_HUB_ANSWER, CBAM_HUB_META, CBAM_HUB_PATH, CBAM_PRICE, CBAM_SECTOR_COSTS, CBAM_YEARS, cbamAnswer, cbamFaqs, cbamSectorMeta, cbamSectorPath, CBAM_SECTOR_PAGES, sectorHref } from '@/data/cbamSectorCosts';
import {
  STATIC_PAGE_META,
  SITE_URL,
  fitTitle,
  solutionMeta,
  competitorMeta,
  industryMeta,
  answerMeta,
  legalMeta,
  canonicalUrl,
  PAGE_REVIEWS,
  REVIEWERS,
} from './seoMeta';
import { articleMeta, extractFaqs } from './articleSeo';
import { STATIC_CONTENT } from './staticContent';
import { markdownToBlocks, type Block } from './render';

export * from './seoMeta';
export { blocksToHtml, blocksToMarkdown, escapeHtml } from './render';

export type RouteSection = 'core' | 'tool' | 'guide' | 'solution' | 'compare' | 'industry' | 'legal';

export interface SeoRoute {
  path: string;
  section: RouteSection;
  title: string;
  description: string;
  h1: string;
  blocks: Block[];
  breadcrumbs: { name: string; path: string }[];
  jsonLd: Record<string, unknown>[];
  /** ISO date (YYYY-MM-DD); omitted when the data has no real date. */
  lastmod?: string;
  priority: number;
  changefreq: 'weekly' | 'monthly' | 'yearly';
}


const breadcrumbLd = (crumbs: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: canonicalUrl(c.path) })),
});

const faqLd = (faqs: { question: string; answer: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/** Accepts "2026-01-30" or "25 September 2026"; returns YYYY-MM-DD or undefined. */
export function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const m = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  return undefined;
}

// About and Contact describe Senseible itself, so they point at the one entity.
function withEntityPage(r: SeoRoute): SeoRoute {
  const extra = entityJsonLd(r.path);
  return extra.length ? { ...r, jsonLd: [...r.jsonLd, ...extra] } : r;
}

function staticRoute(path: string, section: RouteSection, priority: number, extra: Partial<SeoRoute> = {}): SeoRoute {
  const meta = STATIC_PAGE_META[path];
  if (!meta) throw new Error(`No STATIC_PAGE_META entry for ${path}`);
  const content = STATIC_CONTENT[path];
  const h1 = content?.h1 ?? meta.title;
  const crumbs = path === '/' ? [{ name: 'Home', path: '/' }] : [{ name: 'Home', path: '/' }, { name: h1, path }];
  return {
    path,
    section,
    title: fitTitle(meta.title),
    description: meta.description,
    h1,
    blocks: content?.blocks ?? [{ p: meta.description }],
    breadcrumbs: crumbs,
    jsonLd: path === '/' ? [] : [breadcrumbLd(crumbs)],
    priority,
    changefreq: 'monthly',
    ...extra,
  };
}

function coreRoutes(): SeoRoute[] {
  const home = staticRoute('/', 'core', 1.0, {
    changefreq: 'weekly',
    jsonLd: [
      ...entityJsonLd('/'),
    ],
  });

  const careers = staticRoute('/careers', 'core', 0.5, {
    blocks: [
      { p: STATIC_PAGE_META['/careers'].description },
      { h2: 'Open roles' },
      { ul: careersRoles.map(r => `${r.title} (${r.function}, ${r.level}, ${r.location}): ${r.scope}`) },
      { p: 'Freshers and interns apply through the intake form on the Careers page; everyone else can email build@senseible.earth.' },
    ],
  });

  const pricing = staticRoute('/pricing', 'core', 0.8);
  pricing.jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Senseible',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/pricing`,
    offers: [
      { '@type': 'Offer', name: 'Biocog Snapshot', price: '0', priceCurrency: 'INR' },
      { '@type': 'Offer', name: 'Biocog Essential (yearly)', price: '5988', priceCurrency: 'INR' },
      { '@type': 'Offer', name: 'Biocog Essential (monthly)', price: '1999', priceCurrency: 'INR' },
      { '@type': 'Offer', name: 'Biocog Pro (yearly)', price: '59988', priceCurrency: 'INR' },
      { '@type': 'Offer', name: 'Biocog Pro (monthly)', price: '9999', priceCurrency: 'INR' },
    ],
  });

  const guidesHub = staticRoute('/climate-intelligence', 'core', 0.9, {
    changefreq: 'weekly',
    blocks: [
      { p: STATIC_PAGE_META['/climate-intelligence'].description },
      ...cmsCategories.flatMap(cat => {
        const items = cmsArticles.filter(a => a.category === cat.id);
        return items.length
          ? [{ h2: cat.name } as Block, { ul: items.map(a => `[${a.title}](/climate-intelligence/${a.slug})`) } as Block]
          : [];
      }),
    ],
  });

  const industriesHub = staticRoute('/industries', 'core', 0.7, {
    blocks: [
      { p: STATIC_PAGE_META['/industries'].description },
      { ul: industries.map(i => `[${i.name}](/industries/${i.id}): ${i.buyer.question}${i.cbam ? ' (covered by EU CBAM)' : ''}`) },
    ],
  });

  const legalHub = staticRoute('/legal', 'legal', 0.3, {
    blocks: [{ ul: legalDocuments.map(d => `[${d.title}](/legal/${d.slug})`) }],
  });

  const toolsHub = staticRoute('/calculators', 'tool', 0.9, {
    blocks: [
      { p: STATIC_PAGE_META['/calculators'].description },
      { ul: Object.keys(STATIC_PAGE_META)
        .filter(p => p.startsWith('/calculators/'))
        .map(p => `[${STATIC_CONTENT[p]?.h1 ?? STATIC_PAGE_META[p].title}](${p})`)
        .concat('[CBAM cost calculator](/cbam-calculator)', '[CBAM cost per tonne by sector](/cbam-cost)', '[Emission factor library](/emission-factors)') },
      { h2: 'Free checks by service' },
      { ul: servicePages.map(sp => `[${sp.nav}](/${sp.slug})`) },
    ],
  });

  const trust = staticRoute('/trust', 'core', 0.8, {
    blocks: [
      { p: STATIC_PAGE_META['/trust'].description },
      { h2: 'How each safeguard works' },
      ...trustSafeguards.flatMap(sg => [{ h3: sg.title } as Block, { p: sg.summary } as Block, { ul: sg.points } as Block]),
    ],
  });

  const decarbonizeIndia = staticRoute(di.DI_PATH, 'core', 0.8, {
    h1: 'Decarbonize India: Impact Ambassador Program',
    changefreq: 'weekly',
    blocks: [
      ...di.story.map(line => ({ p: line } as Block)),
      { p: di.who },
      { h2: di.realFight.title },
      { p: `${di.realFight.habits.join(', ')}: ${di.realFight.habitsNote}` },
      { ul: di.realFight.sources },
      { h2: di.ownerSpeak.title },
      { ul: di.ownerSpeak.pairs.map(pair => `You say "${pair.say}". The owner hears "${pair.hear}".`) },
      { p: di.ownerSpeak.rule },
      { h2: 'Ambassador lanes' },
      { ul: di.lanes.map(l => `${l.label}: ${l.line}`) },
      { h2: di.sprint.title },
      { ul: [...di.sprint.wins, di.sprint.winsNote] },
      { h2: di.rewards.title },
      { ul: di.rewards.items.map(r => `${r.name}: ${r.line}`) },
      { p: di.quote },
      { h2: di.filter.title },
      { ul: di.filter.points },
      { h2: 'How to apply' },
      { ol: di.steps.map(st => `${st.title}. ${st.line}`) },
      { h2: di.session.title },
      { p: `${di.session.line} Send CLIMATE on WhatsApp to +91 77085 40931, or email a Program Coordinator: Palanisamy (palanisamy@senseible.earth) or Vatsalya Sai (vatsalya@senseible.earth).` },
      { h2: 'Questions' },
      ...di.faqs.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
    ],
    jsonLd: [
      breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Decarbonize India', path: di.DI_PATH }]),
      faqLd(di.faqs),
    ],
  });

  const simple: [string, RouteSection, number][] = [
    ['/platform', 'core', 0.9], ['/about', 'core', 0.6], ['/mission', 'core', 0.5],
    ['/principles', 'core', 0.5], ['/contact', 'core', 0.6], ['/carbon-credits', 'core', 0.8],
    ['/climate-finance', 'core', 0.8], ['/partners', 'core', 0.6], ['/grants', 'core', 0.4],
    ['/net-zero', 'tool', 0.7], ['/enterprise', 'core', 0.8], ['/cbam-calculator', 'tool', 0.9],
    ['/marketplace', 'core', 0.5], ['/intelligence', 'tool', 0.5],
    ...servicePages.map(sp => [`/${sp.slug}`, 'core', 0.8] as [string, RouteSection, number]),
    ['/scope-3-supplier-evidence', 'tool', 0.7], ['/msme-carbon-number', 'tool', 0.7],
  ];
  const calculators = Object.keys(STATIC_PAGE_META)
    .filter(p => p.startsWith('/calculators/'))
    .map(p => staticRoute(p, 'tool', 0.8, {
      breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Calculators', path: '/calculators' }, { name: STATIC_CONTENT[p]?.h1 ?? p, path: p }],
    }));

  return [
    home, pricing, careers, guidesHub, industriesHub, legalHub, toolsHub, trust, decarbonizeIndia,
    ...simple.map(([p, s, pr]) => withEntityPage(staticRoute(p, s, pr))),
    ...calculators,
  ];
}

function articleByline(path: string, date: string, updated: boolean): string {
  const review = PAGE_REVIEWS[path];
  const dated = `${updated ? 'Updated' : 'Published'} ${toIsoDate(date) ?? date}.`;
  return review
    ? `${dated} Reviewed by ${REVIEWERS[review.reviewer].name}, ${REVIEWERS[review.reviewer].role}, on ${review.reviewedOn}.`
    : dated;
}

function articleRoutes(): SeoRoute[] {
  return cmsArticles.map(a => {
    const meta = articleMeta(a);
    const path = `/climate-intelligence/${a.slug}`;
    const crumbs = [{ name: 'Home', path: '/' }, { name: 'Climate Intelligence', path: '/climate-intelligence' }, { name: a.title, path }];
    const related = relatedArticles(a.slug);
    return {
      path,
      section: 'guide' as const,
      ...meta,
      h1: a.title,
      blocks: [
        { p: articleByline(path, a.updatedAt ?? a.createdAt, !!a.updatedAt) },
        ...markdownToBlocks(a.content),
        ...(related.length ? [{ h2: 'Related guides' } as Block, { ul: related.map(r => `[${anchorFor(r)}](/climate-intelligence/${r.slug})`) } as Block] : []),
      ],
      breadcrumbs: crumbs,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: meta.description,
          datePublished: toIsoDate(a.createdAt),
          dateModified: toIsoDate(a.updatedAt ?? a.createdAt),
          author: ORG_REF,
          publisher: { ...ORG_REF, logo: ORGANIZATION.logo },
          mainEntityOfPage: canonicalUrl(path),
        },
        breadcrumbLd(crumbs),
        ...(extractFaqs(a.content).length ? [faqLd(extractFaqs(a.content))] : []),
      ],
      lastmod: toIsoDate(a.updatedAt ?? a.createdAt),
      priority: 0.6,
      changefreq: 'monthly' as const,
    };
  });
}

// Only link to pages that exist, so prerendered pages never point at a 404.
const articleBySlug = new Map(cmsArticles.map(a => [a.slug, a.title]));
const solutionBySlug = new Map(solutionPages.filter(s => s.indexed).map(s => [s.slug, s.title.replace(/\s*[—|-]\s*Senseible\s*$/i, '')]));
const PUBLIC_TOOL_PATHS = new Set(['/cbam-calculator', '/net-zero', '/calculators', ...Object.keys(STATIC_PAGE_META).filter(p => p.startsWith('/calculators/'))]);

function solutionRoutes(): SeoRoute[] {
  // Only reviewed, data-backed solution pages are indexed and prerendered.
  return solutionPages.filter(s => s.indexed).map(s => {
    const path = `/solutions/${s.slug}`;
    const h1 = s.title.replace(/\s*[—|-]\s*Senseible\s*$/i, '');
    const crumbs = [{ name: 'Home', path: '/' }, { name: h1, path }];
    return {
      path,
      section: 'solution' as const,
      ...solutionMeta(s),
      h1,
      blocks: [
        { p: s.painStatement },
        { h2: 'Steps' },
        { ol: s.steps.map(st => `**${st.title}:** ${st.description}`) },
        ...(s.costBreakdown.length ? [{ h2: 'At a glance' } as Block, { table: { head: ['Item', 'Value'], rows: s.costBreakdown.map(c => [c.item, c.value]) } } as Block] : []),
        ...(s.faqs.length ? [{ h2: 'Questions' } as Block, ...s.faqs.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block])] : []),
        { h2: 'Related' },
        { ul: [
          ...(PUBLIC_TOOL_PATHS.has(s.pillarLink) ? [`[Free tool](${s.pillarLink})`] : []),
          ...(industries.some(i => i.id === s.relatedIndustry) ? [`[Industry guide](/industries/${s.relatedIndustry})`] : []),
          ...(articleBySlug.has(s.relatedArticle) ? [`[${articleBySlug.get(s.relatedArticle)}](/climate-intelligence/${s.relatedArticle})`] : []),
          ...s.relatedSolutions.filter(r => solutionBySlug.has(r)).map(r => `[${solutionBySlug.get(r)}](/solutions/${r})`),
        ] },
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs), ...(s.faqs.length ? [faqLd(s.faqs)] : [])],
      priority: 0.6,
      changefreq: 'monthly' as const,
    };
  });
}

function competitorRoutes(): SeoRoute[] {
  return competitorData.map(c => {
    const path = `/vs/${c.slug}`;
    const h1 = `Senseible vs ${c.name}`;
    const crumbs = [{ name: 'Home', path: '/' }, { name: h1, path }];
    return {
      path,
      section: 'compare' as const,
      ...competitorMeta(c),
      h1,
      blocks: [
        { p: c.description },
        { table: { head: ['', c.name], rows: [['Headquarters', c.headquarters], ['Founded', c.founded], ['Target market', c.targetMarket], ['Pricing', c.pricing]] } },
        { h2: `${c.name} strengths` }, { ul: c.strengths },
        { h2: `${c.name} limitations` }, { ul: c.limitations },
        { h2: 'How Senseible differs' }, { p: c.senseibleAdvantage },
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs)],
      priority: c.category === 'disambiguation' ? 0.7 : 0.5,
      changefreq: 'monthly' as const,
    };
  });
}

function answerRoutes(): SeoRoute[] {
  const hubCrumbs = [{ name: 'Home', path: '/' }, { name: 'Answers', path: '/answers' }];
  const hub: SeoRoute = {
    path: '/answers', section: 'guide', ...STATIC_PAGE_META['/answers'], h1: 'Answers',
    blocks: (Object.keys(ANSWER_TOPICS) as (keyof typeof ANSWER_TOPICS)[]).flatMap(t => [
      { h2: ANSWER_TOPICS[t].label } as Block,
      { ul: answers.filter(a => a.topic === t).map(a => `[${a.q}](/answers/${a.slug})`) } as Block,
    ]),
    breadcrumbs: hubCrumbs, jsonLd: [breadcrumbLd(hubCrumbs), faqLd(answers.map(a => ({ question: a.q, answer: a.short })))],
    priority: 0.7, changefreq: 'monthly',
  };
  return [hub, ...answers.map(a => {
    const path = `/answers/${a.slug}`;
    const crumbs = [...hubCrumbs, { name: a.title, path }];
    return {
      path, section: 'guide' as const, ...answerMeta(a), h1: a.q,
      blocks: [
        { p: a.short } as Block,
        ...a.body.map(p => ({ p }) as Block),
        ...(a.links.length ? [{ ul: a.links.map(l => `[${l.label}](${l.to})`) } as Block] : []),
        ...(a.sources?.length ? [{ p: `Sources: ${a.sources.map(s => `[${s.label}](${s.url})`).join(', ')}` } as Block] : []),
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs), {
        '@context': 'https://schema.org', '@type': 'QAPage',
        mainEntity: { '@type': 'Question', name: a.q, answerCount: 1, acceptedAnswer: { '@type': 'Answer', text: [a.short, ...a.body].join(' ') } },
      }],
      priority: 0.6, changefreq: 'monthly' as const,
    };
  })];
}

function industryRoutes(): SeoRoute[] {
  return industries.map(i => {
    const path = `/industries/${i.id}`;
    const crumbs = [{ name: 'Home', path: '/' }, { name: 'Industries', path: '/industries' }, { name: i.name, path }];
    return {
      path,
      section: 'industry' as const,
      ...industryMeta(i),
      h1: `${i.name}: Carbon Accounting Guide`,
      blocks: [
        { p: i.description },
        { h2: `The question ${i.buyer.who.toLowerCase()}s ask` },
        { p: `“${i.buyer.question}”` },
        { p: i.cbam ? 'This sector is covered by EU CBAM (Regulation (EU) 2023/956). Since 1 January 2026, EU importers declare embedded emissions; without actual producer data, default values with a mark-up apply.' : 'This sector is not directly covered by EU CBAM. Buyers, lenders and OEMs ask for emissions built from documents for their own reporting.' },
        { h2: 'Scope 1 sources (evidence: fuel invoices)' }, { ul: i.scope1Sources },
        { h2: 'Scope 2 sources (evidence: electricity bills)' }, { ul: i.scope2Sources },
        { h2: 'Scope 3 sources (evidence: purchase and freight invoices)' }, { ul: i.scope3Sources },
        { h2: 'Worked example' },
        { p: `Illustrative monthly quantities: ${i.example.map(e => `${e.qty.toLocaleString('en-IN')} ${e.unit} of ${e.label.toLowerCase()}`).join(', ')}, multiplied by the emission factors Senseible uses and annualised. ${i.exampleNote}` },
        { h2: 'Where reductions usually start' }, { ul: i.reductionStrategies },
        { p: '[All industries](/industries) · [CBAM cost calculator](/cbam-calculator) · [Upload a bill](/)' },
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs)],
      priority: 0.6,
      changefreq: 'monthly' as const,
    };
  });
}

function factorRoutes(): SeoRoute[] {
  const hubCrumbs = [{ name: 'Home', path: '/' }, { name: 'Emission factors', path: FACTOR_HUB_PATH }];
  const hub: SeoRoute = {
    path: FACTOR_HUB_PATH, section: 'tool', ...FACTOR_HUB_META, h1: 'Emission factors for Indian invoices',
    blocks: [
      { p: FACTOR_HUB_ANSWER },
      { table: { head: ['Fuel or energy', 'Factor', 'HSN', 'Scope'], rows: FACTOR_PAGES.map(f => [`[${f.name}](${factorPath(f.slug)})`, `${f.value} kg CO2 per ${f.unit}`, f.hsn, String(f.scope)]) } },
      { p: '[CBAM cost per tonne by sector](/cbam-cost) · [All calculators](/calculators) · [Upload an invoice](/)' },
    ],
    breadcrumbs: hubCrumbs, jsonLd: [breadcrumbLd(hubCrumbs)], priority: 0.7, changefreq: 'monthly',
  };
  return [hub, ...FACTOR_PAGES.map(f => {
    const path = factorPath(f.slug);
    const crumbs = [...hubCrumbs, { name: f.name, path }];
    const faqs = factorFaqs(f);
    return {
      path, section: 'tool' as const, ...factorMeta(f), h1: `${f.name} emission factor (India): ${f.value} kg CO2 per ${f.unit}`,
      blocks: [
        { p: factorAnswer(f) },
        { table: { head: ['Factor', 'Scope', 'HSN heading', 'On invoices as'], rows: [[`${f.value} kg CO2 per ${f.unit}`, `Scope ${f.scope}`, `${f.hsn} (${f.hsnLabel})`, f.invoiceTerms]] } },
        { h2: 'How the factor is derived' }, { p: f.basis }, ...(f.caveat ? [{ p: f.caveat } as Block] : []),
        { h2: 'Questions' }, ...faqs.flatMap(q => [{ h3: q.question } as Block, { p: q.answer } as Block]),
        { p: `[All emission factors](${FACTOR_HUB_PATH}) · [Upload an invoice](/)` },
      ],
      breadcrumbs: crumbs, jsonLd: [breadcrumbLd(crumbs), faqLd(faqs)], priority: 0.6, changefreq: 'monthly' as const,
    };
  })];
}

function cbamCostRoutes(): SeoRoute[] {
  const hubCrumbs = [{ name: 'Home', path: '/' }, { name: 'CBAM cost by sector', path: CBAM_HUB_PATH }];
  const eur = (n: number) => `€${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const hub: SeoRoute = {
    path: CBAM_HUB_PATH, section: 'tool', ...CBAM_HUB_META, h1: 'CBAM cost per tonne by sector',
    blocks: [
      { p: CBAM_HUB_ANSWER },
      { table: { head: ['Sector (default route)', '2026', '2030', '2034'], rows: CBAM_SECTOR_COSTS.map(s => [`[${s.sector.name}](${sectorHref(s.sector.id)}) (${s.headline.routeName})`, eur(s.headline.perTonne[2026]), eur(s.headline.perTonne[2030]), eur(s.headline.perTonne[2034])]) } },
      { p: `€ per tonne of product, EU default values, certificate price ${eur(CBAM_PRICE)}, origin India. [CBAM calculator](/cbam-calculator) · [Emission factors](/emission-factors)` },
    ],
    breadcrumbs: hubCrumbs, jsonLd: [breadcrumbLd(hubCrumbs)], priority: 0.7, changefreq: 'monthly',
  };
  return [hub, ...CBAM_SECTOR_PAGES.map(s => {
    const path = cbamSectorPath(s.sector.id);
    const crumbs = [...hubCrumbs, { name: s.sector.name, path }];
    const faqs = cbamFaqs(s);
    return {
      path, section: 'tool' as const, ...cbamSectorMeta(s), h1: `CBAM cost per tonne of ${s.sector.name.toLowerCase()}, 2026 to 2034`,
      blocks: [
        { p: cbamAnswer(s) },
        { h2: 'Cost per tonne by year (€)' },
        { table: { head: ['Route', ...CBAM_YEARS.map(String)], rows: s.routes.map(r => [`${r.routeName} (${r.intensity} tCO2/t default)`, ...CBAM_YEARS.map(y => r.perTonne[y].toLocaleString('en-IN', { maximumFractionDigits: 0 }))]) } },
        { p: `Assumptions: EU default values with the default-value mark-up, certificate price held at ${eur(CBAM_PRICE)} (Q3 2026), origin India with no carbon price paid at origin. Estimates, not a CBAM declaration.` },
        { h2: 'Covered CN codes' }, { ul: s.sector.cnCodes.map(c => `${c.code}: ${c.description}`) },
        { h2: 'Questions' }, ...faqs.flatMap(q => [{ h3: q.question } as Block, { p: q.answer } as Block]),
        { p: `[CBAM calculator](/cbam-calculator) · [All sectors](${CBAM_HUB_PATH})` },
      ],
      breadcrumbs: crumbs, jsonLd: [breadcrumbLd(crumbs), faqLd(faqs)], priority: 0.6, changefreq: 'monthly' as const,
    };
  })];
}

function legalRoutes(): SeoRoute[] {
  return legalDocuments.map(d => {
    const path = `/legal/${d.slug}`;
    const crumbs = [{ name: 'Home', path: '/' }, { name: 'Legal', path: '/legal' }, { name: d.title, path }];
    return {
      path,
      section: 'legal' as const,
      ...legalMeta(d),
      h1: d.title,
      blocks: [
        { p: `Effective ${d.effectiveDate}. Last updated ${d.lastUpdated}.` },
        ...d.sections.flatMap(sec => [{ h2: sec.title } as Block, ...markdownToBlocks(sec.content)]),
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs)],
      lastmod: toIsoDate(d.lastUpdated),
      priority: 0.2,
      changefreq: 'yearly' as const,
    };
  });
}

export function getSeoRoutes(): SeoRoute[] {
  return [
    ...coreRoutes(),
    ...articleRoutes(),
    ...solutionRoutes(),
    ...competitorRoutes(),
    ...industryRoutes(),
    ...answerRoutes(),
    ...factorRoutes(),
    ...cbamCostRoutes(),
    ...legalRoutes(),
  ];
}

export interface SeoRedirect {
  from: string;
  to: string;
}

/** Retired URLs. Rendered as redirect pages, never listed in the sitemap. */
export function getRedirects(): SeoRedirect[] {
  return Object.entries(articleRedirects).map(([slug, to]) => ({ from: `/climate-intelligence/${slug}`, to }));
}

/** Live pages that render with noindex (reachable, linkable, not in the sitemap). */
export function getNoIndexPaths(): string[] {
  return solutionPages.filter(s => !s.indexed).map(s => `/solutions/${s.slug}`);
}
