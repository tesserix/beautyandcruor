import { requireImage, srcSet, SIZES, type SizeKey } from "@/lib/images";

type Props = {
  /** Manifest key, e.g. "2023/04/3D-print-Nose" */
  imageKey: string;
  /**
   * Required, and deliberately has no default. Every image in the recovered
   * library has empty alt text, so it has to be authored per use. Pass ""
   * explicitly for images that are purely decorative.
   */
  alt: string;
  /** Which `sizes` rule applies. Wrong value here is the usual cause of oversized downloads. */
  size?: SizeKey;
  /** Set on the LCP image only — skips lazy-loading and raises fetch priority. */
  priority?: boolean;
  className?: string;
  /** Applied to the <img>; use to control object-fit within a sized container. */
  imgClassName?: string;
  /** Overrides the intrinsic ratio, e.g. "3 / 4" for a uniform grid. */
  aspectRatio?: string;
};

/**
 * Renders one image from the build-time manifest as AVIF -> WebP -> JPEG.
 *
 * Static export means next/image has no optimiser to call, so this deliberately
 * does not use it. The LQIP sits behind the image as a background so there is
 * no grey flash and no layout shift; width/height are always emitted.
 */
export function Picture({
  imageKey,
  alt,
  size = "gallery",
  priority = false,
  className,
  imgClassName,
  aspectRatio,
}: Props) {
  const img = requireImage(imageKey);
  const sizes = SIZES[size];

  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcSet(img.avif)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(img.webp)} sizes={sizes} />
      <img
        src={img.fallback.src}
        alt={alt}
        width={img.width}
        height={img.height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={imgClassName}
        style={{
          aspectRatio: aspectRatio ?? `${img.width} / ${img.height}`,
          backgroundImage: `url("${img.lqip}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </picture>
  );
}

/** Image inside MDX post bodies. Constrained to the prose column. */
export function PostImage({ imageKey, alt }: { imageKey: string; alt: string }) {
  return (
    <Picture
      imageKey={imageKey}
      alt={alt}
      size="prose"
      className="block my-8"
      imgClassName="w-full h-auto rounded-sm"
    />
  );
}
