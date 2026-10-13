import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  CANONICAL_ALIASES,
  canonicalPath,
  canonicalUrl,
  fitTitle,
  isNoIndexPath,
  pageMeta,
} from "@/lib/seo/seoMeta";
import { entityJsonLd } from "@/lib/seo/entity";

/**
 * Route-level SEO defaults. Mounted once inside the router, before any page,
 * so a page's own SEOHead/Helmet still takes precedence. Guarantees every route
 * has exactly one self-referencing canonical and that signed-in or
 * transactional routes are never indexed.
 */
export const RouteSEO = () => {
  const { pathname } = useLocation();
  const path = canonicalPath(pathname);
  const href = canonicalUrl(CANONICAL_ALIASES[path] ?? path);
  const meta = pageMeta(path);
  const noIndex = isNoIndexPath(path);
  const entity = entityJsonLd(path);

  return (
    <Helmet>
      {meta && <title>{fitTitle(meta.title)}</title>}
      {meta && <meta name="description" content={meta.description} />}
      {meta && <meta property="og:title" content={fitTitle(meta.title)} />}
      {meta && <meta property="og:description" content={meta.description} />}
      <link rel="canonical" href={href} />
      <meta property="og:url" content={href} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {entity.map(node => (
        <script key={String(node['@id'])} type="application/ld+json">{JSON.stringify(node)}</script>
      ))}
    </Helmet>
  );
};
