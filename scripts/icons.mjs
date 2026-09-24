/**
 * Builds the favicon set from the logo's own emblem. Run by hand:
 *
 *   node scripts/icons.mjs
 *
 * The output is committed. It changes when the logo does and never otherwise,
 * so there is no reason to run it on every build.
 *
 * WHAT IT DRAWS
 *
 * The heart loop, its leaves and the stem — in the mark's own green, on a
 * transparent ground. This matches the icon the WordPress site has always
 * used, which is what people recognise in a tab.
 *
 * It is composed from the mark's paths rather than cropped out of a render.
 * logo-mask.svg keeps the emblem and the lettering as separate paths, so the
 * emblem can be taken whole. Cropping cannot: the loop interlocks with the B
 * of "Beauty", so every rectangle containing the loop also contains part of a
 * letter. That is exactly what the WordPress icon suffers from — it is a crop,
 * and a grey B sits inside the heart at every size. Composing from paths gives
 * the same emblem with nothing else in it.
 *
 * Transparent rather than on a plate, so it sits on whatever the browser's tab
 * strip happens to be.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

/** The mark's own green (--color-leaf), as the WordPress icon uses it. */
const LEAF = "#7AC943";

/**
 * Path indices in logo-mask.svg.
 *
 *   0  the heart loop, the outer leaves and the stem
 *   2  the leaf standing inside the loop
 *   9  a small accent on the stem
 *
 * Everything else is a letterform: 4 is "B", 7 "auty", 8 "&", 5 "Cruor".
 */
const EMBLEM_PATHS = [0, 2, 9];

/** Fraction of the icon the emblem fills, leaving it room to breathe. */
const INSET = 0.86;

const src = readFileSync("public/brand/logo-mask.svg", "utf8");
const head = src.slice(0, src.indexOf(">", src.indexOf("<g")) + 1);
const paths = src.match(/<path\b[^>]*?\/>|<path\b[\s\S]*?<\/path>/g) ?? [];

if (paths.length < 10) {
  throw new Error(
    `scripts/icons.mjs: expected the 10 paths of logo-mask.svg, found ${paths.length}. ` +
      "If the mark was redrawn, re-identify EMBLEM_PATHS before trusting this.",
  );
}

const svg =
  head
    .replace("<svg ", '<svg width="1067" height="327" ')
    .replace('fill="#000"', `fill="${LEAF}"`) +
  EMBLEM_PATHS.map((i) => paths[i]).join("") +
  "</g></svg>";

// Rendered large and trimmed to its real ink, so the emblem's own bounds drive
// the framing rather than the full mark's 1067x327 canvas.
const emblem = await sharp(Buffer.from(svg), { density: 600 })
  .resize(2134, 654, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const trimmed = await sharp(emblem).trim().png().toBuffer();

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
