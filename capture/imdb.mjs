import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'en-AU',
});
const pg = await ctx.newPage();
const res = await pg.goto('https://www.imdb.com/name/nm12573944/', { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log('status:', res.status());
await pg.waitForTimeout(3500);

const out = await pg.evaluate(() => {
  const txt = s => (document.querySelector(s)?.textContent || '').trim();
  // JSON-LD is the cleanest source when present
  let ld = null;
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try { const j = JSON.parse(s.textContent); if (j['@type'] === 'Person') ld = j; } catch {}
  });
  const credits = [];
  document.querySelectorAll('li.ipc-metadata-list-summary-item').forEach(li => {
    const t = li.querySelector('a.ipc-metadata-list-summary-item__t, .ipc-metadata-list-summary-item__t');
    const y = li.querySelector('.ipc-metadata-list-summary-item__li, span.ipc-metadata-list-summary-item__li');
    if (t) credits.push({ title: t.textContent.trim(), meta: [...li.querySelectorAll('.ipc-metadata-list-summary-item__li')].map(e => e.textContent.trim()) });
  });
  return {
    name: txt('h1') || ld?.name || null,
    jobs: txt('[data-testid="hero__pageTitle"] + *') || null,
    ldName: ld?.name || null,
    ldJob: ld?.jobTitle || null,
    ldDesc: ld?.description || null,
    ldImage: ld?.image || null,
    ldUrl: ld?.url || null,
    creditCount: credits.length,
    credits: credits.slice(0, 40),
    bodyHint: document.body.innerText.slice(0, 700),
  };
});
console.log(JSON.stringify(out, null, 2).slice(0, 4000));
await b.close();
