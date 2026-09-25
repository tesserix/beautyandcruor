/**
 * Builds the favicon set from the brand icon.
 *
 * The icon is its own artwork, not the logo shrunk. That is not duplication:
 * the lockup is cream and red over a transparent ground with a wordmark under
 * it, and none of that survives 32 pixels — the wordmark becomes a smear, the
 * red sweep drops to 2.99:1 against the plate, and the hair strands fall below
 * one pixel and vanish. The icon is the same BC monogram redrawn flat, two
 * colours, on its own plate, which is what a favicon has to be.
 *
 * A wordmark cannot be a favicon — "BEAUTY & CRUOR" at 32px is a smear — so
 * the icon has never been the lockup and is not now.
 *
 * WHY THE CORNERS ARE RE-CUT
 *
 * The source arrives with its rounded plate sitting on opaque white, so the
 * corners are white pixels rather than transparency. Left alone the icon shows
 * white triangles on a dark tab strip. The corners are cut here as real alpha
 * instead of trusting the file.
 *
 *   node scripts/icons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

/** Corner radius as a fraction of the icon, matching the source artwork. */
const RADIUS = 0.22;

const source = "brand/icon.png";

// Squared and the rounded corners cut as real transparency. resize(cover)
// rather than trim(): the plate already fills the frame, and trimming a
// near-black plate against white is a threshold guess waiting to go wrong.
const base = await (async () => {
  const meta = await sharp(source).metadata();
  const side = Math.min(meta.width, meta.height);
  const square = await sharp(source)
    .resize(side, side, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">` +
      `<rect width="${side}" height="${side}" rx="${Math.round(side * RADIUS)}" ry="${Math.round(side * RADIUS)}" fill="#fff"/></svg>`,
  );
  return sharp(square).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
})();

/**
 * One square icon at the given size. Full bleed: the artwork carries its own
 * plate, so insetting it would float a small dark square inside a transparent
 * one rather than filling the tab's slot.
 */
async function icon(size) {
  return sharp(base).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
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
