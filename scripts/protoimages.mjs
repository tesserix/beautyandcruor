/** Emit curated portfolio images as data URIs for the design-direction prototype. */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const SRC = 'capture/assets/uploads';
const idx = JSON.parse(await readFile('capture/contactsheets/index.json', 'utf8'));
const byIndex = Object.fromEntries(idx.map(x => [x.i, x.path]));

// Indices chosen off the contact sheets; grouped by the page each set belongs to.
const SETS = {
  hero:      { w: 820, ids: [265, 263, 266, 264, 269] },
  sfx:       { w: 780, ids: [148, 169, 223, 230, 219, 237, 267, 218] },
  casting:   { w: 780, ids: [167, 76, 211, 250, 259, 210] },
  editorial: { w: 780, ids: [178, 190, 194, 202, 154, 158, 184, 176] },
  film:      { w: 780, ids: [235, 141, 142, 232, 120] },
  beauty:    { w: 780, ids: [45, 62, 159] },
  artist:    { w: 700, ids: [260] },
};

const out = {};
let total = 0;

// Brand mark: dark-ground variants produced by capture/logovariants.mjs.
// Kept as separate keys so the prototype can offer them side by side.
out.logo = {};
for (const [k, p] of [['chalk', 'capture/logo-ondark-chalk.png'], ['green', 'capture/logo-ondark-keepgreen.png']]) {
  const buf = await sharp(p).resize(600, null, { fit: 'contain' }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  out.logo[k] = `data:image/webp;base64,${buf.toString('base64')}`;
  total += buf.length;
  console.log(`logo:${k.padEnd(6)} ${(buf.length / 1024).toFixed(1)}K`);
}

for (const [set, { w, ids }] of Object.entries(SETS)) {
  out[set] = [];
  for (const id of ids) {
    const rel = byIndex[id];
    if (!rel) { console.warn(`no path for index ${id}`); continue; }
    const img = sharp(`${SRC}/${rel}`).rotate();
    const meta = await img.metadata();
    // Portrait-biased crop: the layout is vertical-first, and most sources already are.
    const targetH = Math.round(w * 1.3333);
    const buf = await img
      .resize(w, targetH, { fit: 'cover', position: 'attention' })
      .webp({ quality: 62 })
      .toBuffer();
    total += buf.length;
    out[set].push({
      id,
      src: rel,
      uri: `data:image/webp;base64,${buf.toString('base64')}`,
    });
  }
  console.log(`${set.padEnd(10)} ${out[set].length} images`);
}

await writeFile('capture/proto-images.json', JSON.stringify(out));
console.log(`\ntotal encoded ${(total / 1048576).toFixed(2)} MB (before base64 ~+33%)`);
console.log(`estimated data-URI payload ${(total * 1.34 / 1048576).toFixed(2)} MB`);
