/**
 * One definition of "these paths are the same upload".
 *
 * WordPress stores an upload under several names — the original, a `-scaled`
 * variant, `-1024x768` derivatives, occasionally `-rotated` — and the recovered
 * library, the live-site crawl and hand-written curation each reference
 * whichever one they happened to see. Matching them needs a normal form.
 *
 * Plain JavaScript, imported by both `scripts/organize.mjs` and the TypeScript
 * under src/lib, because two copies of this function is exactly how they drift.
 * It had drifted once already: curation.json resolved at organize time and not
 * at build time, because the two ends normalised differently.
 *
 * THE EXTENSION LIST IS NOT DECORATION. The obvious `\.[^.]+$` strips
 * everything after the LAST dot, and WhatsApp exports — most of the film
 * gallery — carry dots in the stem:
 *
 *   2022/09/WhatsApp-Image-2019-06-29-at-1.41.08-AM.jpeg
 *
 * With a real extension that is harmless. Written without one, as curation.json
 * writes it, `\.[^.]+$` eats `.08-AM` and the path matches nothing. Two curated
 * film leads were silently unresolvable that way.
 *
 * @param {string} path Upload path, with or without an extension.
 * @returns {string} Directory plus normalised stem, lowercased.
 */
export function identity(path) {
  const slash = path.lastIndexOf("/");
  const dir = slash === -1 ? "." : path.slice(0, slash);
  const stem = path
    .slice(slash + 1)
    .replace(/\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif|bmp)$/i, "")
    .replace(/-\d+x\d+$/, "")
    .replace(/(-scaled|-rotated)$/, "")
    .toLowerCase();
  return `${dir}/${stem}`;
}
