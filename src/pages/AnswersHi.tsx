import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { canonicalUrl, clampDescription, fitTitle, hreflangFor, HI_PAGES_REVIEWED } from '@/lib/seo/seoMeta';
import { loadHindiAnswer } from '@/lib/answerDataHi';
import type { AnswerPageData } from '@/lib/answerData';

const LibraryArticle = lazy(() => import('@/components/answers/LibraryArticle'));

// Hindi edition of an answer page (/hi/answers/:slug). Same layout and facts
// as the English page; noindex until the native review (HI_PAGES_REVIEWED).
const AnswersHi = () => {
  const { slug = '' } = useParams();
  const [data, setData] = useState<AnswerPageData | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setData(undefined);
    window.scrollTo({ top: 0 });
    void loadHindiAnswer(slug).then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [slug]);
  const path = `/hi/answers/${slug}`;
  const page = data?.page;

  return (
    <div className="min-h-screen bg-background" lang="hi">
      <Helmet htmlAttributes={{ lang: 'hi' }}>
        <title>{page ? fitTitle(page.title) : 'Senseible'}</title>
        {page && <meta name="description" content={clampDescription(page.short)} />}
        <meta property="og:locale" content="hi_IN" />
        <link rel="canonical" href={canonicalUrl(page ? path : `/answers/${slug}`)} />
        {(!HI_PAGES_REVIEWED || data === null) && <meta name="robots" content="noindex, nofollow" />}
        {hreflangFor(path).map((a) => <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={canonicalUrl(a.path)} />)}
      </Helmet>
      <Navigation />
      <main className="overflow-x-clip pt-16">
        {data ? (
          <Suspense fallback={<div className="min-h-[60vh]" />}><LibraryArticle key={data.page.slug} data={data} locale="hi" /></Suspense>
        ) : data === null ? (
          <div className="container mx-auto max-w-2xl px-5 py-24 text-center">
            <p className="text-lg">यह पेज अभी हिन्दी में नहीं है।</p>
            <a href={`/answers/${slug}`} className="mt-4 inline-block text-primary underline underline-offset-2">Read in English</a>
          </div>
        ) : (
          <div className="min-h-[60vh]" aria-busy="true" />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AnswersHi;
