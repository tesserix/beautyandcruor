import { chromium } from 'playwright';
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await pg.route('**/*', r => /google-analytics|googletagmanager|stats\.wp\.com|pixel\.wp\.com|facebook/.test(r.request().url()) ? r.abort() : r.continue());
await pg.goto('https://beautyandcruor.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForLoadState('load').catch(()=>{});
await pg.waitForTimeout(4000);
const info = await pg.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 200 && el.clientHeight > 300) {
      out.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,3).join('.') : ''),
        scrollH: el.scrollHeight, clientH: el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
      });
    }
  });
  return { docEl: document.documentElement.scrollHeight, body: document.body.scrollHeight, candidates: out.slice(0, 12) };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
