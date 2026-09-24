/**
 * The brand mark.
 *
 * Served as an external file rather than inlined. Inlining cost 29KB of path
 * data twice per page — once in the markup and again serialized into the RSC
 * payload — which was most of the homepage's HTML weight. As a file it is
 * fetched once and cached across every page.
 *
 * Colour comes from a CSS mask, so the mark takes `currentColor` and works on
 * any ground without shipping a second asset. That also makes it monochrome,
 * which is what both design reviews recommended: the lime leaf reads as a
 * wellness brand against burns and trauma work.
 *
 * Use `tone="brand"` for the two-colour original where the green is wanted.
 */
import { forwardRef, type CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
  tone?: "current" | "brand";
  title?: string;
  /** Marks the opening mark so <Chrome> can measure and then replace it. */
  "data-hero-mark"?: boolean | "";
};

/**
 * forwardRef because <Chrome> measures this node directly: the travelling mark
 * is sized and scaled from its own layout box, not the link wrapping it.
 */
export const Logo = forwardRef<HTMLSpanElement, Props>(function Logo(
  { className, style, tone = "current", title = "Beauty & Cruor", ...rest },
  ref,
) {
  if (tone === "brand") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/logo.svg" alt={title} className={className} width={1067} height={327} {...rest} />
    );
  }

  return (
    <span
      role="img"
      ref={ref}
      aria-label={title}
      className={className}
      {...rest}
      style={{
        display: "block",
        aspectRatio: "1067 / 327",
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
