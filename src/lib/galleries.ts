import galleries from "@/content/galleries.json";

/**
 * Which images belong to which discipline.
 *
 * TODO(client): this edit is OUR selection from the 290 recovered originals,
 * made by eye off contact sheets. Parimiti has not confirmed it, and the
 * library mixes portfolio work with behind-the-scenes and phone snapshots.
 * Replace once she has been through it.
 */
type GalleryFile = Record<string, string[] | Record<string, string>>;
const G = galleries as GalleryFile;

const list = (k: string): string[] => {
  const v = G[k];
  return Array.isArray(v) ? v : [];
};

export const GALLERY_BY_SLUG: Record<string, string> = {
  "sfx-prosthetics": "sfx",
  "casting-sculpting": "casting",
  "film-television": "film",
  "editorial-fashion": "editorial",
};

export function galleryFor(slug: string): string[] {
  const key = GALLERY_BY_SLUG[slug];
  return key ? list(key) : [];
}

export function heroKeys(): string[] {
  return list("hero");
}

export function artistPortrait(): string | null {
  return list("artist")[0] ?? null;
}

/**
 * The image on a discipline's plate on the homepage.
 *
 * Set per discipline in src/content/curation.json. Falls back to the gallery's
 * first frame, which is the curated lead — so an unset cover degrades to a
 * sensible image rather than to whatever sorted first.
 */
export function coverFor(slug: string): string | null {
  const covers = G.covers;
  const explicit =
    covers && !Array.isArray(covers) ? (covers as Record<string, string>)[slug] : undefined;
  return explicit ?? galleryFor(slug)[0] ?? null;
}

/** How many of a discipline's works preview on the homepage. */
export const PREVIEW_COUNT = 6;
