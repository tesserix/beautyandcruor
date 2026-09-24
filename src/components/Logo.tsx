/**
 * The brand mark.
 *
 * Served as an external file rather than inlined. Inlining cost 29KB of path
 * data twice per page — once in the markup and again serialized into the RSC
 * payload — which was most of the homepage's HTML weight. As a file it is
 * fetched once and cached across every page.
 *
 * Colour comes from a CSS mask, so the mark takes `currentColor` and works on
 * any ground without shipping a second asset.
 *
 * THE MARK IS NOW TYPE, NOT A SIGNATURE
 *
 * The botanical script it replaced read as a wellness brand against burns and
 * trauma work — both design reviews said so independently, and she asked for
 * it to be recreated. It also could not do this job: at header size it was
 * 98px of illegible flourish.
 *
 * "BEAUTY &" over "CRUOR", set in Archivo and converted to outlines. Outlines
 * rather than <text> because this is a CSS mask and the source the favicon is
 * composed from: it cannot depend on a font being present, and it has to be
 * addressable as geometry. Archivo is Open Font License, which permits
 * outlining and commercial use outright — the mark is unambiguously hers,
 * which a generated one would not have been.
 */
import { forwardRef, type CSSProperties } from "react";

/**
 * The mark's own proportions, from its viewBox. Exported because the OG card
 * needs the same number, and two hand-copied ratios are how the header ended
 * up stretching a mark that had been redrawn.
 */
export const LOGO_ASPECT = { w: 5756, h: 1890 } as const;

type Props = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Marks the opening mark so <Chrome> can measure and then replace it. */
  "data-hero-mark"?: boolean | "";
};

/**
 * forwardRef because <Chrome> measures this node directly: the travelling mark
 * is sized and scaled from its own layout box, not the link wrapping it.
 */
export const Logo = forwardRef<HTMLSpanElement, Props>(function Logo(
  { className, style, title = "Beauty & Cruor", ...rest },
  ref,
) {
  return (
    <span
      role="img"
      ref={ref}
      aria-label={title}
      className={className}
      {...rest}
      style={{
        display: "block",
        aspectRatio: `${LOGO_ASPECT.w} / ${LOGO_ASPECT.h}`,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/brand/logo-mask.svg)",
        maskImage: "url(/brand/logo-mask.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
});
