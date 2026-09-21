import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = new URL('../out/', import.meta.url).pathname;
const TYPES = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.avif':'image/avif', '.webp':'image/webp', '.jpg':'image/jpeg',
  '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json' };

const srv = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, p);
  try {
    const body = await readFile(file);
    const ext = extname(file);
    // gzip the text types, as nginx will
    const gzip = /\.(html|js|css|svg|xml|txt|json)$/.test(file);
    const out = gzip ? gzipSync(body, { level: 6 }) : body;
    res.writeHead(200, {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      ...(gzip ? { 'content-encoding': 'gzip' } : {}),
      'content-length': out.length,
    });
    res.end(out);
  } catch { res.writeHead(404).end('nf'); }
});
await new Promise(r => srv.listen(4321, r));

const b = await chromium.launch();
for (const [label, path] of [['/', '/'], ['/about-me/', '/about-me/'], ['/contact-us/', '/contact-us/']]) {
  const ctx = await b.newContext({ viewport:{width:390,height:844}, isMobile:true });
  const page = await ctx.newPage();
  const seen = new Map();
  page.on('response', async r => {
    try {
      const h = await r.allHeaders();
      const n = parseInt(h['content-length'] ?? '0', 10);
      const t = (h['content-type'] ?? '').split(';')[0];
      if (r.url().startsWith('http://localhost:4321')) seen.set(r.url(), { n, t });
    } catch {}
  });
  await page.goto(`http://localhost:4321${path}`, { waitUntil:'networkidle' });
  const g = {};
  for (const { n, t } of seen.values()) {
    const k = t.includes('javascript') ? 'js' : t.includes('css') ? 'css'
      : t.includes('html') ? 'html' : t.startsWith('image/') ? 'img'
      : t.startsWith('font/') ? 'font' : 'other';
    g[k] = (g[k] ?? 0) + n;
  }
  const tot = Object.values(g).reduce((a,b)=>a+b,0);
  console.log(`${label}`);
  for (const [k,v] of Object.entries(g).sort((a,b)=>b[1]-a[1])) console.log(`    ${k.padEnd(6)} ${(v/1024).toFixed(1)} KB`);
  console.log(`    ${'TOTAL'.padEnd(6)} ${(tot/1024).toFixed(1)} KB over the wire  (js ${(g.js/1024||0).toFixed(1)} KB vs 150 budget)\n`);
  await ctx.close();
}
await b.close(); srv.close();
