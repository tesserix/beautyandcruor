/**
 * Gives every image a public name and a category, and writes the galleries.
 *
 * Runs AFTER scripts/images.mjs. That script emits derivatives under the
 * source's own path (WordPress's year/month filing); this one moves them to
 * `<category>/<category>-<nnn>` and rewrites the manifest to match.
 *
 * WHY RENAME
 * ----------
 * These paths are public — they end up in the srcset of every page. The
 * WordPress names are camera dumps and worse: `WhatsApp-Image-2019-05-02-at-
 * 6.12.46-PM.jpeg`, `08CAB13B-0574-406D-830E-ADE463E3E637.jpg`. Year/month was
 * WordPress's filing system, not information.
 *
 * WHY NUMBERS AND NOT DESCRIPTIONS
 * --------------------------------
 * `sfx/burn-appliance-001` would be us inventing content. docs/OPEN-QUESTIONS.md
 * #9 is open: the real titles for the work shown are unknown and the existing
 * captions are ours, written from looking at the images. Numbers claim nothing.
 * Slugs can be added once she confirms titles.
 *
 * WHERE CATEGORIES COME FROM
 * --------------------------
 * capture/live-images.json — which of her own discipline pages displayed each
 * image. That is her categorisation, not ours.
 *
 * `sourcePath` is preserved on every entry. It is not decoration: the rights
 * gate in assets-sync.mjs matches against the live-site record by original
 * path, and it is the only trail back to the WordPress upload.
 *
 * Idempotent — recomputes the same targets and no-ops if files are in place.
 */
import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

const MANIFEST = 'src/generated/images.json';
const LIVE = 'capture/live-images.json';
const GALLERIES = 'src/content/galleries.json';
const CURATION = 'src/content/curation.json';
const OUT_ROOT = 'public/img';

/** Her own discipline pages -> our gallery keys. */
const PAGE2CAT = {
  'https://beautyandcruor.com/sfx-prosthetics/': 'sfx',
  'https://beautyandcruor.com/casting-sculpting/': 'casting',
  'https://beautyandcruor.com/film-television/': 'film',
  'https://beautyandcruor.com/editorial-fashion/': 'editorial',
};
const HOME = 'https://beautyandcruor.com/';
const ABOUT = 'https://beautyandcruor.com/about-me/';
/** Blog posts. Their images are published too — they just aren't discipline work. */
const isPost = (url) =>
  /^https:\/\/beautyandcruor\.com\/[a-z0-9-]{20,}\/$/.test(url) && !url.includes('/blogs/');

/** Match one upload across WordPress's several names for it. */
function identity(path) {
  const dir = dirname(path);
  const stem = basename(path)
    .replace(/\.[^.]+$/, '')
    .replace(/-\d+x\d+$/, '')
    .replace(/(-scaled|-rotated)$/, '')
    .toLowerCase();
  return `${dir}/${stem}`;
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

/**
 * Every key this manifest currently uses, mapped to the upload it refers to.
 *
 * Captured BEFORE renumbering, because renumbering reuses key names for
 * different images: after two images moved out of `unpublished`, the key
 * `unpublished/unpublished-059` still existed but pointed at something else
 * entirely. A rewrite that trusts "the key still exists" therefore silently
 * repoints a post at the wrong photograph. Resolve through the upload instead.
 */
const previousKeyToSource = new Map(
  Object.entries(manifest).map(([k, e]) => [k, (e.sourcePath ?? e.src).replace(/\.[^.]+$/, '')])
);
const live = JSON.parse(await readFile(LIVE, 'utf8')).photos;

// Site chrome: anything that appeared on many unrelated pages is furniture
// (the two logos), not portfolio work.
const chrome = new Set(
  Object.entries(live).filter(([, pages]) => pages.length >= 5).map(([rel]) => identity(rel))
);

// identity -> { cats:Set, home:bool, about:bool }
const placement = new Map();
for (const [rel, pages] of Object.entries(live)) {
  const id = identity(rel);
  if (chrome.has(id)) continue;
  const p = placement.get(id) ?? { cats: new Set(), home: false, about: false, post: false };
  for (const page of pages) {
    if (PAGE2CAT[page]) p.cats.add(PAGE2CAT[page]);
    if (page === HOME) p.home = true;
    if (page === ABOUT) p.about = true;
    if (isPost(page)) p.post = true;
  }
  placement.set(id, p);
}

// Assign each manifest entry a single primary category. An image shown on more
// than one discipline page gets the first in this order — deterministic, and
// the duplicate still appears in the other gallery below.
const ORDER = ['sfx', 'casting', 'film', 'editorial'];
const assigned = [];
for (const [key, entry] of Object.entries(manifest)) {
  const id = identity(entry.src);
  const p = placement.get(id);
  const cat = p ? ORDER.find((c) => p.cats.has(c)) : undefined;
  assigned.push({
    key, entry, id, cat,
    home: p?.home ?? false, about: p?.about ?? false, post: p?.post ?? false,
  });
}

// Stable numbering: sort by original path so the mapping is reproducible.
assigned.sort((a, b) => a.entry.src.localeCompare(b.entry.src));

const counters = {};
const renames = [];
const newManifest = {};
const idToNewKey = new Map();

for (const a of assigned) {
  // `journal` = shown on a blog post: published, but not discipline work.
  // `unpublished` = her site never displayed it at all. The distinction
  // matters — assets-sync.mjs refuses the latter, and calling a published
  // image "unpublished" would be wrong in the URL of a live page.
  const cat = a.cat ?? (a.about ? 'artist' : a.post ? 'journal' : 'unpublished');
  counters[cat] = (counters[cat] ?? 0) + 1;
  const newKey = `${cat}/${cat}-${String(counters[cat]).padStart(3, '0')}`;
  idToNewKey.set(a.id, newKey);

  const remap = (variant) => {
    const file = basename(variant.src);
    // `<stem>-<width>.<hash>.<ext>` -> keep width/hash/ext, swap the stem.
    const tail = file.replace(/^.*?-(\d+\.[0-9a-f]{8}\.[a-z]+)$/, '$1');
    const to = `/img/${newKey}-${tail}`;
    if (variant.src !== to) renames.push([`public${variant.src}`, `public${to}`]);
    return { ...variant, src: to };
  };

  newManifest[newKey] = {
    ...a.entry,
    key: newKey,
    /** Original WordPress path. The rights gate and provenance depend on this. */
    sourcePath: a.entry.src,
    avif: a.entry.avif.map(remap),
    webp: a.entry.webp.map(remap),
    fallback: remap(a.entry.fallback),
  };
}

for (const [from, to] of renames) {
  if (!existsSync(from)) continue;
  await mkdir(dirname(to), { recursive: true });
  await rename(from, to);
}

await writeFile(MANIFEST, JSON.stringify(newManifest, null, 0));

const bySource = new Map(
  Object.entries(newManifest).map(([k, e]) => [e.sourcePath.replace(/\.[^.]+$/, ''), k])
);

// Galleries: her page structure decides MEMBERSHIP, curation decides ORDER.
//
// Membership from the live crawl is the rights answer — only images she
// published get in. Order is a separate, human judgement: the old homepage led
// on a behind-the-scenes film-set photo, which is evidence of what was
// published, not of what should open a portfolio aimed at producers.
const curation = JSON.parse(await readFile(CURATION, 'utf8'));
const galleries = { hero: [], sfx: [], casting: [], film: [], editorial: [], artist: [] };

/** A curated sourcePath -> the key it now has, or null if it isn't in the build. */
const curatedKey = (sourcePath) => {
  const direct = bySource.get(sourcePath);
  if (direct) return direct;
  return idToNewKey.get(identity(sourcePath)) ?? null;
};

for (const a of assigned) {
  const nk = idToNewKey.get(a.id);
  const p = placement.get(a.id);
  if (!p) continue;
  for (const c of ORDER) if (p.cats.has(c) && !galleries[c].includes(nk)) galleries[c].push(nk);
}

// Curated leads move to the front of their gallery, in the order given.
for (const [cat, paths] of Object.entries(curation.leads ?? {})) {
  if (!galleries[cat]) continue;
  const lead = [];
  for (const sp of paths.slice().reverse()) {
    const k = curatedKey(sp);
    if (!k) { console.warn(`  WARNING: curated lead "${sp}" (${cat}) is not in the build`); continue; }
    lead.unshift(k);
  }
  galleries[cat] = [...lead, ...galleries[cat].filter((k) => !lead.includes(k))];
}

// The homepage opens on the curated hero, NOT on whatever the old site's
// homepage happened to show.
for (const sp of curation.hero ?? []) {
  const k = curatedKey(sp);
  if (!k) { console.warn(`  WARNING: curated hero "${sp}" is not in the build`); continue; }
  if (!galleries.hero.includes(k)) galleries.hero.push(k);
}

// Per-discipline homepage plate images. Kept separate from `leads` because
// the plate and the gallery's first frame are different jobs: the plate has to
// read at a glance behind a title, the first frame opens a sequence.
galleries.covers = {};
for (const [slug, sp] of Object.entries(curation.covers ?? {})) {
  const k = curatedKey(sp);
  if (!k) { console.warn(`  WARNING: cover "${sp}" (${slug}) is not in the build`); continue; }
  galleries.covers[slug] = k;
}

const artistKey = curation.artist ? curatedKey(curation.artist) : null;
if (artistKey) galleries.artist.push(artistKey);
else for (const a of assigned) {
  const p = placement.get(a.id);
  if (p?.about && !p.cats.size) galleries.artist.push(idToNewKey.get(a.id));
}
await writeFile(GALLERIES, JSON.stringify(galleries, null, 2));

/**
 * MDX posts reference images by literal key, so a reorganise would silently
 * break them — requireImage() throws at build, but only once someone builds.
 * Rewriting them here keeps the rename a single reproducible step.
 */
const postDir = 'src/content/posts';
let rewritten = 0;
for (const file of (await readdir(postDir)).filter((f) => /\.mdx?$/.test(f))) {
  const path = join(postDir, file);
  const body = await readFile(path, 'utf8');
  const next = body.replace(/imageKey="([^"]+)"/g, (whole, key) => {
    // Resolve the key to the upload it MEANT, then to that upload's new key.
    // Never short-circuit on `newManifest[key]` existing — see above.
    const source = previousKeyToSource.get(key) ?? key;
    const mapped = bySource.get(source) ?? idToNewKey.get(identity(source));
    if (!mapped) {
      console.warn(`  WARNING: ${file} references "${key}", which resolves to nothing`);
      return whole;
    }
    return `imageKey="${mapped}"`;
  });
  if (next !== body) { await writeFile(path, next); rewritten++; }
}
if (rewritten) console.log(`rewrote image keys in ${rewritten} post(s)`);

console.log(`renamed ${renames.length} files`);
for (const [c, n] of Object.entries(counters)) console.log(`  ${c.padEnd(12)} ${n}`);
console.log('\ngalleries:');
for (const [k, v] of Object.entries(galleries)) console.log(`  ${k.padEnd(12)} ${v.length}`);
