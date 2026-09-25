/**
 * Derives the brand assets from one source file.
 *
 *   brand/lockup.png   the mark as delivered, transparent
 *     -> public/brand/monogram.{webp,png}   the BC alone
 *     -> public/brand/wordmark.{webp,png}   BEAUTY & CRUOR and the disciplines
 *     -> brand/lockup.png                   both as one image
 *
 * The lockup stays out of public/ on purpose. No page references it — the site
 * stacks the two halves so the monogram can travel — and only scripts/og.mjs
 * reads it, at build time, for the share card. In public/ it would be 360KB
 * pushed to the CDN that nothing ever fetches.
 *
 * WHY THE MONOGRAM IS CUT HERE AND NOT BY HAND
 *
 * The header bar mark is 26-30px tall. The full lockup at that height renders
 * its wordmark about eight pixels tall, which is an illegible smear — so the
 * bar needs the monogram alone. Cutting that by eye means a magic number that
 * silently rots the first time the source is regenerated at a different size.
 * Instead the cut is found: the emptiest scanline between half and
 * five-eighths height IS the gap between the monogram and the wordmark.
 *
 * WHY THE OPENING FRAME STACKS TWO FILES INSTEAD OF USING THE LOCKUP
 *
 * The bar mark travels: <Chrome> hides the opening mark and scales the bar's
 * own mark up to stand in its place, so the two are never both on screen. That
 * only works while they are the same artwork. Showing the lockup up top and
 * the monogram in the bar put the monogram over the opening frame and the
 * wordmark was never drawn at all.
 *
 * So the opening frame stacks the monogram and the wordmark as two elements.
 * What travels is the monogram — the same file the bar uses — and the wordmark
 * simply fades. The lockup is still emitted, for the share card, where nothing
 * moves.
 *
 * WHY RASTER AND NOT A MASK
 *
 * The mark it replaced was one colour, so it could be a CSS mask taking
 * currentColor and work on any ground from a single file. This one is cream
 * and red at once. A mask cannot carry two colours, so it is an image, and a
 * second file is needed for light grounds.
 *
 *   node scripts/brand.mjs
 */
import sharp from "sharp";
import { readFile, writeFile, rm } from "node:fs/promises";

const SOURCE = "brand/lockup.png";

/** Widths to emit. The hero draws at ~220px tall on a 3x screen: 660px. */
const LOCKUP_W = 900;
const MONOGRAM_W = 420;

/** The emptiest scanline in the lower half — the gap under the monogram. */
async function monogramCut(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let cut = 0, min = Infinity;
  for (let y = Math.round(info.height * 0.5); y < Math.round(info.height * 0.85); y++) {
    let n = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 40) n++;
    if (n < min) { min = n; cut = y; }
  }
  if (min > info.width * 0.02) {
    throw new Error(`no clear gap under the monogram (emptiest row has ${min} ink px) — is the source still a stacked lockup?`);
  }
  return cut;
}

async function emit(buf, name, width, dir = "public/brand") {
  const scaled = sharp(buf).resize({ width, withoutEnlargement: true });
  // Flat artwork, not a photograph: lossy WebP spends bits on edges that are
  // meant to be hard, and came out larger than the palette PNG for the
  // wordmark. Take whichever of the two WebP modes is actually smaller.
  const lossy = await scaled.clone().webp({ quality: 88, effort: 6, alphaQuality: 100 }).toBuffer();
  const lossless = await scaled.clone().webp({ lossless: true, effort: 6 }).toBuffer();
  const webp = lossless.length < lossy.length ? lossless : lossy;
  const mode = lossless.length < lossy.length ? "lossless" : "lossy";
  const png = await scaled.clone().png({ compressionLevel: 9, palette: true }).toBuffer();
  const { width: w, height: h } = await sharp(webp).metadata();
  // writeFile, not sharp().toFile(): handing the buffer back to sharp
  // re-encodes it, which silently discarded the palette the size above was
  // measured from — 143KB logged, 228KB on disk.
  if (dir === "public/brand") {
    // Only written when it wins: an unreferenced file still ships to the CDN.
    if (webp.length < png.length) await writeFile(`${dir}/${name}.webp`, webp);
    else await rm(`${dir}/${name}.webp`, { force: true });
    await writeFile(`${dir}/${name}.png`, png);
    console.log(`  ${name.padEnd(9)} ${w}x${h}  webp ${(webp.length/1024).toFixed(1)}KB (${mode})  png ${(png.length/1024).toFixed(1)}KB  ratio ${(w/h).toFixed(4)}  serve ${webp.length < png.length ? "webp" : "png"}`);
  } else {
    // Build-time only: one copy, no second format to choose between.
    await writeFile(`${dir}/${name}.png`, png);
    console.log(`  ${name.padEnd(9)} ${w}x${h}  png ${(png.length/1024).toFixed(1)}KB (build only, not served)  ratio ${(w/h).toFixed(4)}`);
  }
  return { w, h, webpWins: webp.length < png.length };
}

const source = await readFile(SOURCE);
const full = await sharp(source).trim().png().toBuffer();
const meta = await sharp(full).metadata();
const cut = await monogramCut(full);
const mono = await sharp(full).extract({ left: 0, top: 0, width: meta.width, height: cut }).png().toBuffer();
const monoTrim = await sharp(mono).trim().png().toBuffer();

const word = await sharp(full)
  .extract({ left: 0, top: cut, width: meta.width, height: meta.height - cut })
  .png()
  .toBuffer();
const wordTrim = await sharp(word).trim().png().toBuffer();

const lockup = await emit(full, "lockup", LOCKUP_W, "brand");
const monogram = await emit(monoTrim, "monogram", MONOGRAM_W);
// Emitted at the width the monogram would have at MONOGRAM_W in the lockup,
// so stacking the two at their natural widths reproduces the original
// proportions rather than a pair of guesses.
const wordScale = (await sharp(wordTrim).metadata()).width / (await sharp(monoTrim).metadata()).width;
const wordmark = await emit(wordTrim, "wordmark", Math.round(MONOGRAM_W * wordScale));

// The travelling mark in <Chrome> has to line the bar's monogram up with the
// same shape inside the hero's lockup, so it needs to know where that shape
// sits. Emitted rather than hand-copied: two ratios kept in sync by hand is
// exactly how the header once stretched a mark that had been redrawn.
/**
 * The proportions the components size from, written rather than copied.
 *
 * Logo.tsx used to carry these as literals. The first time this script emitted
 * 558x105 instead of 560x109 they were already wrong, and a wrong aspect ratio
 * does not throw — it quietly stretches the mark. Same reason the header once
 * stretched a mark that had been redrawn.
 */
await writeFile(
  "src/generated/brand.json",
  JSON.stringify(
    {
      // webp is offered only where it is actually smaller. For the wordmark it
      // is not: flat type with hard edges compresses better as a palette PNG,
      // and a <source> would have served the larger file to every browser.
      mark: { w: monogram.w, h: monogram.h, webp: monogram.webpWins },
      wordmark: { w: wordmark.w, h: wordmark.h, webp: wordmark.webpWins },
      wordmarkScale: Number((wordmark.w / monogram.w).toFixed(4)),
    },
    null,
    2,
  ) + "\n",
);

console.log(`
  lockup aspect   ${lockup.w} / ${lockup.h}
  monogram aspect ${monogram.w} / ${monogram.h}
  wordmark aspect ${wordmark.w} / ${wordmark.h}
  the opening frame stacks monogram over wordmark; wordmark is ${(wordmark.w / monogram.w).toFixed(4)}x the monogram's width`);
