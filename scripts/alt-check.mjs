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
 * galleries.json holds manifest keys; alt.json is addressed by upload path,
 * because organize.mjs renumbers manifest keys and reuses the names it frees.
 * The manifest is what maps one to the other, so this check needs all three —
 * and it normalises with the same shared identity() the site resolves with,
 * rather than a second opinion about what "the same upload" means.
 *
 * Runs in prebuild, so it runs in CI's container build as well. src/content
 * and src/generated both ship in the Docker context — unlike public/img.
 */
import { readFileSync } from "node:fs";
import { identity } from "../src/lib/identity.mjs";

const galleries = JSON.parse(readFileSync("src/content/galleries.json", "utf8"));
const alt = JSON.parse(readFileSync("src/content/alt.json", "utf8"));
const manifest = JSON.parse(readFileSync("src/generated/images.json", "utf8"));

/** manifest key -> stable upload identity, for every published image. */
const published = new Map();
for (const value of Object.values(galleries)) {
  if (!Array.isArray(value)) continue;
  for (const key of value) {
    const entry = manifest[key];
    if (!entry) {
      console.error(`\nBUILD STOPPED: gallery lists ${key}, which is not in the image manifest.`);
      process.exit(1);
    }
    published.set(key, identity(entry.sourcePath ?? entry.src));
  }
}

const missing = [...published]
  .filter(([, id]) => !alt[id]?.trim())
  .map(([key, id]) => `  ${key}  (${id})`)
  .sort();

if (missing.length) {
  console.error(
    `\nBUILD STOPPED: ${missing.length} published image(s) have no alt text in src/content/alt.json:\n` +
      missing.join("\n") +
      "\n\nAdd one line per image, keyed by the upload path in brackets, describing\n" +
      "what is visible. Do not name a production or an actor — those are still\n" +
      "open questions.\n",
  );
  process.exit(1);
}

// Not fatal: an entry for an image in no gallery costs nothing. It is normal
// while a gallery is being re-curated, and worth seeing in case a path was
// mistyped rather than an image genuinely dropped.
const live = new Set(published.values());
const orphans = Object.keys(alt).filter((id) => !live.has(id));
if (orphans.length) {
  console.warn(`alt-check: ${orphans.length} alt entr(ies) for images in no gallery: ${orphans.join(", ")}`);
}

console.log(`alt-check: ${published.size} published images, all with authored alt text`);
