/**
 * Builds the favicon set from the brand monogram. Run by hand:
 *
 *   node scripts/icons.mjs
 *
 * The output is committed. It changes when the mark does and never otherwise,
 * so there is no reason to run it on every build.
 *
 * WHAT IT DRAWS
 *
 * A "B", set in Archivo at the same weight as the wordmark, in the mark's
 * green on a transparent ground.
 *
 * It used to compose the heart, leaves and stem out of three numbered paths of
 * the old script logo — index 0, 2 and 9 — because cropping could not isolate
 * the emblem: the loop interlocks with the B of "Beauty", so every rectangle
 * containing it also contained part of a letter.
 *
 * That whole problem is gone. The monogram is its own file, so there is
 * nothing to index into and nothing to break when the mark is redrawn.
 *
 * A wordmark cannot be a favicon — "BEAUTY & CRUOR" at 32px is a smear — so
 * the identity needs two marks, and this is the small one. Rendered at 32 it
 * is the clearest of the options tried: a B has a strong vertical and a
 * counter that survives the pixel grid, where "BC" crowds and "B&C" turns to
 * mush.
 *
 * Transparent rather than on a plate, so it sits on whatever the browser's tab
 * strip happens to be.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

/** The mark's own green (--color-leaf). */
const LEAF = "#7AC943";

/** Fraction of the icon the monogram fills, leaving it room to breathe. */
const INSET = 0.8;

const src = readFileSync("public/brand/monogram.svg", "utf8");
const [, , vw, vh] = src.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number);

// Rendered large, then trimmed to its real ink so the glyph's own bounds drive
// the framing rather than the side bearings the font happens to carry.
const rendered = await sharp(
  Buffer.from(src.replace('fill="#000"', `fill="${LEAF}"`).replace("<svg ", `<svg width="${Math.round(1024 * (vw / vh))}" height="1024" `)),
  { density: 384 },
)
  .png()
  .toBuffer();
const trimmed = await sharp(rendered).trim().png().toBuffer();

/** One square, transparent icon at the given size. */
async function icon(size) {
  const inner = Math.round(size * INSET);
  const fitted = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fitted, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO wrapping a PNG. Every browser that still asks for /favicon.ico supports
 * PNG-in-ICO, so this is a 22-byte header around the 32px icon rather than a
 * bitmap encoder — and PNG is what carries the transparency.
 */
function ico(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // offset
  return Buffer.concat([header, entry, png]);
}

// Next's file conventions: it emits the <link> tags for these itself.
for (const [path, size] of [
  ["src/app/icon.png", 64],
  ["src/app/apple-icon.png", 180],
]) {
  writeFileSync(path, await icon(size));
  console.log(`wrote ${path} — ${size}x${size}`);
}

writeFileSync("src/app/favicon.ico", ico(await icon(32), 32));
console.log("wrote src/app/favicon.ico — 32x32 (PNG-in-ICO)");
