import { Reel, ReelFrame } from "./Reel";
import { Picture } from "./Picture";
import { altFor } from "@/lib/alt";

/**
 * Server component. Resolves images from the build-time manifest and passes
 * fully-rendered frames into the client Reel, so the manifest never crosses
 * the server/client boundary.
 */
export function WorkReel({
  imageKeys,
  label,
  priorityFirst = false,
}: {
  imageKeys: string[];
  label: string;
  priorityFirst?: boolean;
}) {
  return (
    <Reel count={imageKeys.length} label={label}>
      {imageKeys.map((key, i) => (
        <ReelFrame key={key}>
          <Picture
            imageKey={key}
            /* Authored per image in src/content/alt.json. The positional
               string is the fallback for an image added since that draft. */
            alt={altFor(key, `${label}, work ${i + 1} of ${imageKeys.length}`)}
            size="gallery"
            priority={priorityFirst && i === 0}
            imgClassName="h-full w-full object-cover"
            aspectRatio="auto"
            className="block h-full w-full"
          />
        </ReelFrame>
      ))}
    </Reel>
  );
}
