import { Helmet } from "react-helmet-async";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  image?: string;
  keywords?: string[];
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
  noIndex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqSchema?: { question: string; answer: string }[];
  howToSchema?: { name: string; steps: { title: string; text: string }[] };
  /** Set to false to suppress Organization schema on non-homepage pages */
  showOrgSchema?: boolean;
}

export const SEOHead = ({
  title,
  description,
  canonical,
  type = 'website',
  image = 'https://senseible.earth/og-image.png',
  keywords = [],
  article,
  noIndex = false,
  breadcrumbs,
  faqSchema,
  howToSchema,
  showOrgSchema = false,
}: SEOHeadProps) => {
  const fullTitle = title.includes('Senseible') ? title : `${title} | Senseible`;
  const siteUrl = 'https://senseible.earth';
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : undefined;
  
  const baseKeywords = [
    'senseible', 'sensible', 'senseible.earth', 'senseible carbon',
    'carbon accounting', 'carbon MRV', 'carbon credits', 'climate finance',
    'green loans', 'CBAM compliance', 'ESG reporting', 'MSME sustainability'
  ];
  
  const allKeywords = [...new Set([...baseKeywords, ...keywords])].join(', ');

  // Organization schema — only on homepage
  const organizationSchema = showOrgSchema ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Senseible",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "AI-driven carbon infrastructure converting MSME operational data into verified, regulation-ready carbon outcomes across India and the EU.",
    "areaServed": ["India", "European Union", "Southeast Asia", "Middle East"],
    "knowsAbout": ["Carbon MRV", "Carbon Accounting", "Carbon Credits", "CBAM", "ESG Compliance", "Green Finance"],
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
  } : null;

  // Article schema for CMS pages
  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": image,
    "datePublished": article.publishedTime,
    "dateModified": article.modifiedTime || article.publishedTime,
    "author": { "@type": "Organization", "name": article.author || "Senseible", "url": siteUrl },
    "publisher": {
      "@type": "Organization",
      "name": "Senseible",
      "logo": { "@type": "ImageObject", "url": `${siteUrl}/logo.png`, "width": 600, "height": 60 }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
    "keywords": article.tags?.join(', ')
  } : null;

  // BreadcrumbList schema
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${siteUrl}${crumb.url}`
    }))
  } : null;

  // FAQPage schema
  const faqJsonLd = faqSchema && faqSchema.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqSchema.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  } : null;

  // HowTo schema
  const howToJsonLd = howToSchema ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": howToSchema.name,
    "step": howToSchema.steps.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.title,
      "text": s.text
    }))
  } : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {canonicalUrl && <link rel="alternate" hrefLang="en-in" href={canonicalUrl} />}
      {canonicalUrl && <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />}
      
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="Senseible" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@senseible_earth" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.tags?.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {organizationSchema && (
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      )}
      {articleSchema && (
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      )}
      {faqJsonLd && (
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      )}
      {howToJsonLd && (
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
      )}
    </Helmet>
  );
};
