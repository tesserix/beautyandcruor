/**
 * Builds public/og.jpg — the card every share of this site renders as.
 *
 * Until now `localBusinessSchemas()` pointed `image` at /og.jpg and nothing
 * produced it, so the schema referenced a 404 and every WhatsApp, Slack or
 * LinkedIn share of a visual portfolio rendered as a bare text card
 * (docs/OPEN-QUESTIONS.md, SEO gap 2).
 *
 * Composed rather than photographed: the wordmark is the logo's own paths, so
 * the card needs no webfont at build time and cannot drift from the brand.
 * The portrait is the one already published on /about-me/, so this introduces
 * no image she has not published herself.
 *
 *   node scripts/og.mjs
 */
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const W = 1200;
const H = 630;
const INK = "#07070A";
const CHALK = "#F2EFEA";
const ASH = "#8C8780";

const PORTRAIT_DIR = "public/img/artist";
const OUT = "public/og.jpg";

/** Widest webp the artist folder holds — sharpest source to downscale from. */
function portraitSource() {
  const files = readdirSync(PORTRAIT_DIR).filter((f) => f.endsWith(".webp"));
  if (files.length === 0) return null;
  const widthOf = (f) => Number(f.match(/-(\d+)\./)?.[1] ?? 0);
  return join(PORTRAIT_DIR, files.sort((a, b) => widthOf(b) - widthOf(a))[0]);
}

const MARK_W = 420;
const mark = readFileSync("public/brand/logo-mask.svg", "utf8");
// The mask is black-on-transparent at 1067x327; recolour to chalk and scale.
const markChalk = mark
  .replace('fill="#000"', `fill="${CHALK}"`)
  .replace("<svg ", `<svg width="${MARK_W}" height="${Math.round((MARK_W * 327) / 1067)}" `);

const PANEL = 560; // where the photograph starts

const layers = [];

const src = portraitSource();
if (src) {
  const photo = await sharp(src)
    .resize(W - PANEL, H, { fit: "cover", position: "attention" })
    .toBuffer();
  layers.push({ input: photo, left: PANEL, top: 0 });

  // Feathers the photograph into the ink panel so the type never sits on a
  // hard vertical seam.
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W - PANEL}" height="${H}">
       <defs><linearGradient id="f" x1="0" x2="1">
         <stop offset="0" stop-color="${INK}" stop-opacity="1"/>
         <stop offset="0.42" stop-color="${INK}" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#f)"/>
     </svg>`,
  );
  layers.push({ input: fade, left: PANEL, top: 0 });
}

layers.push({ input: Buffer.from(markChalk), left: 72, top: 150 });

// Two lines of supporting type. System faces only: librsvg has no access to
// the Google fonts the site loads at runtime, and a missing family renders as
// a fallback anyway — so the brand voice is carried by the mark above.
const caption = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <text x="72" y="330" fill="${CHALK}" font-family="Georgia, 'Times New Roman', serif"
           font-size="34">Prosthetics, SFX, hair and makeup</text>
     <text x="72" y="382" fill="${ASH}" font-family="Georgia, 'Times New Roman', serif"
           font-size="26">for film and television</text>
     <text x="72" y="470" fill="${ASH}" font-family="'Courier New', monospace"
           font-size="19" letter-spacing="4">SYDNEY · MUMBAI</text>
   </svg>`,
);
layers.push({ input: caption, left: 0, top: 0 });

await sharp({
  create: { width: W, height: H, channels: 3, background: INK },
})
  .composite(layers)
  .jpeg({ quality: 86, progressive: true, chromaSubsampling: "4:4:4" })
  .toFile(OUT);

const { size } = await sharp(OUT).metadata();
console.log(`wrote ${OUT} — ${W}x${H}, ${Math.round((size ?? 0) / 1024)}KB`);
