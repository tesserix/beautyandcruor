/**
 * Builds the favicon set from the logo itself. Run by hand, not at build time:
 *
 *   node scripts/icons.mjs
 *
 * The output is committed. It is derived from public/brand/logo-mask.svg, so
 * regenerating it in the container would work — but there is no reason to run
 * it on every build for a file that changes when the logo does and never
 * otherwise.
 *
 * WHY A CROP, NOT THE WHOLE MARK
 *
 * The mark is 1067x327 — a 3.26:1 script signature. Fitted into a 32px square
 * the lettering is roughly four pixels tall and reads as a grey smear. What
 * survives at that size is the botanical emblem it opens with: a bold, nearly
 * square shape at 225x245, legible down to 16px.
 *
 * The heart loop is deliberately left out. It interlocks with the B of
 * "Beauty", so every crop wide enough to include it also clips a letterform,
 * which reads as damage rather than as design. The leaves stand alone.
 *
 * An earlier version set an ampersand instead, on b-plaster's reasoning that
 * "the ampersand is the mark". That was a proposal for a direction this build
 * did not take, and using the artist's own mark is the better answer.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const INK = "#07070A";
const CHALK = "#F2EFEA";

/**
 * The emblem's box within the 1067x327 mark, measured off the render.
 *
 * Chosen by rendering the candidates at a true 32px rather than judging them
 * at poster size. Wider crops pull in the heart loop, which interlocks with
 * the B of "Beauty": every rectangle big enough to hold the whole loop also
 * clips a letterform, and a clipped letter reads as damage. This takes the
 * three leaves and the stem, which stand on their own.
 */
const EMBLEM = { left: 55, top: 118, width: 200, height: 175 };

/** Fraction of the icon the emblem occupies, leaving margin so it can breathe. */
const INSET = 0.78;

const mark = readFileSync("public/brand/logo-mask.svg", "utf8")
  // The mask ships as black shapes; the mark is chalk on this site.
  .replace('fill="#000"', `fill="${CHALK}"`)
  .replace("<svg ", '<svg width="1067" height="327" ');

const full = await sharp({
  create: { width: 1067, height: 327, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: Buffer.from(mark) }])
  .png()
  .toBuffer();

const emblem = await sharp(full).extract(EMBLEM).png().toBuffer();

/** One square icon at the given size. */
async function icon(size) {
  const inner = Math.round(size * INSET);
  const fitted = await sharp(emblem)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: fitted, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO wrapping a PNG. Every browser that still asks for /favicon.ico supports
 * PNG-in-ICO, so this is a 22-byte header around the 32px icon rather than a
 * bitmap encoder.
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
