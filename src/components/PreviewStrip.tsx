import { Picture } from "./Picture";

/**
 * A discipline's best work on the homepage: a horizontal strip of several
 * images rather than one plate.
 *
 * Frames are 78% of the viewport on a phone so the next one peeks in at the
 * edge — that overhang is the only affordance telling anyone the row scrolls.
 * A full-width frame reads as a static image and nobody swipes it.
 *
 * Deliberately NOT the Reel component used for full galleries: that carries a
 * counter and progress bar, and four of those stacked down the homepage is
 * chrome competing with the work. Native scroll-snap needs no JavaScript.
 */
export function PreviewStrip({
  imageKeys,
  label,
}: {
  imageKeys: string[];
  label: string;
}) {
  return (
    <div
      className="flex h-full snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ overscrollBehaviorX: "contain" }}
      role="group"
      aria-label={`${label} — preview`}
    >
      {imageKeys.map((key, i) => (
        <figure
          key={key}
          className="relative m-0 h-full w-[78%] flex-none snap-start bg-ink-2 sm:w-[52%] md:w-[34%] xl:w-[26%]"
        >
          <Picture
            imageKey={key}
            /* TODO(client): real titles pending — see OPEN-QUESTIONS #9. */
            alt={`${label}, ${i + 1} of ${imageKeys.length}`}
            size="gallery"
            imgClassName="h-full w-full object-cover"
            aspectRatio="auto"
            className="block h-full w-full"
          />
        </figure>
      ))}
    </div>
  );
}
