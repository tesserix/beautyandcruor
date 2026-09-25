/**
 * The brand mark.
 *
 * TWO SHAPES, NOT ONE
 *
 * The mark is a BC monogram with a face in its counter, over "BEAUTY & CRUOR"
 * and a discipline line. That full lockup is what the opening frame shows.
 * The header bar cannot show it: the bar mark is 26-30px tall, which renders
 * the wordmark about eight pixels high — an illegible smear, measured, not
 * guessed. So the bar shows the monogram alone.
 *
 * All three are cut from one source by scripts/brand.mjs.
 *
 * The opening frame stacks "mark" over "wordmark" rather than showing
 * "lockup", because the bar mark travels: <Chrome> hides the opening mark and
 * scales the bar's own up into its place, which only reads as one object while
 * the two are the same artwork. So the monogram is what travels, and the
 * wordmark beside it simply fades.
 *
 * AN IMAGE, NOT A MASK
 *
 * The mark this replaced was one colour, so it could be a CSS mask taking
 * currentColor: one file, any ground. This one is cream and red at once, and a
 * mask carries no colour of its own. So it is an image, and a light ground
 * needs its own file rather than a different `color`.
 *
 * PNG always, with WebP offered only where it is actually smaller — which for
 * the wordmark it is not. The mark is the one asset whose failure to load is
 * conspicuous, so the <img> src is the format every browser can read.
 */
import { forwardRef, type CSSProperties } from "react";

/**
 * Both marks' proportions, from the files scripts/brand.mjs emits. Exported
 * because the hero, the bar and the OG card all size from them, and two
 * hand-copied ratios are how the header once stretched a mark that had been
 * redrawn.
 */
import brand from "@/generated/brand.json";

/**
 * Read from the file scripts/brand.mjs writes, never copied. A wrong aspect
 * ratio does not throw; it stretches the mark, quietly, which is how the
 * header once stretched a mark that had been redrawn.
 */
export const MARK_ASPECT = brand.mark;
export const WORDMARK_ASPECT = brand.wordmark;
/** The wordmark's width as a multiple of the monogram's. */
export const WORDMARK_SCALE = brand.wordmarkScale;

type Variant = "mark" | "wordmark";

type Props = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  /**
   * "mark" is the monogram — the only one that travels, and the only one the
   * header bar can show. "wordmark" is the type under it. There is no lockup
   * variant: the share card composes its own from brand/lockup.png, which is
   * never served.
   */
  variant?: Variant;
  /** Marks the opening mark so <Chrome> can measure and then replace it. */
  "data-hero-mark"?: boolean | "";
  /** Marks the opening wordmark so <Chrome> can fade it as the mark leaves. */
  "data-hero-wordmark"?: boolean | "";
};

const FILE: Record<Variant, { src: string; aspect: { w: number; h: number }; webp: boolean }> = {
  mark: { src: "monogram", aspect: MARK_ASPECT, webp: brand.mark.webp },
  wordmark: { src: "wordmark", aspect: WORDMARK_ASPECT, webp: brand.wordmark.webp },
};

/**
 * forwardRef because <Chrome> measures this node directly: the travelling mark
 * is sized and scaled from its own layout box, not the link wrapping it.
 */
export const Logo = forwardRef<HTMLSpanElement, Props>(function Logo(
  { className, style, title = "Beauty & Cruor", variant = "mark", ...rest },
  ref,
) {
  const { src, aspect, webp } = FILE[variant];
  return (
    <span
      role="img"
      ref={ref}
      aria-label={title}
      className={className}
      {...rest}
      style={{
        display: "block",
        aspectRatio: `${aspect.w} / ${aspect.h}`,
        ...style,
      }}
    >
      <picture>
        {/* Offered only where scripts/brand.mjs measured it smaller: the
            wordmark is flat type, which a palette PNG beats. */}
        {webp && <source srcSet={`/brand/${src}.webp`} type="image/webp" />}
        <img
          src={`/brand/${src}.png`}
          alt=""
          /* The span carries the label; this must not be announced twice. */
          aria-hidden="true"
          draggable={false}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
        />
      </picture>
    </span>
  );
});
