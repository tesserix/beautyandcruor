/** Contact sheets so image selection can be a visual decision, not a guess. */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

const SRC = 'capture/assets/uploads';
const OUT = 'capture/contactsheets';
const COLS = 8, THUMB = 200, PAD = 4, LABEL = 18;

async function* walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const f = join(d, e.name);
    if (e.isDirectory()) yield* walk(f); else yield f;
  }
}

const files = [];
for await (const f of walk(SRC)) {
  if (['.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase())) files.push(f);
}
files.sort();
console.log(`${files.length} stills`);

await mkdir(OUT, { recursive: true });
const PER = COLS * 6; // 48 per sheet

for (let s = 0; s * PER < files.length; s++) {
  const batch = files.slice(s * PER, (s + 1) * PER);
  const rows = Math.ceil(batch.length / COLS);
  const cellW = THUMB + PAD * 2, cellH = THUMB + PAD * 2 + LABEL;

  const composites = [];
  for (let i = 0; i < batch.length; i++) {
    try {
      const buf = await sharp(batch[i]).rotate()
        .resize(THUMB, THUMB, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 72 }).toBuffer();
      const c = i % COLS, r = Math.floor(i / COLS);
      composites.push({ input: buf, left: c * cellW + PAD, top: r * cellH + PAD });
      const idx = s * PER + i;
      const label = `${idx}`;
      const svg = Buffer.from(
        `<svg width="${THUMB}" height="${LABEL}"><rect width="100%" height="100%" fill="#111"/>` +
        `<text x="3" y="13" font-family="monospace" font-size="12" fill="#0f0">${label}</text></svg>`);
      composites.push({ input: svg, left: c * cellW + PAD, top: r * cellH + PAD + THUMB });
    } catch (e) { console.warn('skip', batch[i], e.message); }
  }

  const out = join(OUT, `sheet-${String(s).padStart(2, '0')}.jpg`);
  await sharp({ create: { width: COLS * cellW, height: rows * cellH, channels: 3, background: '#000' } })
    .composite(composites).jpeg({ quality: 78 }).toFile(out);
  console.log(`${out}  (${batch.length} images, indices ${s * PER}-${s * PER + batch.length - 1})`);
}

// index -> path map so picks can be resolved back to files
const { writeFile } = await import('node:fs/promises');
await writeFile(join(OUT, 'index.json'),
  JSON.stringify(files.map((f, i) => ({ i, path: relative(SRC, f) })), null, 2));
console.log(`index -> ${join(OUT, 'index.json')}`);
