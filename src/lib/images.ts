import manifest from "@/generated/images.json";

/** One emitted width of one format. */
export type Variant = { w: number; h: number; src: string };

/** A source image plus every derivative scripts/images.mjs produced for it. */
export type ImageEntry = {
  /** Path under capture/assets/uploads without extension, e.g. "2023/04/3D-print-Nose" */
  key: string;
  src: string;
  width: number;
  height: number;
  aspect: number;
  orientation: "portrait" | "landscape" | "square";
  /** True when the original is under 1170px wide — cannot go full-bleed on a 390@3x screen. */
  retinaFloor: boolean;
  avif: Variant[];
  webp: Variant[];
  fallback: { w: number; src: string };
  /** Inline 24px WebP, ~273 bytes. Prevents the grey flash on 4G. */
  lqip: string;
};

const IMAGES = manifest as unknown as Record<string, ImageEntry>;

/**
 * Where the image derivatives are served from.
 *
 * Empty in dev, so `/img/...` resolves against the dev server and nothing has
 * to be uploaded to work on the site. In CI it is set to the CDN origin and
 * every srcset entry becomes absolute.
 *
 * MUST be a BUILD-time value, never a runtime one. This is a static export:
 * these URLs are frozen into the emitted HTML, so a Helm env var would change
 * nothing about pages that were already built. It is a Docker build arg.
 *
 * No trailing slash — stripped here so both forms work.
 */
const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/$/, '');

/** Absolute CDN URL for one manifest-relative path (`/img/...`). */
export function assetUrl(src: string): string {
  return ASSET_BASE ? `${ASSET_BASE}${src}` : src;
}

export function getImage(key: string): ImageEntry | null {
  return IMAGES[key] ?? null;
}

/**
 * Throws rather than rendering a hole. A missing key means the manifest is
 * stale — run `npm run images` — and that should fail the build, not ship.
 */
export function requireImage(key: string): ImageEntry {
  const e = IMAGES[key];
  if (!e) {
    throw new Error(
      `No image "${key}" in src/generated/images.json. ` +
        `Run \`npm run images\` to regenerate the manifest.`
    );
  }
  return e;
}

export function hasImage(key: string): boolean {
  return key in IMAGES;
}

export function allImageKeys(): string[] {
  return Object.keys(IMAGES);
}

export function srcSet(variants: Variant[]): string {
  return variants.map((v) => `${assetUrl(v.src)} ${v.w}w`).join(", ");
}

/**
 * `sizes` values, kept here rather than inline so the layout's breakpoints and
 * the image ladder stay in one place. Getting these wrong is the usual reason a
 * correct pipeline still ships oversized images.
 */
export const SIZES = {
  /** Fills the viewport on phones; three-up from 900px, four-up from 1500px. */
  gallery: "(min-width: 1500px) 25vw, (min-width: 900px) 33vw, 100vw",
  /** Edge to edge at every width. */
  fullBleed: "100vw",
  /** Body-column image inside a blog post. */
  prose: "(min-width: 760px) 720px, 100vw",
  /** Portrait beside text on desktop, full width on mobile. */
  portrait: "(min-width: 900px) 40vw, 100vw",
} as const;

export type SizeKey = keyof typeof SIZES;
