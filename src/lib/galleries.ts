import galleries from "@/content/galleries.json";

/**
 * Which images belong to which discipline.
 *
 * TODO(client): this edit is OUR selection from the 290 recovered originals,
 * made by eye off contact sheets. Parimiti has not confirmed it, and the
 * library mixes portfolio work with behind-the-scenes and phone snapshots.
 * Replace once she has been through it.
 */
const G = galleries as Record<string, string[]>;

export const GALLERY_BY_SLUG: Record<string, string> = {
  "sfx-prosthetics": "sfx",
  "casting-sculpting": "casting",
  "film-television": "film",
  "editorial-fashion": "editorial",
};

export function galleryFor(slug: string): string[] {
  const key = GALLERY_BY_SLUG[slug];
  return key ? (G[key] ?? []) : [];
}

export function heroKeys(): string[] {
  return G.hero ?? [];
}

export function artistPortrait(): string | null {
  return G.artist?.[0] ?? null;
}
