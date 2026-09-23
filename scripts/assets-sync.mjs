/**
 * Works out which image derivatives may be published, stages them, and syncs
 * them to the GCS bucket that fronts the CDN.
 *
 * WHY THIS IS NOT `gcloud storage rsync public/img`
 * -------------------------------------------------
 * The pipeline builds derivatives for every recovered original — 276 images.
 * The site displays far fewer. The remainder is not spare capacity: per
 * docs/OPEN-QUESTIONS.md Q7 and Q8 the recovered library mixes portfolio work
 * with behind-the-scenes shots, phone snapshots and photographs of other
 * people, and model/photographer releases are still unresolved. Publishing all
 * of it to a public bucket would put images of third parties online that
 * nobody has cleared.
 *
 * So the publishable set is DERIVED from what the site actually references,
 * and everything else stays local. Add an image to a gallery and it ships on
 * the next sync; nothing has to be listed here by hand.
 *
 *   node scripts/assets-sync.mjs            # report only
 *   node scripts/assets-sync.mjs --upload   # report, then sync to the bucket
 *
 * The objects are content-hashed (see scripts/images.mjs), so `--no-clobber`
 * is correct: a name that already exists holds identical bytes.
 */
import { readFile, readdir, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const MANIFEST = 'src/generated/images.json';
const GALLERIES = 'src/content/galleries.json';
const LIVE = 'capture/live-images.json';
const CLEARED = 'src/content/cleared-images.json';
const STAGE = '.assets-stage';
/**
 * PUBLIC bucket — CDN origin, holds only the derivatives the site references.
 * Naming follows the estate's systematic convention: {product}-{env}-{purpose}-in
 * ("in" = asia-south1), as used by fanzone-prod-assets-in and doc-int-prod-*-in.
 *
 * The SOURCE originals live in gs://beautyandcruor-prod-originals-in, which is
 * private with public-access-prevention enforced. They are the pipeline's
 * input and include material nobody has cleared for publication — they must
 * never be served.
 */
const BUCKET = process.env.ASSET_BUCKET ?? 'gs://beautyandcruor-prod-assets-in';
/** One year, immutable — safe only because every object name carries a content hash. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

/**
 * Every place an image key can enter the site. Miss one and its images 404 in
 * production while working perfectly in dev, because dev serves the whole of
 * public/img regardless of what is published.
 */
async function referencedKeys() {
  const keys = new Set();

  // 1. Curated galleries — hero, each discipline, the artist portrait.
  const galleries = JSON.parse(await readFile(GALLERIES, 'utf8'));
  for (const v of Object.values(galleries)) {
    if (Array.isArray(v)) v.forEach((k) => keys.add(k));
    else if (typeof v === 'string') keys.add(v);
  }

  // 2. Literal imageKey="..." in components and MDX post bodies. The posts
  //    reference images that appear in no gallery at all.
  for (const dir of ['src/app', 'src/components', 'src/content/posts']) {
    if (!existsSync(dir)) continue;
    for await (const f of walk(dir)) {
      if (!/\.(tsx|ts|mdx|md)$/.test(f)) continue;
      const body = await readFile(f, 'utf8');
      for (const m of body.matchAll(/imageKey=\{?"([^"]+)"/g)) keys.add(m[1]);
    }
  }

  // 3. The showreel poster, once a reel is cut.
  const reel = await readFile('src/content/showreel.ts', 'utf8').catch(() => '');
  const poster = reel.match(/posterKey:\s*["']([^"']+)["']/);
  if (poster) keys.add(poster[1]);

  return keys;
}

/**
 * Identity of an image across WordPress's many names for the same file.
 *
 * WordPress serves one upload under several names — `x.jpg`, `x-scaled.jpg`,
 * `x-1024x768.jpg`, `x-edited-1.jpg` — so a live page referencing a thumbnail
 * has to match the manifest key for the original. Directory is kept in the
 * identity: without it `2022/09/1` and `2023/01/1` collide.
 */
function identity(path) {
  const dir = dirname(path);
  const file = basename(path).replace(/\.[^.]+$/, '');
  const stem = file
    .replace(/-\d+x\d+$/, '')
    .replace(/(-scaled|-edited(-\d+)?|-rotated)$/, '')
    .toLowerCase();
  return `${dir}/${stem}`;
}

/**
 * The images Parimiti actually published, as evidence rather than assumption.
 *
 * capture/live-images.json is a crawl of every URL the WordPress site exposed,
 * recording which images each page really rendered. An image in there was
 * already public on her own site; publishing it again discloses nothing new.
 *
 * Anything else is unvetted — see src/content/cleared-images.json for why that
 * distinction is load-bearing while Q7/Q8 are open.
 */
async function vettedIdentities() {
  let live;
  try {
    live = JSON.parse(await readFile(LIVE, 'utf8'));
  } catch {
    // Default deny. A missing record is not permission — and it cannot be
    // regenerated now the WordPress site is being decommissioned.
    console.error(`\nCannot read ${LIVE}, which is the record of what was actually published.`);
    console.error('Refusing to upload without it.');
    process.exit(1);
  }
  const liveIds = new Set(Object.keys(live.photos ?? {}).map(identity));

  const cleared = JSON.parse(await readFile(CLEARED, 'utf8'));
  const clearedIds = new Set((cleared.cleared ?? []).map(identity));
  return { liveIds, clearedIds };
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const keys = await referencedKeys();

// A referenced key with no manifest entry is a broken image in production.
// Fail here rather than shipping it.
const missing = [...keys].filter((k) => !manifest[k]);
if (missing.length) {
  console.error(`\n${missing.length} referenced image(s) are not in the manifest:`);
  missing.forEach((k) => console.error(`  ${k}`));
  console.error('\nRun `npm run images` to rebuild the manifest.');
  process.exit(1);
}

function filesFor(key) {
  const e = manifest[key];
  return [...e.avif, ...e.webp].map((v) => v.src).concat(e.fallback.src);
}

// The rights gate. Anything the site references that was never published and
// has not been explicitly cleared stops the sync.
const { liveIds, clearedIds } = await vettedIdentities();
// Reported separately so the three numbers add up to the referenced total and
// nothing hides inside another bucket.
/**
 * Vetting matches on the ORIGINAL upload path, never the manifest key.
 *
 * Keys are now public names assigned by scripts/organize.mjs (`sfx/sfx-001`),
 * which say nothing about where the image came from. capture/live-images.json
 * records WordPress paths, so `sourcePath` is the only thing the two share —
 * and it is why organize.mjs preserves it.
 */
const originOf = (k) => identity(manifest[k].sourcePath ?? manifest[k].src);
const fromLive = [...keys].filter((k) => liveIds.has(originOf(k)));
const fromCleared = [...keys].filter((k) => !liveIds.has(originOf(k)) && clearedIds.has(originOf(k)));
const unvetted = [...keys].filter((k) => !liveIds.has(originOf(k)) && !clearedIds.has(originOf(k)));

const publish = [...keys].flatMap(filesFor);
const withheldKeys = Object.keys(manifest).filter((k) => !keys.has(k));

const { statSync } = await import('node:fs');
const sizeOf = (list) =>
  list.reduce((n, s) => (existsSync('public' + s) ? n + statSync('public' + s).size : n), 0);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`referenced  : ${keys.size} images, ${publish.length} files, ${mb(sizeOf(publish))}`);
console.log(`  published on the old site : ${fromLive.length}`);
console.log(`  explicitly cleared        : ${fromCleared.length}`);
console.log(`  UNVETTED                  : ${unvetted.length}`);
console.log(`withheld    : ${withheldKeys.length} images not referenced by the site — kept local`);
console.log(`bucket      : ${BUCKET}`);

if (unvetted.length) {
  console.error(`\n${'='.repeat(70)}`);
  console.error(`REFUSING TO SYNC — ${unvetted.length} referenced image(s) were never published.`);
  console.error('='.repeat(70));
  unvetted.forEach((k) =>
    console.error(`  ${k}   (from ${manifest[k].sourcePath ?? manifest[k].src})`)
  );
  console.error(
    '\nThese appear in no page of the live site, so there is no evidence Parimiti\n' +
      'chose to publish them. The recovered library mixes portfolio work with\n' +
      'behind-the-scenes shots and photographs of other people, and model releases\n' +
      'are unconfirmed (docs/OPEN-QUESTIONS.md Q7, Q8).\n\n' +
      'Resolve each one, do not bypass:\n' +
      '  - drop it from src/content/galleries.json (or wherever it is referenced), or\n' +
      '  - once SHE confirms it, add the key to src/content/cleared-images.json\n' +
      '    with who confirmed it and when in `provenance`.\n\n' +
      'Skipping them silently is not an option: the site references them, so they\n' +
      'would render as broken images in production.'
  );
  process.exit(1);
}

if (!process.argv.includes('--upload')) {
  console.log('\nreport only — pass --upload to sync');
  process.exit(0);
}

// Stage only the publishable files, so the upload cannot accidentally widen.
await rm(STAGE, { recursive: true, force: true });
for (const src of publish) {
  const from = 'public' + src;
  const to = join(STAGE, src.replace(/^\//, ''));
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
}

const args = [
  'storage', 'cp', '--recursive', '--no-clobber',
  `--cache-control=${CACHE_CONTROL}`,
  join(STAGE, 'img'), `${BUCKET}/`,
];
console.log(`\ngcloud ${args.join(' ')}`);
const r = spawnSync('gcloud', args, { stdio: 'inherit' });
await rm(STAGE, { recursive: true, force: true });
process.exit(r.status ?? 1);
