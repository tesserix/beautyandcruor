/**
 * The showreel slot.
 *
 * D10 puts a showreel above the fold, with the before/after transformation cut
 * into the footage rather than built as a page interaction (D13). No reel has
 * been cut yet — roughly ten minutes of usable source exists, and a running
 * order is proposed in deliverables/instagram-plan.html.
 *
 * So this is `null`, and the homepage falls back to the full-bleed image reel.
 * When a cut lands: encode to MP4 (H.264, for reach) plus WebM, drop them in
 * public/reel/, add a poster frame to the image pipeline, and fill this in.
 * Nothing else has to change.
 */

export type Showreel = {
  /** Sources in preference order; the browser takes the first it can play. */
  sources: { src: string; type: string }[];
  /**
   * Manifest key for the poster frame — it is the LCP image until the video
   * paints, so it goes through scripts/images.mjs like every other image.
   */
  posterKey: string;
  /** Authored, not migrated: describes what the reel shows, for screen readers. */
  description: string;
  /** e.g. "1:48" — shown in the label register so the cost of watching is known. */
  duration: string;
};

export const SHOWREEL: Showreel | null = null;
