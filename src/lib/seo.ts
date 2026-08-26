/**
 * Zwits SEO layer — single source of truth for business identity, canonical
 * URLs, route metadata and JSON-LD structured data.
 *
 * Rules:
 *  - Never invent claims (ratings, awards, certifications, coverage).
 *  - Every indexable page gets a unique title, description and self-referencing
 *    canonical built from `canonical(path)`.
 */

export const SITE_URL = "https://www.zwits.co.zw";

/** Official registered company identity. Do not edit without documentation. */
export const BUSINESS = {
  brand: "Zwits",
  legalName: "Zwits Technologies Private Business Corporation",
  registrationNumber: "6436B0272026",
  incorporated: "2026-07-29",
  taxId: "2002607679",
  tagline: "Trust. Delivered.",
  phone: "+263773848940",
  phoneDisplay: "+263 773 848 940",
  address: {
    street: "16 Tarlington Road",
    suburb: "Marlborough",
    city: "Harare",
    country: "Zimbabwe",
    countryCode: "ZW",
  },
  logo: `${SITE_URL}/icon-512.png`,
} as const;

/** Default social share image (site screenshot managed by hosting). */
export const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/958b8404-e2aa-4381-a530-f72bc70fab8c/id-preview-ce98154b--5dd9a776-382f-4d0d-8ba3-6330a6208fcc.lovable.app-1784809443701.png";

/** Build an absolute, canonical, trailing-slash-free URL for a route path. */
export function canonical(path: string): string {
  if (!path || path === "/") return `${SITE_URL}/`;
  const clean = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return `${SITE_URL}${clean}`;
}

export type SeoInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/delivery/harare" */
  path: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  /** JSON-LD objects rendered into <head> */
  jsonLd?: Record<string, unknown>[];
};

type HeadResult = {
  meta: Record<string, string>[];
  links: Record<string, string>[];
  scripts?: { type: string; children: string }[];
};

/** Route-aware head() builder used by every public Zwits page. */
export function seo({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = [],
}: SeoInput): HeadResult {
  const url = canonical(path);
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:site_name", content: BUSINESS.brand },
    { property: "og:locale", content: "en_ZW" },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
  else meta.push({ name: "robots", content: "index, follow, max-image-preview:large" });

  const result: HeadResult = {
    meta,
    links: [{ rel: "canonical", href: url }],
  };
  if (jsonLd.length) {
    result.scripts = jsonLd.map((obj) => ({
      type: "application/ld+json",
      children: JSON.stringify(obj),
    }));
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* JSON-LD builders                                                    */
/* ------------------------------------------------------------------ */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS.brand,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    logo: BUSINESS.logo,
    slogan: BUSINESS.tagline,
    telephone: BUSINESS.phone,
    foundingDate: BUSINESS.incorporated,
    taxID: BUSINESS.taxId,
    identifier: BUSINESS.registrationNumber,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.suburb,
      addressCountry: BUSINESS.address.countryCode,
    },
    areaServed: { "@type": "Country", name: "Zimbabwe" },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.brand,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-ZW",
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: BUSINESS.brand,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    image: BUSINESS.logo,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.suburb,
      addressCountry: BUSINESS.address.countryCode,
    },
    areaServed: { "@type": "City", name: "Harare" },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

export type Faq = { q: string; a: string };

/** Only use where the page actually renders the same FAQ content. */
export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function serviceJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  areaServed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    serviceType: opts.name,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: opts.areaServed
      ? { "@type": "City", name: opts.areaServed }
      : { "@type": "Country", name: "Zimbabwe" },
  };
}
