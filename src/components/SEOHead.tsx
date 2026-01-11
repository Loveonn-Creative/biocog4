import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  image?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
  noIndex?: boolean;
}

export const SEOHead = ({
  title,
  description,
  canonical,
  type = 'website',
  image = 'https://senseible.earth/og-image.png',
  article,
  noIndex = false,
}: SEOHeadProps) => {
  const fullTitle = title.includes('Senseible') ? title : `${title} | Senseible`;
  const siteUrl = 'https://senseible.earth';
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : undefined;

  // Organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Senseible",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "AI-driven carbon infrastructure converting MSME operational data into verified, regulation-ready carbon outcomes across India and the EU.",
    "areaServed": ["India", "European Union", "Southeast Asia", "Middle East"],
    "knowsAbout": [
      "Carbon MRV",
      "Carbon Accounting",
      "Carbon Credits",
      "CBAM",
      "ESG Compliance",
      "Green Finance"
    ],
    "sameAs": [
      "https://www.linkedin.com/company/senseible/",
      "https://x.com/senseible_earth",
      "https://www.instagram.com/senseible.earth/",
      "https://www.threads.com/@senseible.earth",
      "https://www.facebook.com/senseible",
      "https://www.tumblr.com/blog/senseible-earth"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "impact@senseible.earth",
      "contactType": "customer service",
      "areaServed": ["IN", "EU"],
      "availableLanguage": ["English", "Hindi"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Minarch Tower, Sector 44",
      "addressLocality": "Gurugram",
      "postalCode": "122003",
      "addressCountry": "IN"
    }
  };

  // Software application schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Senseible AI Carbon Layer",
    "applicationCategory": "EnvironmentalManagementSoftware",
    "operatingSystem": "Web",
    "description": "AI carbon layer enabling MRV-to-monetization for MSMEs in under 47 seconds.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock"
    }
  };

  // Article schema for CMS pages
  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "datePublished": article.publishedTime,
    "dateModified": article.modifiedTime || article.publishedTime,
    "author": {
      "@type": "Organization",
      "name": "Senseible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Senseible",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "keywords": article.tags?.join(', ')
  } : null;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="Senseible" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@senseible_earth" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Article specific */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.tags?.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      {articleSchema && (
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      )}
    </Helmet>
  );
};
