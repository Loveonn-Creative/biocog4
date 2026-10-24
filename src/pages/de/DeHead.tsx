import { Helmet } from "react-helmet-async";
import { canonicalUrl, DE_PAGES_REVIEWED, fitTitle, hreflangFor } from "@/lib/seo/seoMeta";
import { DE_META } from "@/data/de/cbamDe";

/**
 * Head for the German pages: lang="de", German title and description, and,
 * until a native review (DE_PAGES_REVIEWED), noindex with no hreflang pairs.
 */
export function DeHead({ path, faq }: { path: string; faq?: { question: string; answer: string }[] }) {
  const meta = DE_META[path];
  const alternates = hreflangFor(path);
  return (
    <Helmet htmlAttributes={{ lang: "de" }}>
      <title>{fitTitle(meta.title)}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={fitTitle(meta.title)} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:locale" content="de_DE" />
      <link rel="canonical" href={canonicalUrl(path)} />
      {!DE_PAGES_REVIEWED && <meta name="robots" content="noindex, nofollow" />}
      {alternates.map((a) => <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={canonicalUrl(a.path)} />)}
      {faq && DE_PAGES_REVIEWED && (
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "de",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
        })}</script>
      )}
    </Helmet>
  );
}

const de = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const de2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (n: number) => `${de.format(Math.round(n))} €`;
export const eur2 = (n: number) => `${de2.format(n)} €`;
export const num = (n: number, d = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
