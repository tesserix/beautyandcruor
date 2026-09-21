// Deliverable 4: sitemap URL list + per-page title tag & meta description
import { writeFileSync } from 'node:fs';

const ORIGIN = 'https://beautyandcruor.com';
const SITEMAPS = ['post','page','portfolio-item','category','portfolio-category','portfolio-tag','testimonials-category'];

const locs = new Map(); // url -> sitemap it came from
for (const s of SITEMAPS) {
  const xml = await (await fetch(`${ORIGIN}/${s}-sitemap.xml`)).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) locs.set(m[1], s);
}

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g,' ');

const rows = [];
for (const [url, sitemap] of locs) {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const grab = (re) => { const m = html.match(re); return m ? decode(m[1]).trim() : null; };
  rows.push({
    url,
    sitemap,
    status: res.status,
    finalUrl: res.url,
    redirected: res.url !== url,
    title: grab(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: grab(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i),
    ogTitle: grab(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']/i),
    ogDescription: grab(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/i),
    ogImage: grab(/<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/i),
    canonical: grab(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i),
    robots: grab(/<meta\s+name=["']robots["']\s+content=["']([\s\S]*?)["']/i),
  });
  process.stdout.write('.');
}
console.log();

writeFileSync('capture/meta/seo-inventory.json', JSON.stringify(rows, null, 2));
writeFileSync('capture/meta/urls.txt', rows.map(r => r.url).join('\n') + '\n');

const missing = rows.filter(r => !r.description).length;
console.log(`${rows.length} URLs captured -> capture/meta/seo-inventory.json`);
console.log(`${missing} of ${rows.length} have NO meta description`);
console.log(`${rows.filter(r => r.redirected).length} redirect`);
