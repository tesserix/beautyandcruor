/**
 * Builds the favicon set. Run by hand, not at build time:
 *
 *   node scripts/icons.mjs
 *
 * The glyph is rasterised here with a local serif, so the output must be
 * committed rather than regenerated inside the container, where that face does
 * not exist and the mark would silently change shape.
 *
 * WHY AN AMPERSAND, NOT THE MARK
 *
 * /favicon.ico 404'd, and the obvious fix — shrink the logo — does not work:
 * the mark is a wide botanical script signature at 1067x327, and at 32px it is
 * a grey smudge. b-plaster.src.html proposed the answer already: "the
 * ampersand, in cruor red, is the mark. It is the hinge the name is built on,
 * and it works at 12px as well as 120px."
 *
 * One departure from that note. It specifies a red ampersand, which suits the
 * bone ground that direction used; on our ink it lands around 2.8:1 and reads
 * near-black in a tab strip. The ampersand is cruor here by being the cruor
 * *field*, with the glyph knocked out in chalk — same idea, legible at 16px.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const CRUOR = "#B3111D";
const CHALK = "#F2EFEA";

/** The glyph, drawn to fill its box — sized per output so it stays crisp. */
const card = (size) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
     <rect width="${size}" height="${size}" fill="${CRUOR}"/>
     <text x="50%" y="50%" fill="${CHALK}"
           font-family="Georgia, 'Times New Roman', serif" font-style="italic"
           font-size="${Math.round(size * 0.78)}" font-weight="700"
           text-anchor="middle" dominant-baseline="central">&amp;</text>
   </svg>`,
);

const png = (size) => sharp(card(size)).png({ compressionLevel: 9 }).toBuffer();

/**
 * ICO wrapping a PNG. Every browser that still asks for /favicon.ico supports
 * PNG-in-ICO, so this is a 22-byte header around the 32px card rather than a
 * bitmap encoder.
 */
function ico(pngBuffer, size) {
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
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // offset
  return Buffer.concat([header, entry, pngBuffer]);
}

const outputs = [
  // Next's file conventions: it emits the <link> tags for these itself.
  ["src/app/icon.png", 64],
  ["src/app/apple-icon.png", 180],
];

for (const [path, size] of outputs) {
  writeFileSync(path, await png(size));
  console.log(`wrote ${path} — ${size}x${size}`);
}

const thirtyTwo = await png(32);
writeFileSync("src/app/favicon.ico", ico(thirtyTwo, 32));
console.log("wrote src/app/favicon.ico — 32x32 (PNG-in-ICO)");
