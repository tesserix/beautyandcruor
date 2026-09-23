/**
 * Single source of truth for site-wide facts. Anything marked TODO is waiting
 * on the client — see docs/OPEN-QUESTIONS.md. Do not invent values for these.
 */

export const SITE = {
  url: "https://beautyandcruor.com",
  name: "Beauty & Cruor",
  /** TODO(client): "Parimiti" or "Parimitii" — Instagram and her own post credit disagree. */
  artist: "Parimiti",
  tagline: "Prosthetics, SFX, hair and makeup for film and television",
  instagram: "https://www.instagram.com/_parimiti_sfx_and_prosthetics_/",
  instagramHandle: "@_parimiti_sfx_and_prosthetics_",
  imdb: "https://www.imdb.com/name/nm12573944/",
  /**
   * TODO(client): the live site publishes two different addresses
   * (info@beautyandcruor.com and info@beautycruor.com). One may be bouncing.
   * Left null deliberately rather than guessing.
   */
  email: null as string | null,
  /** TODO(client): a phone or WhatsApp number — producers call, they don't fill forms. */
  phone: null as string | null,
} as const;

/**
 * Origin of the assets bucket, for <link rel="preconnect">. Derived from the
 * same env var the image layer uses so the two can never disagree; empty when
 * images are served same-origin, in which case preconnecting is pointless.
 */
export const ASSET_ORIGIN = (() => {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
  try {
    return base ? new URL(base).origin : "";
  } catch {
    return "";
  }
})();

export const LOCATIONS = [
  { city: "Sydney", region: "New South Wales", country: "AU", countryName: "Australia" },
  { city: "Mumbai", region: "Maharashtra", country: "IN", countryName: "India" },
] as const;

/** The four disciplines, in the client's stated priority order. */
export const DISCIPLINES = [
  {
    slug: "sfx-prosthetics",
    title: "SFX & Prosthetics",
    short: "SFX",
    blurb:
      "Trauma, burns, creature builds and age work for film, television and stage. Appliances sculpted, moulded and run in-house.",
  },
  {
    slug: "casting-sculpting",
    title: "Casting & Sculpting",
    short: "Casting",
    blurb:
      "Lifecasting, clay and relief work, mould-making and 3D-printed appliance cores.",
  },
  {
    slug: "film-television",
    title: "Film & Television",
    short: "Film & TV",
    blurb: "Character and age makeup for screen, across Mumbai and Sydney.",
  },
  {
    slug: "editorial-fashion",
    title: "Editorial & Fashion",
    short: "Editorial",
    blurb: "Body art, beauty and fashion editorial, underwater and studio.",
  },
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

/**
 * Every URL the old site exposed that must keep resolving. Used by sitemap.ts
 * and by the deploy check that greps the old sitemap for 404s.
 */
export const PRESERVED_PATHS = [
  "/",
  "/about-me/",
  "/sfx-prosthetics/",
  "/film-television/",
  "/casting-sculpting/",
  "/editorial-fashion/",
  "/blogs/",
  "/contact-us/",
] as const;

/**
 * Routes the rebuild adds that the old site never had. Kept separate from
 * PRESERVED_PATHS because that list has a job — the deploy check greps the old
 * sitemap against it for 404s — and a new URL would be noise there.
 */
export const NEW_PATHS = ["/credits/"] as const;

/**
 * Dead on the old site and deliberately not rebuilt. nginx returns 410 Gone so
 * search engines de-index faster than with a 404. `/portfolio-item/*` was Curly
 * theme demo content with no imagery of its own.
 */
export const GONE_PATHS = [
  "/paritivity/",
  "/location-contact-us/",
  "/main-home/",
  "/portfolio-item/",
] as const;
