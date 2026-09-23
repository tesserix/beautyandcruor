import { SHOWREEL } from "@/content/showreel";
import { requireImage, assetUrl } from "@/lib/images";

/**
 * The showreel, when one exists — returns null until then so the caller can
 * fall back to the image reel. See src/content/showreel.ts.
 *
 * Fills its parent rather than owning a section, so the homepage hero is one
 * slot with two possible contents and the masthead overlay sits on either.
 *
 * Deliberately a plain <video controls>: native controls are keyboard- and
 * screen-reader-accessible for free, and a custom player is JS this budget
 * does not have. `preload="none"` keeps the reel off the critical path — the
 * poster is what paints, and it comes through the image pipeline like every
 * other image, so no video downloads until someone presses play.
 */
export function Showreel() {
  if (!SHOWREEL) return null;
  const { sources, posterKey, description, duration } = SHOWREEL;
  const poster = requireImage(posterKey);

  return (
    <div className="relative h-full w-full bg-ink-2">
      <video
        controls
        preload="none"
        playsInline
        poster={assetUrl(poster.fallback.src)}
        aria-label={`Showreel, ${duration}. ${description}`}
        width={poster.width}
        height={poster.height}
        className="h-full w-full object-cover"
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
        <p className="p-6 text-ash">{description} — your browser cannot play this reel.</p>
      </video>
      <p
        className="lab num pointer-events-none absolute z-[4]"
        style={{ left: "var(--gut)", top: "calc(var(--hud) + 8px)" }}
      >
        Showreel · {duration}
      </p>
    </div>
  );
}

/** Whether a reel exists — lets the caller pick the hero content. */
export const hasShowreel = SHOWREEL !== null;
