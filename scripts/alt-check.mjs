/**
 * Fails the build if a published image has no authored alt text.
 *
 * The galleries fall back to a positional string ("SFX & Prosthetics, work 11
 * of 52") so a missing entry is never a missing alt attribute — but that
 * fallback is the thing this work existed to remove, and without a gate it
 * quietly comes back the first time an image is added.
 *
 * Same shape as the cleared-images gate in assets-sync.mjs: publication is
 * allowed only for images something has explicitly said yes to.
 *
 * Runs in prebuild, so it runs in CI's container build as well. It reads only
 * JSON under src/content, which ships in the Docker context — unlike
 * public/img, which does not.
 */
import { readFileSync } from "node:fs";

const galleries = JSON.parse(readFileSync("src/content/galleries.json", "utf8"));
const alt = JSON.parse(readFileSync("src/content/alt.json", "utf8"));

const published = new Set();
for (const value of Object.values(galleries)) {
  if (Array.isArray(value)) for (const key of value) published.add(key);
}

const missing = [...published].filter((key) => !alt[key]?.trim()).sort();

if (missing.length) {
  console.error(
    `\nBUILD STOPPED: ${missing.length} published image(s) have no alt text in src/content/alt.json:\n` +
      missing.map((k) => `  ${k}`).join("\n") +
      "\n\nWrite one line per image describing what is visible. Do not name a\n" +
      "production or an actor — those are still open questions.\n",
  );
  process.exit(1);
}

// Not fatal: an entry for an image no longer in a gallery costs nothing but is
// worth seeing, since it usually means a key was renamed.
const orphans = Object.keys(alt).filter((key) => !published.has(key));
if (orphans.length) {
  console.warn(`alt-check: ${orphans.length} alt entr(ies) for images in no gallery: ${orphans.join(", ")}`);
}

console.log(`alt-check: ${published.size} published images, all with authored alt text`);
