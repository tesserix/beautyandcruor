/**
 * Build-time image pipeline.
 *
 * Static export means next/image has no runtime optimiser, so every derivative
 * is generated here and committed to the build. Components consume the emitted
 * manifest, never a raw file path.
 *
 * Ladder is derived from the mobile-first layout, not from convention:
 *   390 CSS px full-bleed @3x -> 1170   (iPhone 12/13/14/15 baseline)
 *   430 CSS px full-bleed @3x -> 1290   (Pro Max, the widest phone we target)
 *   768 CSS px full-bleed @2x -> 1536
 *   Desktop grid tops out around 2560 for a full-bleed hero.
 *
 * Formats: AVIF + WebP across the full ladder, plus ONE JPEG at 1080 as the
 * <img> fallback. WebP is universal from Safari 14, so the JPEG only exists for
 * genuinely ancient clients and doesn't need its own ladder.
 */
import sharp from 'sharp';
import pLimit from 'p-limit';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, extname, basename } from 'node:path';

/** Recursive walk — fs/promises.glob is Node 22+, and local dev is on 20. */
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/**
 * FULL-RESOLUTION originals, taken from the site's public_html bundle.
 *
 * NOT capture/assets/uploads — that directory holds what wp-json returned, and
 * the Media Library's `source_url` points at WordPress's `-scaled.jpg`, which
 * is capped at 2560px on the long edge. Every one of the 116 comparable pairs
 * was higher resolution on disk (1920x2560 captured vs 3024x4032 actual), so
 * building from the capture silently ceilinged the whole ladder.
 *
 * Built by deduplicating the bundle to one file per image, preferring the
 * largest. Gitignored — 502 MB. Backed up to gs://beautyandcruor-prod-originals-in.
 */
const SRC_ROOT = 'capture/assets/originals';
const OUT_ROOT = 'public/img';
const MANIFEST = 'src/generated/images.json';

const WIDTHS = [400, 780, 1080, 1290, 1536, 1920, 2560];
const JPEG_FALLBACK_WIDTH = 1080;
const LQIP_WIDTH = 24;

// Encoder settings. AVIF effort 4 is the knee of the quality/time curve; effort 9
// costs ~6x the build time for low single-digit percent size gain.
const AVIF = { quality: 50, effort: 4, chromaSubsampling: '4:2:0' };
const WEBP = { quality: 74, effort: 5 };
const JPEG = { quality: 78, mozjpeg: true, progressive: true };

const sample = process.argv.includes('--sample');
const force = process.argv.includes('--force');

const SKIP_EXT = new Set(['.mp4', '.mov', '.webm', '.svg', '.gif', '.heic', '.heif']);

async function listSources() {
  const out = [];
  for await (const f of walk(SRC_ROOT)) {
    const ext = extname(f).toLowerCase();
    if (SKIP_EXT.has(ext)) continue;
    if (!['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(ext)) continue;
    out.push(f);
  }
  return out.sort();
}

/** One representative image per distinct aspect bucket, for fast iteration. */
async function pickSample(files) {
  const seen = new Map();
  for (const f of files) {
    try {
      const { width, height } = await sharp(f).metadata();
      if (!width || !height) continue;
      const key = (width / height).toFixed(2);
      if (!seen.has(key)) seen.set(key, { f, width, height });
    } catch {}
  }
  return [...seen.values()].sort((a, b) => b.width - a.width).slice(0, 12).map(s => s.f);
}

/**
 * Short, deterministic content hash for one derivative.
 *
 * Derived from the SOURCE bytes plus the exact encode parameters, never from
 * the output — so it is knowable before encoding and the "does this file
 * already exist" check still works. Re-crop a photo or retune the encoder and
 * the name changes; leave both alone and it does not.
 *
 * This is what makes `Cache-Control: immutable` safe on the CDN. The old names
 * (`stem-1290.avif`) were stable across content changes, so replacing an image
 * at the same path would have served the stale one from Cloudflare and from
 * every browser that had seen it — for the full year of the max-age.
 */
function variantHash(srcDigest, fmt, w, opts) {
  return createHash('sha256')
    .update(`${srcDigest}|${fmt}|${w}|${JSON.stringify(opts)}`)
    .digest('hex')
    .slice(0, 8);
}

async function processOne(src) {
  const meta = await sharp(src).metadata();
  if (!meta.width || !meta.height) throw new Error('no dimensions');

  // One read of the original, reused for every derivative's hash.
  const srcDigest = createHash('sha256').update(await readFile(src)).digest('hex');

  const rel = relative(SRC_ROOT, src);
  const key = rel.replace(/\.[^.]+$/, '');
  const outDir = join(OUT_ROOT, dirname(rel));
  await mkdir(outDir, { recursive: true });
  const stem = basename(rel, extname(rel));

  // Never upscale: a 900px original gets a ladder that stops at 900.
  const ladder = WIDTHS.filter(w => w <= meta.width);
  if (ladder.length === 0) ladder.push(meta.width);

  const variants = { avif: [], webp: [] };
  const written = [];

  for (const w of ladder) {
    const h = Math.round((meta.height / meta.width) * w);
    for (const [fmt, opts] of [['avif', AVIF], ['webp', WEBP]]) {
      const outPath = join(outDir, `${stem}-${w}.${variantHash(srcDigest, fmt, w, opts)}.${fmt}`);
      if (force || !existsSync(outPath)) {
        await sharp(src).rotate().resize(w).toFormat(fmt, opts).toFile(outPath);
      }
      variants[fmt].push({ w, h, src: '/' + relative('public', outPath) });
      written.push(outPath);
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
    fallback: { w: fw, src: '/' + relative('public', fbPath) },
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
  };
}

const all = await listSources();
const files = sample ? await pickSample(all) : all;
console.log(`${all.length} source images; processing ${files.length}${sample ? ' (sample)' : ''}`);

const limit = pLimit(Math.max(2, (await import('node:os')).cpus().length - 1));
const t0 = Date.now();
let done = 0, failed = [];

const entries = await Promise.all(files.map(f => limit(async () => {
  try {
    const e = await processOne(f);
    if (++done % 10 === 0 || done === files.length) {
      process.stdout.write(`\r  ${done}/${files.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    return e;
  } catch (err) {
    failed.push(`${f}: ${err.message}`);
    return null;
  }
})));
console.log();

const manifest = Object.fromEntries(entries.filter(Boolean).map(e => [e.key, e]));
await mkdir(dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(manifest, null, sample ? 2 : 0));

console.log(`\nmanifest: ${MANIFEST} (${Object.keys(manifest).length} images)`);
if (failed.length) { console.log(`\n${failed.length} failed:`); failed.slice(0, 10).forEach(f => console.log('  ' + f)); }

const below = entries.filter(e => e?.retinaFloor).length;
console.log(`${below} images are below the 1170px retina floor for 390@3x full-bleed`);
console.log(`elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
