import { SITE, LOCATIONS } from "./site";
// Type-only: erased at compile time, so credits.json is never pulled in here.
import type { Credit, CreditType } from "./credits";

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

/**
 * schema.org type per credit format.
 *
 * "Production" is the bucket for everything whose format the title does not
 * state (see inferType), so it maps to the generic CreativeWork rather than
 * asserting a format the data does not support. Same for the two ambiguous
 * brand entries sitting in that bucket.
 */
const SCHEMA_TYPE: Record<CreditType, string> = {
  Feature: "Movie",
  Series: "TVSeries",
  Commercial: "CreativeWork",
  Poster: "CreativeWork",
  Production: "CreativeWork",
};

/**
 * One node per credit, each naming her as a contributor.
 *
 * This is the answer to "who did the prosthetics on X" — the question an
 * assistant is actually asked about a crew member, and the one the site could
 * not answer in machine-readable form while every page carried nothing but
 * Person and LocalBusiness (docs/OPEN-QUESTIONS.md, SEO gap 1).
 *
 * Her role rides in a schema.org Role wrapper, which is the only way to say
 * "this person, in this capacity, on this work". TODO(client): question 1 —
 * not one of the 27 credits carries a role yet, so `roleName` is omitted
 * rather than guessed, and the wrapper degrades to a plain contributor
 * reference. The scaffolding emits roles the moment the data has them.
 */
export function creditSchemas(credits: Credit[]) {
  return credits.map((c) => {
    const year = c.year.slice(0, 4);
    return {
      "@context": "https://schema.org",
      "@type": SCHEMA_TYPE[c.type],
      "@id": `${SITE.url}/credits/#${slug(`${c.title}-${c.year}`)}`,
      name: c.title,
      ...(/^\d{4}$/.test(year) ? { copyrightYear: Number(year) } : {}),
      ...(c.director && !c.inProgress
        ? { director: { "@type": "Person", name: c.director } }
        : {}),
      ...(c.production
        ? { productionCompany: { "@type": "Organization", name: c.production } }
        : {}),
      ...(c.location ? { countryOfOrigin: { "@type": "Country", name: c.location } } : {}),
      ...(c.inProgress ? { creativeWorkStatus: "In production" } : {}),
      contributor: {
        "@type": "Role",
        ...(c.role ? { roleName: c.role } : {}),
        contributor: { "@id": `${SITE.url}/#person` },
      },
    };
  });
}

/**
 * The credits page as an ordered list, so the set is legible as a body of work
 * rather than as 27 unrelated nodes.
 */
export function creditsListSchema(credits: Credit[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE.url}/credits/#credits`,
    name: `${SITE.artist} — screen credits`,
    numberOfItems: credits.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: credits.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@id": `${SITE.url}/credits/#${slug(`${c.title}-${c.year}`)}` },
    })),
  };
}

/** Stable fragment id from a title — lowercase, non-alphanumerics collapsed. */
function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
