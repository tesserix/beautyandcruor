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
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const W = 1200;
const H = 630;
const INK = "#07070A";
const CHALK = "#F2EFEA";
const ASH = "#8C8780";

const PORTRAIT_DIR = "public/img/artist";
const OUT = "public/og.jpg";

/**
 * Widest webp the artist folder holds — sharpest source to downscale from.
 *
 * Absent inside the container: .dockerignore excludes public/img/ because the
 * derivatives live in GCS, and shipping them would add ~165MB to every push.
 * So this returns null there, and the card is built without the photograph
 * rather than failing the image build over a decorative asset.
 */
function portraitSource() {
  if (!existsSync(PORTRAIT_DIR)) return null;
  const files = readdirSync(PORTRAIT_DIR).filter((f) => f.endsWith(".webp"));
  if (files.length === 0) return null;
  const widthOf = (f) => Number(f.match(/-(\d+)\./)?.[1] ?? 0);
  return join(PORTRAIT_DIR, files.sort((a, b) => widthOf(b) - widthOf(a))[0]);
}

const MARK_W = 300;

/**
 * The card carries the lockup as an image now, not a recoloured mask.
 *
 * It used to read the mark's viewBox and recolour its fill, which only worked
 * while the mark was one colour and geometry. It is cream and red artwork on a
 * transparent ground, so there is nothing to recolour — the card's ground is
 * already ink, which is the ground it was drawn for.
 */
const markFile = "brand/lockup.png";
const markMeta = await sharp(markFile).metadata();
const markRatio = markMeta.width / markMeta.height;
const markImage = await sharp(markFile)
  .resize({ width: MARK_W, withoutEnlargement: true })
  .png()
  .toBuffer();

const PANEL = 560; // where the photograph starts

const src = portraitSource();

// The committed card already has the portrait composited in. Regenerating it
// from a context that lacks the source would quietly replace it with the
// text-only fallback, so leave it alone instead.
if (!src && existsSync(OUT)) {
  console.log(`${OUT} exists and no portrait source is present — keeping it`);
  process.exit(0);
}

const layers = [];
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

layers.push({ input: markImage, left: 72, top: 150 });

// Supporting type under the mark. System faces only: librsvg has no access to
// the Google fonts the site loads at runtime, and a missing family renders as
// a fallback anyway — so the brand voice is carried by the mark above.
//
// "Prosthetics, SFX, hair and makeup" used to lead here. The mark now sets
// MAKEUP · SFX · PROSTHETICS in its own tagline, so that line said the same
// thing twice on one card.
const caption = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <text x="72" y="452" fill="${CHALK}" font-family="Georgia, 'Times New Roman', serif"
           font-size="32">for film and television</text>
     <text x="72" y="516" fill="${ASH}" font-family="'Courier New', monospace"
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

// statSync, not metadata().size — that field is only populated when sharp is
// handed a buffer, so reading it back from the path always reported 0KB.
console.log(`wrote ${OUT} — ${W}x${H}, ${Math.round(statSync(OUT).size / 1024)}KB`);
