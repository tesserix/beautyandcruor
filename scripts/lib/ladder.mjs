/**
 * The derivative ladder: one original in, the set of files the site serves out.
 *
 * Extracted from scripts/images.mjs so that scripts/derive-uploads.mjs can
 * produce byte-identical output for an image she uploads. Two copies of this
 * would drift, and the drift would be invisible: a newly uploaded photograph
 * encoded at slightly different settings still looks fine, it just is not the
 * same pipeline any more, and the content hashes stop meaning what they say.
 *
 * Ladder is derived from the mobile-first layout, not from convention:
 *   390 CSS px full-bleed @3x -> 1170   (iPhone 12/13/14/15 baseline)
 *   430 CSS px full-bleed @3x -> 1290   (Pro Max, the widest phone we target)
 *   768 CSS px full-bleed @2x -> 1536
 *   Desktop grid tops out around 2560 for a full-bleed hero.
 *
 * Formats: AVIF + WebP across the full ladder, plus ONE JPEG at 1080 as the
 * <img> fallback. WebP is universal from Safari 14, so the JPEG only exists
 * for genuinely ancient clients and doesn't need its own ladder.
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, extname, basename } from 'node:path';

export const WIDTHS = [400, 780, 1080, 1290, 1536, 1920, 2560];
export const JPEG_FALLBACK_WIDTH = 1080;
export const LQIP_WIDTH = 24;

// Encoder settings. AVIF effort 4 is the knee of the quality/time curve; effort 9
// costs ~6x the build time for low single-digit percent size gain.
export const AVIF = { quality: 50, effort: 4, chromaSubsampling: '4:2:0' };
export const WEBP = { quality: 74, effort: 5 };
export const JPEG = { quality: 78, mozjpeg: true, progressive: true };

/**
 * Formats the pipeline cannot process.
 *
 * .heic and .heif are here because this libvips has libheif but no HEVC
 * decoder: sharp reads the header and then fails on the pixels. The upload
 * endpoint refuses them for the same reason and says so — see
 * enquiry/upload.go, and the test that asserts the two lists agree.
 */
export const SKIP_EXT = new Set(['.mp4', '.mov', '.webm', '.svg', '.gif', '.heic', '.heif']);

/**
 * Content-addressed names.
 *
 * The hash covers the source bytes AND the encoder settings, so retuning the
 * encoder produces new filenames. Rewriting a changed image at the same path
 * would have served the stale one from Cloudflare and from every browser that
 * had seen it — for the full year of the max-age.
 */
export function variantHash(srcDigest, fmt, w, opts) {
  return createHash('sha256')
    .update(`${srcDigest}|${fmt}|${w}|${JSON.stringify(opts)}`)
    .digest('hex')
    .slice(0, 8);
}

/**
 * Derive one image.
 *
 * `srcRoot` is what the manifest key is relative to; `outRoot` is where the
 * derivatives land. images.mjs passes the recovered library and public/img;
 * derive-uploads.mjs passes a temp directory and a staging directory, and gets
 * the same bytes either way.
 */
export async function processOne(src, { srcRoot, outRoot, force = false } = {}) {
  const meta = await sharp(src).metadata();
  if (!meta.width || !meta.height) throw new Error('no dimensions');

  // One read of the original, reused for every derivative's hash.
  const srcDigest = createHash('sha256').update(await readFile(src)).digest('hex');

  const rel = relative(srcRoot, src);
  const key = rel.replace(/\.[^.]+$/, '');
  const outDir = join(outRoot, dirname(rel));
  await mkdir(outDir, { recursive: true });
  const stem = basename(rel, extname(rel));

  // Never upscale: a 900px original gets a ladder that stops at 900.
  const ladder = WIDTHS.filter(w => w <= meta.width);
  if (ladder.length === 0) ladder.push(meta.width);

  const variants = { avif: [], webp: [] };
  for (const w of ladder) {
    const h = Math.round((meta.height / meta.width) * w);
    for (const [fmt, opts] of [['avif', AVIF], ['webp', WEBP]]) {
      const outPath = join(outDir, `${stem}-${w}.${variantHash(srcDigest, fmt, w, opts)}.${fmt}`);
      if (force || !existsSync(outPath)) {
        await sharp(src).rotate().resize(w).toFormat(fmt, opts).toFile(outPath);
      }
      variants[fmt].push({ w, h, src: '/' + relative(outRoot.replace(/\/img$/, ''), outPath) });
    }
  }

  const fw = Math.min(JPEG_FALLBACK_WIDTH, meta.width);
  const fbPath = join(outDir, `${stem}-${fw}.${variantHash(srcDigest, 'jpg', fw, JPEG)}.jpg`);
  if (force || !existsSync(fbPath)) {
    await sharp(src).rotate().resize(fw).jpeg(JPEG).toFile(fbPath);
  }

  // Inline LQIP: tiny enough to sit in the HTML without hurting the JS budget,
  // and it removes the grey-flash that a portfolio really can't afford on 4G.
  const lqipBuf = await sharp(src).rotate().resize(LQIP_WIDTH).webp({ quality: 20 }).toBuffer();

  return {
    key,
    src: rel,
    width: meta.width,
    height: meta.height,
    aspect: +(meta.width / meta.height).toFixed(4),
    orientation: meta.width / meta.height < 0.9 ? 'portrait' : meta.width / meta.height > 1.1 ? 'landscape' : 'square',
    retinaFloor: meta.width < 1170,   // cannot go full-bleed on a 390@3x screen
    avif: variants.avif,
    webp: variants.webp,
    fallback: { w: fw, src: '/' + relative(outRoot.replace(/\/img$/, ''), fbPath) },
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
  };
}
