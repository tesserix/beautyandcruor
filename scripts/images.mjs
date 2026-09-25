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
import { existsSync } from 'node:fs';
import pLimit from 'p-limit';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, extname } from 'node:path';
import {
  AVIF, JPEG, WEBP, WIDTHS, JPEG_FALLBACK_WIDTH, LQIP_WIDTH, SKIP_EXT,
  processOne,
} from './lib/ladder.mjs';

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
/**
 * --sample derives a dozen representative images to eyeball encoder settings.
 * It used to write this same file, so a sample run replaced a 280-image
 * manifest with 12 and the site lost almost every photograph until someone
 * spent fifteen minutes regenerating it. A sample is not a manifest; it gets
 * its own path.
 */
const MANIFEST = process.argv.includes('--sample')
  ? 'src/generated/images.sample.json'
  : 'src/generated/images.json';

const sample = process.argv.includes('--sample');
const force = process.argv.includes('--force');

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
    } catch (err) {
      // Only an unreadable image is expected here. Swallowing everything once
      // turned a missing `sharp` import into "no images matched", and the run
      // went on to write an empty manifest over the real one.
      if (err instanceof ReferenceError || err instanceof TypeError) throw err;
    }
  }
  return [...seen.values()].sort((a, b) => b.width - a.width).slice(0, 12).map(s => s.f);
}


const all = await listSources();
const files = sample ? await pickSample(all) : all;
console.log(`${all.length} source images; processing ${files.length}${sample ? ' (sample)' : ''}`);

const limit = pLimit(Math.max(2, (await import('node:os')).cpus().length - 1));
const t0 = Date.now();
let done = 0, failed = [];

const entries = await Promise.all(files.map(f => limit(async () => {
  try {
    const e = await processOne(f, { srcRoot: SRC_ROOT, outRoot: OUT_ROOT, force });
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

// An empty result is never a legitimate outcome when a manifest already
// exists: the library does not vanish. It means the walk found nothing —
// a wrong working directory, an unreadable SRC_ROOT, a swallowed error —
// and writing it would destroy the real manifest, which is not reproducible
// in under fifteen minutes. Refuse rather than overwrite.
if (!Object.keys(manifest).length && existsSync(MANIFEST)) {
  const held = Object.keys(JSON.parse(await readFile(MANIFEST, 'utf8'))).length;
  if (held) {
    console.error(`\nrefusing to overwrite ${MANIFEST}: it holds ${held} images and this run produced none.`);
    console.error(`nothing was read from ${SRC_ROOT}. Check the working directory, or pass --force if that is genuinely intended.`);
    process.exit(1);
  }
}

await mkdir(dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(manifest, null, sample ? 2 : 0));

console.log(`\nmanifest: ${MANIFEST} (${Object.keys(manifest).length} images)`);
if (failed.length) { console.log(`\n${failed.length} failed:`); failed.slice(0, 10).forEach(f => console.log('  ' + f)); }

const below = entries.filter(e => e?.retinaFloor).length;
console.log(`${below} images are below the 1170px retina floor for 390@3x full-bleed`);
console.log(`elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
