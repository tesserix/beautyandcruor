import { SITE, LOCATIONS } from "./site";

/**
 * Person schema. `sameAs` is the part that matters commercially: it tells
 * Google the site and the IMDb profile are the same person, which is how a
 * film-industry identity gets consolidated.
 */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/#person`,
    name: SITE.artist,
    jobTitle: "Prosthetics, SFX and Makeup Artist",
    description: SITE.tagline,
    url: SITE.url,
    sameAs: [SITE.imdb, SITE.instagram],
    knowsAbout: [
      "Special effects makeup",
      "Prosthetic appliances",
      "Lifecasting",
      "Sculpting and mould-making",
      "Hair styling",
    ],
    workLocation: LOCATIONS.map((l) => ({
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: l.city,
        addressRegion: l.region,
        addressCountry: l.country,
      },
    })),
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
  };
}

/**
 * One LocalBusiness per city. Deliberately omits address detail beyond the
 * locality — she works on productions, not from a shopfront, and a fabricated
 * street address would be worse than none.
 */
export function localBusinessSchemas() {
  return LOCATIONS.map((l) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#business-${l.city.toLowerCase()}`,
    name: `${SITE.name} — ${l.city}`,
    description: `${SITE.tagline}. Based in ${l.city}, ${l.countryName}.`,
    url: SITE.url,
    image: `${SITE.url}/og.jpg`,
    areaServed: { "@type": "City", name: l.city },
    address: {
      "@type": "PostalAddress",
      addressLocality: l.city,
      addressRegion: l.region,
      addressCountry: l.country,
    },
    founder: { "@id": `${SITE.url}/#person` },
    sameAs: [SITE.imdb, SITE.instagram],
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
  }));
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE.url}${t.path}`,
    })),
  };
}

/** Renders one or more schema objects into a single JSON-LD script tag. */
export function JsonLd({ schemas }: { schemas: object[] }) {
  return (
    <script
      type="application/ld+json"
      // Schema objects are authored here, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.length === 1 ? schemas[0] : schemas) }}
    />
  );
}
