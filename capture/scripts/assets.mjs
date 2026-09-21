// Deliverable 3: pull ORIGINALS from /wp-content/uploads via wp-json media (source_url = original, not a derivative)
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

const ORIGIN = 'https://beautyandcruor.com';
const OUT = 'capture/assets/uploads';

let page = 1, all = [];
for (;;) {
  const res = await fetch(`${ORIGIN}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=id,source_url,mime_type,media_details,alt_text,title,date`);
  if (!res.ok) break;
  const batch = await res.json();
  if (!batch.length) break;
  all.push(...batch);
  const total = +res.headers.get('x-wp-totalpages') || 1;
  if (page++ >= total) break;
}
console.log(`media library: ${all.length} items`);

const manifest = [];
let ok = 0, skip = 0, fail = 0;

for (const m of all) {
  const url = m.source_url;
  if (!url?.includes('/wp-content/uploads/')) { skip++; continue; }
  const rel = url.split('/wp-content/uploads/')[1];
  const dest = `${OUT}/${rel}`;
  const entry = {
    id: m.id, url, rel, mime: m.mime_type,
    alt: m.alt_text || '', title: m.title?.rendered || '', date: m.date,
    width: m.media_details?.width ?? null, height: m.media_details?.height ?? null,
    filesize: m.media_details?.filesize ?? null,
  };
  if (existsSync(dest) && statSync(dest).size > 0) { entry.bytes = statSync(dest).size; manifest.push(entry); ok++; continue; }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    entry.bytes = buf.length;
    manifest.push(entry);
    ok++;
  } catch (e) { fail++; console.error(`FAIL ${url}: ${e.message}`); }
  if ((ok + fail) % 25 === 0) process.stdout.write(`\r  ${ok + fail}/${all.length}`);
}
console.log();
writeFileSync('capture/assets/manifest.json', JSON.stringify(manifest, null, 2));
const bytes = manifest.reduce((a, b) => a + (b.bytes || 0), 0);
console.log(`downloaded ${ok}, skipped ${skip}, failed ${fail}`);
console.log(`total ${(bytes / 1048576).toFixed(1)} MB -> ${OUT}`);
const noAlt = manifest.filter(m => !m.alt).length;
console.log(`${noAlt}/${manifest.length} images have NO alt text (needed for the a11y=100 target)`);
