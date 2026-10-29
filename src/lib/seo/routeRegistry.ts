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
import { answerLibraryAll } from '@/data/answerLibraryAll';
import { LIBRARY_TOPICS, type LibraryAnswer, type LibraryTopic } from '@/data/answerLibraryTypes';
import { legalDocuments } from '@/data/legalContent';
import { careersRoles } from '@/data/careersRoles';
import { trustSafeguards } from '@/data/trustSafeguards';
import { articleRedirects } from '@/data/articleRedirects';
import * as di from '@/data/decarbonizeIndia';
import { WP_PATH, WP_PUBLISHED } from '@/data/whitePaper';
import * as ICD from '@/data/indiaClimateData';
import { ESG_SAMPLE_META, ESG_SAMPLE_OBJECTIONS } from '@/data/esgReportSample';
import { ORGANIZATION, ORG_REF, entityJsonLd } from './entity';
import { HELP_ARTICLES, HELP_SECTIONS } from '../../../supabase/functions/_shared/helpArticles';
import { fillContacts } from '../../../supabase/functions/_shared/publicContacts';
import { TIER_PRICES } from '@/lib/pricing/pricingMath';
import { HELP_HUB_META, helpArticleMeta } from '@/lib/help/meta';
import { FACTOR_HUB_ANSWER, FACTOR_HUB_META, FACTOR_HUB_PATH, FACTOR_PAGES, factorAnswer, factorFaqs, factorMeta, factorPath } from '@/data/factorLibrary';
import { TEMPLATES, TEMPLATES_META, TEMPLATES_PATH, templatePath } from '@/data/templates';
import { CBAM_HUB_ANSWER, CBAM_HUB_META, CBAM_HUB_PATH, CBAM_PRICE, CBAM_SECTOR_COSTS, CBAM_YEARS, cbamAnswer, cbamFaqs, cbamSectorMeta, cbamSectorPath, CBAM_SECTOR_PAGES, sectorHref } from '@/data/cbamSectorCosts';
import {
  STATIC_PAGE_META,
  SITE_URL,
  fitTitle,
  clampDescription,
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
import { DE_PAGES_REVIEWED, DE_PATHS } from './dePages';
import { HI_PAGES_REVIEWED, HI_PATHS, hindiPath } from './hiPages';
import { HINDI_ANSWERS } from '@/data/answerLibraryHi';
import { DATA_PACK, DE_META, KOSTEN_FAQ } from '@/data/de/cbamDe';
import { CCI_FAQS, CCI_PATH } from '@/data/carbonCreditsIndia';
import { CBAM_INDIA_FAQS, CBAM_INDIA_PATH } from '@/data/cbamIndia';
import { CBAM_DECLARANT_FAQS, CBAM_DECLARANT_PATH } from '@/data/cbamDeclarant';
import { BRSR_FAQS, BRSR_HUB_PATH } from '@/data/brsrHub';

export * from './seoMeta';
export { blocksToHtml, blocksToMarkdown, escapeHtml } from './render';

export type RouteSection = 'core' | 'tool' | 'guide' | 'solution' | 'compare' | 'industry' | 'legal';

export interface SeoRoute {
  path: string;
  section: RouteSection;
  /** og:type; defaults to "article" for guides and "website" otherwise. */
  ogType?: 'website' | 'article';
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
  /** Page language; omitted means English. */
  lang?: 'de' | 'hi';
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
    // Prices come from the pricing code and are before GST, as the page says.
    offers: [
      { '@type': 'Offer', name: 'Biocog Snapshot', price: '0', priceCurrency: 'INR', url: `${SITE_URL}/pricing` },
      ...(['essential', 'pro'] as const).flatMap(tier => (['yearly', 'monthly'] as const).map(cycle => {
        const price = String(cycle === 'yearly' ? TIER_PRICES[tier].yearly * 12 : TIER_PRICES[tier].monthly);
        return {
          '@type': 'Offer', name: `Biocog ${tier === 'pro' ? 'Pro' : 'Essential'} (${cycle})`, price, priceCurrency: 'INR', url: `${SITE_URL}/pricing`,
          priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'INR', valueAddedTaxIncluded: false, billingDuration: cycle === 'yearly' ? 'P1Y' : 'P1M' },
        };
      })),
    ],
  });

  // CBAM Suite: public product pages; the app itself keeps data on the device.
  const cbamApp = (path: string, name: string) => {
    const crumbs = path === '/cbam-suite' ? null : [{ name: 'Home', path: '/' }, { name: 'CBAM Suite', path: '/cbam-suite' }, { name: STATIC_CONTENT[path]?.h1 ?? path, path }];
    const r = staticRoute(path, 'tool', path === '/cbam-suite' ? 0.9 : 0.8, crumbs ? { breadcrumbs: crumbs, jsonLd: [breadcrumbLd(crumbs)] } : {});
    r.jsonLd.push({
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name, applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
      url: `${SITE_URL}${path}`, description: STATIC_PAGE_META[path].description, publisher: ORG_REF,
    });
    return r;
  };
  const cbamSuite = cbamApp('/cbam-suite', 'Senseible CBAM Suite');
  const cbamSupplierPack = cbamApp('/cbam-suite/supplier-pack', 'Senseible CBAM Supplier Data Pack');

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

  const wpCrumbs = [{ name: 'Home', path: '/' }, { name: 'White Paper', path: WP_PATH }];
  const whitePaper = staticRoute(WP_PATH, 'core', 0.7, {
    breadcrumbs: wpCrumbs,
    lastmod: WP_PUBLISHED,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: STATIC_PAGE_META[WP_PATH].title,
        description: STATIC_PAGE_META[WP_PATH].description,
        datePublished: WP_PUBLISHED,
        dateModified: WP_PUBLISHED,
        author: ORG_REF,
        publisher: { ...ORG_REF, logo: ORGANIZATION.logo },
        mainEntityOfPage: canonicalUrl(WP_PATH),
        about: ['Greenhouse gas accounting', 'Emission factors', 'Measurement uncertainty', 'Audit trail'],
        proficiencyLevel: 'Expert',
      },
      breadcrumbLd(wpCrumbs),
    ],
  });

  const icdCrumbs = [{ name: 'Home', path: '/' }, { name: 'India climate data', path: ICD.DATA_PATH }];
  const indiaClimateData = staticRoute(ICD.DATA_PATH, 'core', 0.8, {
    breadcrumbs: icdCrumbs,
    lastmod: ICD.DATA_UPDATED,
    jsonLd: [
      ...ICD.DATASETS.map(d => ({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: d.name,
        description: d.description,
        url: `${canonicalUrl(ICD.DATA_PATH)}#${d.id}`,
        creator: ORG_REF,
        publisher: ORG_REF,
        dateModified: ICD.DATA_UPDATED,
        isAccessibleForFree: true,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        ...(d.temporal ? { temporalCoverage: d.temporal } : {}),
        spatialCoverage: { '@type': 'Place', name: 'India' },
        isBasedOn: d.sources.map(s => s.url),
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${canonicalUrl(ICD.DATA_PATH)}#${d.id}` }],
      })),
      breadcrumbLd(icdCrumbs),
    ],
  });

  const esgCrumbs = [{ name: 'Home', path: '/' }, { name: 'Sample ESG report', path: ESG_SAMPLE_META.path }];
  const esgReportSample = staticRoute(ESG_SAMPLE_META.path, 'core', 0.7, {
    breadcrumbs: esgCrumbs,
    lastmod: ESG_SAMPLE_META.published,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Report',
        name: 'Senseible Sample ESG Report 2026',
        description: STATIC_PAGE_META[ESG_SAMPLE_META.path].description,
        datePublished: ESG_SAMPLE_META.published,
        numberOfPages: 64,
        inLanguage: 'en',
        author: ORG_REF,
        publisher: { ...ORG_REF, logo: ORGANIZATION.logo },
        image: canonicalUrl('/resources/esg-report-sample/cover.webp'),
        mainEntityOfPage: canonicalUrl(ESG_SAMPLE_META.path),
        about: ['ESG reporting', 'GRI Standards', 'BRSR Core', 'TCFD', 'Greenhouse gas inventory'],
        isAccessibleForFree: true,
      },
      faqLd(ESG_SAMPLE_OBJECTIONS.map(o => ({ question: o.q, answer: `${o.verdict} ${o.a}` }))),
      breadcrumbLd(esgCrumbs),
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
      { p: `${di.session.line} Send CLIMATE on WhatsApp or email a Program Coordinator. The number and coordinator emails are on the live page.` },
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
    ['/net-zero', 'tool', 0.7], ['/enterprise', 'core', 0.8], ['/enterprise/pricing', 'core', 0.7], ['/cbam-calculator', 'tool', 0.9],
    ['/marketplace', 'core', 0.5], ['/intelligence', 'tool', 0.5],
    ...servicePages.map(sp => [`/${sp.slug}`, 'core', 0.8] as [string, RouteSection, number]),
    ['/scope-3-supplier-evidence', 'tool', 0.7], ['/msme-carbon-number', 'tool', 0.7], ['/green-loan-check', 'tool', 0.7],
    ['/carbon-accounting-software-india', 'tool', 0.7],
  ];
  const calculators = Object.keys(STATIC_PAGE_META)
    .filter(p => p.startsWith('/calculators/'))
    .map(p => staticRoute(p, 'tool', 0.8, {
      breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Calculators', path: '/calculators' }, { name: STATIC_CONTENT[p]?.h1 ?? p, path: p }],
    }));

  const cciCrumbs = [{ name: 'Home', path: '/' }, { name: 'Carbon credits in India', path: CCI_PATH }];
  const cbamIndia = staticRoute(CBAM_INDIA_PATH, 'core', 0.9, { jsonLd: [breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'CBAM for Indian exporters', path: CBAM_INDIA_PATH }]), faqLd(CBAM_INDIA_FAQS)] });
  const declarantCrumbs = [{ name: 'Home', path: '/' }, { name: 'CBAM for Indian exporters', path: CBAM_INDIA_PATH }, { name: 'Authorised CBAM declarant', path: CBAM_DECLARANT_PATH }];
  const cbamDeclarant = staticRoute(CBAM_DECLARANT_PATH, 'core', 0.8, { breadcrumbs: declarantCrumbs, jsonLd: [breadcrumbLd(declarantCrumbs), faqLd(CBAM_DECLARANT_FAQS)] });
  const carbonCreditsIndia = staticRoute(CCI_PATH, 'core', 0.8, { jsonLd: [breadcrumbLd(cciCrumbs), faqLd(CCI_FAQS)] });
  const brsrCrumbs = [{ name: 'Home', path: '/' }, { name: 'BRSR reporting', path: BRSR_HUB_PATH }];
  const brsrHub = staticRoute(BRSR_HUB_PATH, 'core', 0.8, { breadcrumbs: brsrCrumbs, jsonLd: [breadcrumbLd(brsrCrumbs), faqLd(BRSR_FAQS)] });

  return [
    home, pricing, careers, cbamSuite, cbamSupplierPack, guidesHub, cbamIndia, cbamDeclarant, carbonCreditsIndia, brsrHub, industriesHub, legalHub, toolsHub, trust, decarbonizeIndia, whitePaper, esgReportSample, indiaClimateData,
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
    path: '/answers', section: 'guide', ogType: 'website', ...STATIC_PAGE_META['/answers'], h1: 'Answers',
    blocks: (Object.keys(ANSWER_TOPICS) as (keyof typeof ANSWER_TOPICS)[]).flatMap(t => [
      { h2: ANSWER_TOPICS[t].label } as Block,
      { ul: answers.filter(a => a.topic === t).map(a => `[${a.q}](/answers/${a.slug})`) } as Block,
    ]).concat((Object.keys(LIBRARY_TOPICS) as LibraryTopic[]).flatMap(t => {
      const group = answerLibraryAll.filter(a => a.topic === t);
      return group.length ? [{ h2: LIBRARY_TOPICS[t].label } as Block, ...(t === 'regulation' ? [{ p: `If BRSR is new to you, start with [BRSR and BRSR Core in plain words](${BRSR_HUB_PATH}).` } as Block] : []), { ul: group.map(a => `[${a.q}](/answers/${a.slug})`) } as Block] : [];
    })),
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
      jsonLd: [breadcrumbLd(crumbs), ...answerJsonLd({ path, question: a.q, answer: [a.short, ...a.body].join(' '), description: a.short })],
      priority: 0.6, changefreq: 'monthly' as const,
    };
  }), ...answerLibraryAll.map(a => libraryRoute(a, hubCrumbs))];
}

/** A reviewed date (YYYY-MM-DD) as a full date-time in India time: Google rejects date-only values here. */
export const istDateTime = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+05:30` : undefined);

/**
 * Senseible writes these answers itself, so each page is an Article with a
 * one-question FAQ. QAPage is only for pages where users post answers, and
 * Search Console flags it here for forum fields (votes, answer URLs) that
 * owner-written pages cannot honestly carry.
 */
export function answerJsonLd(o: { path: string; question: string; answer: string; description?: string; reviewed?: string; citations?: string[]; lang?: string }) {
  const when = istDateTime(o.reviewed);
  const lang = o.lang ? { inLanguage: o.lang } : {};
  return [
    {
      '@context': 'https://schema.org', '@type': 'Article', ...lang,
      headline: o.question.length > 110 ? `${o.question.slice(0, 107).trimEnd()}...` : o.question,
      ...(o.description ? { description: o.description } : {}),
      author: ORG_REF, publisher: { ...ORG_REF, logo: ORGANIZATION.logo },
      mainEntityOfPage: canonicalUrl(o.path),
      ...(when ? { datePublished: when, dateModified: when } : {}),
      ...(o.citations?.length ? { citation: o.citations } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage', ...lang,
      mainEntity: [{ '@type': 'Question', name: o.question, acceptedAnswer: { '@type': 'Answer', text: o.answer } }],
    },
  ];
}

/** One answer library page: sections, worked example, what Senseible does, links and sources. */
export function libraryBlocks(a: LibraryAnswer): Block[] {
  return [
    { p: a.short },
    ...a.sections.flatMap(s => [
      { h2: s.h } as Block,
      ...(s.p ?? []).map(p => ({ p }) as Block),
      ...(s.ul?.length ? [{ ul: s.ul } as Block] : []),
      ...(s.ol?.length ? [{ ol: s.ol } as Block] : []),
    ]),
    ...(a.example ? [{ h2: a.example.title } as Block, { ul: a.example.lines } as Block, ...(a.example.note ? [{ p: a.example.note } as Block] : [])] : []),
    { h2: 'What Senseible does here' }, { p: a.senseible },
    { ul: a.links.map(l => `[${l.label}](${l.to})`) },
    { p: `Sources: ${a.sources.map(s => `[${s.label}](${s.url})`).join(', ')}` },
    { p: `Last reviewed ${a.reviewed}.${a.reviewNote ? ` ${a.reviewNote}` : ''}` },
  ];
}

function libraryRoute(a: LibraryAnswer, hubCrumbs: { name: string; path: string }[]): SeoRoute {
  const path = `/answers/${a.slug}`;
  const crumbs = [...hubCrumbs, { name: a.title, path }];
  const text = [a.short, ...a.sections.flatMap(s => [...(s.p ?? []), ...(s.ul ?? []), ...(s.ol ?? [])])].join(' ');
  return {
    path, section: 'guide', ...answerMeta(a), h1: a.q,
    blocks: libraryBlocks(a),
    breadcrumbs: crumbs,
    jsonLd: [breadcrumbLd(crumbs), ...answerJsonLd({ path, question: a.q, answer: text, description: a.short, reviewed: a.reviewed, citations: a.sources.map(s => s.url) })],
    lastmod: a.reviewed, priority: 0.6, changefreq: 'monthly',
  };
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

function templateRoutes(): SeoRoute[] {
  const hubCrumbs = [{ name: 'Home', path: '/' }, { name: 'Templates', path: TEMPLATES_PATH }];
  const hub: SeoRoute = {
    path: TEMPLATES_PATH, section: 'tool', ...TEMPLATES_META, h1: 'The ESG forms your customers send, already laid out.',
    blocks: [
      { p: 'Four free templates for Indian MSMEs and the companies that buy from them. Preview every field, then download. No sign-up.' },
      { ul: TEMPLATES.map(t => `[${t.name}](${templatePath(t.slug)}): ${t.whoFor}`) },
      { p: '[Emission factors](/emission-factors) · [All calculators](/calculators) · [Upload a bill](/)' },
    ],
    breadcrumbs: hubCrumbs, jsonLd: [breadcrumbLd(hubCrumbs)], priority: 0.8, changefreq: 'monthly',
  };
  return [hub, ...TEMPLATES.map(t => {
    const path = templatePath(t.slug);
    const crumbs = [...hubCrumbs, { name: t.name, path }];
    return {
      path, section: 'tool' as const, title: t.title, description: t.description, h1: t.h1,
      blocks: [
        { p: t.answer },
        { p: `**For:** ${t.whoFor} **Saves you:** ${t.saves}` },
        ...t.sections.flatMap(s => [{ h2: s.name } as Block, { table: { head: ['Field', 'Example', 'How to fill it'], rows: s.fields.map(f => [f.label, f.example, f.hint ?? '']) } } as Block]),
        { h2: 'How to use it' },
        { ol: t.steps.map(s => `**${s.title}:** ${s.text}`) },
        { p: `[All templates](${TEMPLATES_PATH}) · [Upload a bill](/)` },
      ],
      breadcrumbs: crumbs,
      jsonLd: [
        breadcrumbLd(crumbs),
        {
          '@context': 'https://schema.org', '@type': 'HowTo', name: `How to use the ${t.name.toLowerCase()}`,
          tool: [{ '@type': 'HowToTool', name: t.fileName }],
          step: t.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text })),
        },
      ],
      priority: 0.7, changefreq: 'monthly' as const,
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

function helpRoutes(): SeoRoute[] {
  const hubCrumbs = [{ name: 'Home', path: '/' }, { name: 'Help Center', path: '/help' }];
  const hub: SeoRoute = {
    path: '/help', section: 'core', ogType: 'website', ...HELP_HUB_META, h1: 'How can we help?',
    blocks: [
      { p: 'Ask the way you’d say it, or pick a topic.' },
      ...HELP_SECTIONS.flatMap(s => [
        { h2: s.title } as Block,
        { ul: HELP_ARTICLES.filter(a => a.section === s.id).map(a => `[${a.q}](/help/${a.slug}): ${a.a}`) } as Block,
      ]),
      { p: 'Still stuck? [Message us](/contact).' },
    ],
    breadcrumbs: hubCrumbs,
    jsonLd: [breadcrumbLd(hubCrumbs), faqLd(HELP_ARTICLES.map(a => ({ question: a.q, answer: a.a })))],
    priority: 0.6, changefreq: 'monthly',
  };
  return [hub, ...HELP_ARTICLES.map(a => {
    const path = `/help/${a.slug}`;
    const crumbs = [...hubCrumbs, { name: a.q, path }];
    return {
      path, section: 'guide' as const, ...helpArticleMeta(a), h1: a.q,
      blocks: [
        { p: a.a } as Block,
        ...(a.facts?.length ? [{ ul: a.facts.map(([k, v]) => `${k}: ${v}`) } as Block] : []),
        ...(a.steps?.length ? [{ ol: a.steps } as Block] : []),
        ...(a.cta ? [{ p: `[${a.cta.label}](${a.cta.to})` } as Block] : []),
        { p: '[All help topics](/help) · [Message us](/contact)' } as Block,
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs), faqLd([{ question: a.q, answer: [a.a, ...(a.steps ?? [])].join(' ') }])],
      priority: 0.5, changefreq: 'monthly' as const,
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
        ...d.sections.flatMap(sec => [{ h2: sec.title } as Block, ...markdownToBlocks(fillContacts(sec.content, 'static'))]),
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs)],
      lastmod: toIsoDate(d.lastUpdated),
      priority: 0.2,
      changefreq: 'yearly' as const,
    };
  });
}

// German CBAM pages: prerendered and listed only after the native review
// (DE_PAGES_REVIEWED in ./dePages). Until then they are noindex app routes.
function germanRoutes(): SeoRoute[] {
  if (!DE_PAGES_REVIEWED) return [];
  const blocks: Record<string, Block[]> = {
    '/de/cbam-kosten': [
      { p: 'Seit Januar 2026 kostet jede Tonne Stahl, Aluminium, Zement oder Dünger aus Indien CBAM-Zertifikate. Wie viele, entscheidet vor allem der Emissionswert, den Ihr Lieferant liefert.' },
      { h2: 'Häufige Fragen' },
      ...KOSTEN_FAQ.flatMap(f => [{ h3: f.question } as Block, { p: f.answer } as Block]),
      { p: '[CBAM-Rechner](/de/cbam-rechner) · [Daten vom indischen Lieferanten](/de/cbam-indische-lieferanten)' },
    ],
    '/de/cbam-rechner': [
      { p: 'Zertifikatskosten je Einfuhrjahr, 2026 bis 2034, für Stahl, Aluminium, Zement, Düngemittel und Wasserstoff aus Indien, mit Standardwert oder geprüftem Ist-Wert.' },
      { p: '[Was CBAM kostet](/de/cbam-kosten) · [English calculator](/cbam-calculator)' },
    ],
    '/de/cbam-indische-lieferanten': [
      { p: 'Ohne diese Angaben rechnen Sie mit Standardwerten plus Aufschlag.' },
      { ul: DATA_PACK.map(d => d.label) },
      { p: '[CBAM-Rechner](/de/cbam-rechner) · [Was CBAM kostet](/de/cbam-kosten)' },
    ],
  };
  return DE_PATHS.map(path => {
    const m = DE_META[path];
    const crumbs = [{ name: 'Senseible', path: '/' }, { name: m.h1, path }];
    return {
      path, section: 'tool' as const, lang: 'de' as const,
      title: fitTitle(m.title), description: m.description, h1: m.h1,
      blocks: blocks[path], breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs), ...(path === '/de/cbam-kosten' ? [{ ...faqLd(KOSTEN_FAQ), inLanguage: 'de' }] : [])],
      priority: 0.7, changefreq: 'monthly' as const,
    };
  });
}

// Hindi answer pages: prerendered and listed only after the native review
// (HI_PAGES_REVIEWED in ./hiPages). Until then they are noindex app routes.
// Facts, sources and the review date come from the English page; only the
// reader-facing text is Hindi.
function hindiRoutes(): SeoRoute[] {
  if (!HI_PAGES_REVIEWED) return [];
  const english = new Map(answerLibraryAll.map(a => [a.slug, a]));
  return HINDI_ANSWERS.flatMap(h => {
    const en = english.get(h.slug);
    if (!en) return [];
    const a: LibraryAnswer = { ...en, q: h.q, title: h.title, short: h.short, sections: h.sections, example: h.example, senseible: h.senseible, links: h.links, reviewNote: h.reviewNote ?? en.reviewNote };
    const path = hindiPath(h.slug);
    const crumbs = [{ name: 'Senseible', path: '/' }, { name: 'जवाब', path: '/answers' }, { name: a.title, path }];
    const text = [a.short, ...a.sections.flatMap(s => [...(s.p ?? []), ...(s.ul ?? []), ...(s.ol ?? [])])].join(' ');
    return [{
      path, section: 'guide' as const, lang: 'hi' as const,
      title: fitTitle(a.title), description: clampDescription(a.short), h1: a.q,
      blocks: [
        { p: a.short } as Block,
        ...a.sections.flatMap(s => [
          { h2: s.h } as Block,
          ...(s.p ?? []).map(p => ({ p }) as Block),
          ...(s.ul?.length ? [{ ul: s.ul } as Block] : []),
          ...(s.ol?.length ? [{ ol: s.ol } as Block] : []),
        ]),
        ...(a.example ? [{ h2: a.example.title } as Block, { ul: a.example.lines } as Block, ...(a.example.note ? [{ p: a.example.note } as Block] : [])] : []),
        { h2: 'Senseible यहाँ क्या करता है' } as Block, { p: a.senseible } as Block,
        { ul: a.links.map(l => `[${l.label}](${l.to})`) } as Block,
        { p: `स्रोत: ${a.sources.map(s => `[${s.label}](${s.url})`).join(', ')}` } as Block,
        { p: `[Read in English](/answers/${a.slug})` } as Block,
      ],
      breadcrumbs: crumbs,
      jsonLd: [breadcrumbLd(crumbs), ...answerJsonLd({ path, question: a.q, answer: text, description: a.short, reviewed: a.reviewed, citations: a.sources.map(s => s.url), lang: 'hi' })],
      lastmod: a.reviewed, priority: 0.5, changefreq: 'monthly' as const,
    }];
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
    ...helpRoutes(),
    ...factorRoutes(),
    ...templateRoutes(),
    ...cbamCostRoutes(),
    ...legalRoutes(),
    ...germanRoutes(),
    ...hindiRoutes(),
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
  return [
    ...solutionPages.filter(s => !s.indexed).map(s => `/solutions/${s.slug}`),
    ...(DE_PAGES_REVIEWED ? [] : DE_PATHS),
    ...(HI_PAGES_REVIEWED ? [] : HI_PATHS),
  ];
}
