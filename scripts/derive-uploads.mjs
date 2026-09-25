/**
 * Turns an uploaded original into images the site can serve.
 *
 * She uploads through /admin; the sidecar stores the original under uploads/
 * in the assets bucket and appends a line to pending-uploads.json. Nothing
 * appears on the site at that point, and deliberately so: the site never
 * serves an original, only the ladder of seven widths in AVIF and WebP that
 * scripts/lib/ladder.mjs produces, and that needs libvips and minutes of CPU
 * per photograph — which is why it runs here and not in an HTTP handler.
 *
 * This is the other half. For each pending upload it:
 *
 *   downloads the original       gs://…/uploads/<gallery>/<file>
 *   derives the ladder           the SAME code images.mjs uses, so the output
 *                                is byte-identical to the recovered library
 *   uploads the derivatives      gs://…/img/<gallery>/
 *   writes the manifest entry    src/generated/images.json
 *   adds it to its gallery       src/content/galleries.json
 *   clears it for publication    src/content/cleared-images.json
 *   records her alt text         src/content/alt.json
 *   empties the pending list
 *
 * Then commits, which builds, which deploys. The image appears on the site a
 * few minutes after she pressed upload.
 *
 * WHY NOT JUST RUN images.mjs
 *
 * It walks the whole recovered library — 290 originals, 225MB that are not in
 * the repository — and would have to fetch all of them to derive one. This
 * fetches what is pending and nothing else.
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { processOne, SKIP_EXT } from './lib/ladder.mjs';
import { identity } from '../src/lib/identity.mjs';

const BUCKET = process.env.ASSET_BUCKET ?? 'gs://beautyandcruor-prod-assets-in';
const PENDING = 'src/content/pending-uploads.json';
const MANIFEST = 'src/generated/images.json';
const GALLERIES = 'src/content/galleries.json';
const CLEARED = 'src/content/cleared-images.json';
const ALT = 'src/content/alt.json';
const WORK = '.derive-work';
const dry = process.argv.includes('--dry-run');

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const writeJson = async (p, v, nl = false) =>
  writeFile(p, JSON.stringify(v, null, 2) + (nl ? '\n' : ''));

function gcloud(args, { quiet = false } = {}) {
  const r = spawnSync('gcloud', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`gcloud ${args.slice(0, 3).join(' ')} failed: ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  }
  if (!quiet && r.stdout.trim()) console.log('  ' + r.stdout.trim().split('\n').slice(-1)[0]);
  return r.stdout;
}

if (!existsSync(PENDING)) {
  console.log('nothing pending — no uploads to derive');
  process.exit(0);
}
const pending = await readJson(PENDING);
if (!pending.length) {
  console.log('nothing pending — no uploads to derive');
  process.exit(0);
}
console.log(`${pending.length} upload(s) to derive\n`);

const manifest = await readJson(MANIFEST);
const galleries = await readJson(GALLERIES);
const cleared = await readJson(CLEARED);
const alt = await readJson(ALT);

/**
 * Derivative names are content hashes, so the ladder of an image already in
 * the manifest is a fingerprint of it. Re-uploading a photograph that is
 * already on the site would otherwise publish it twice under a second key —
 * which is what a test upload of an already-published original did.
 *
 * The whole tuple, not one width: an 8-hex hash has a real collision chance
 * across ~2800 derivatives, and the tuple makes that vanish.
 */
const fingerprint = (e) =>
  e.avif.map((v) => v.src.match(/\.([0-9a-f]+)\./)?.[1] ?? '').join(',');
const alreadyPublished = new Map(
  Object.entries(manifest)
    .filter(([, e]) => Array.isArray(e.avif) && e.avif.length)
    .map(([k, e]) => [fingerprint(e), k]),
);

/** The next free key in a gallery: sfx/sfx-001, sfx/sfx-002, … */
function nextKey(gallery) {
  const used = Object.keys(manifest)
    .filter((k) => k.startsWith(`${gallery}/`))
    .map((k) => parseInt(k.slice(k.lastIndexOf('-') + 1), 10))
    .filter(Number.isFinite);
  const n = (used.length ? Math.max(...used) : 0) + 1;
  return `${gallery}/${gallery}-${String(n).padStart(3, '0')}`;
}

await rm(WORK, { recursive: true, force: true });
await mkdir(join(WORK, 'src'), { recursive: true });
await mkdir(join(WORK, 'img'), { recursive: true });

const done = [];
const skipped = [];
for (const entry of pending) {
  // upload.go records the folder it filed the object under; trust that rather
  // than re-deriving it from the path, which would silently disagree if the
  // naming ever changes.
  const gallery = entry.gallery ?? entry.object.split('/')[1] ?? 'unsorted';
  console.log(`${entry.originalName}  ->  ${gallery}`);

  if (gallery === 'unsorted') {
    console.log('  skipped: not filed under a gallery, so there is nowhere to publish it');
    skipped.push({ name: entry.originalName, why: 'no gallery' });
    continue;
  }
  if (!galleries[gallery]) {
    console.log(`  skipped: "${gallery}" is not a gallery in galleries.json`);
    skipped.push({ name: entry.originalName, why: `"${gallery}" is not a gallery` });
    continue;
  }
  const ext = extname(entry.object).toLowerCase();
  if (SKIP_EXT.has(ext)) {
    console.log(`  skipped: ${ext} is not a format the ladder can read`);
    skipped.push({ name: entry.originalName, why: `${ext} cannot be derived` });
    continue;
  }
  if (!entry.alt?.trim()) {
    // alt-check.mjs fails the build for a published image with no alt text,
    // so publishing one without it would break the very build meant to ship
    // it. The upload form is where this is asked for.
    console.log('  skipped: no alt text, and a published image must have one');
    skipped.push({ name: entry.originalName, why: 'no alt text' });
    continue;
  }

  const key = nextKey(gallery);
  const local = join(WORK, 'src', `${basename(key)}${ext}`);
  console.log(`  key: ${key}`);
  if (dry) { console.log('  (dry run)'); continue; }

  gcloud(['storage', 'cp', `${BUCKET}/${entry.object}`, local], { quiet: true });

  // Derived under WORK/img/<gallery>/ so the emitted paths read /img/… exactly
  // as they do for the recovered library.
  await mkdir(join(WORK, 'img', gallery), { recursive: true });
  const staged = join(WORK, 'img', gallery, `${basename(key)}${ext}`);
  await writeFile(staged, await readFile(local));
  const record = await processOne(staged, { srcRoot: join(WORK, 'img'), outRoot: join(WORK, 'img') });
  await rm(staged);

  const dupe = alreadyPublished.get(fingerprint(record));
  if (dupe) {
    console.log(`  skipped: identical to ${dupe}, which is already published`);
    skipped.push({ name: entry.originalName, why: `already published as ${dupe}` });
    continue;
  }
  alreadyPublished.set(fingerprint(record), key);

  // processOne keys off the path it was given; this is its real name.
  record.key = key;
  record.src = entry.object;
  record.sourcePath = entry.object;
  manifest[key] = record;

  galleries[gallery].push(key);
  const id = identity(entry.object);
  alt[id] = entry.alt.trim();
  if (Array.isArray(cleared.cleared) && !cleared.cleared.includes(entry.object)) {
    // Her uploading her own work IS the consent the rights gate asks for.
    cleared.cleared.push(entry.object);
  }
  done.push({ key, object: entry.object });
  console.log(`  derived ${record.avif.length + record.webp.length + 1} files`);
}

// Upload the derivatives. --no-clobber because names are content-hashed: a
// name that already exists holds identical bytes.
if (done.length && !dry) {
  console.log('\nuploading derivatives');
  gcloud(['storage', 'cp', '--recursive', '--no-clobber', join(WORK, 'img'), `${BUCKET}/`]);
}

if (done.length) {
  await writeJson(MANIFEST, manifest);
  await writeJson(GALLERIES, galleries, true);
  await writeJson(CLEARED, cleared, true);
  await writeJson(ALT, alt, true);
}

// Cleared even when nothing derived. Every skip above is permanent — an
// unsorted upload stays unsorted, a HEIC stays undecodable, a duplicate stays
// a duplicate — so leaving the row in place only means re-running the same
// refusal on the next upload. The reasons go to the commit message instead,
// which is where someone will actually see them.
if (!dry) {
  await writeJson(PENDING, [], true);
}
await rm(WORK, { recursive: true, force: true });

console.log('');
if (done.length) console.log(`derived ${done.length}: ${done.map((d) => d.key).join(', ')}`);
if (skipped.length) {
  console.log(`skipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.name} — ${s.why}`);
}
if (!done.length && !skipped.length) console.log('nothing to do');

// The workflow puts this in the commit message so a refusal is visible in the
// history rather than only in a log that expires.
if (process.env.GITHUB_OUTPUT) {
  const summary = [
    done.length ? `derived ${done.map((d) => d.key).join(', ')}` : '',
    ...skipped.map((s) => `skipped ${s.name} (${s.why})`),
  ].filter(Boolean).join('; ');
  // GITHUB_OUTPUT is line-oriented; a newline in an uploaded filename would
  // otherwise end the value and have the rest parsed as another output.
  const oneLine = summary.replace(/[\r\n]+/g, ' ').slice(0, 900);
  await writeFile(process.env.GITHUB_OUTPUT, `summary=${oneLine}\n`, { flag: 'a' });
}
