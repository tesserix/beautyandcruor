import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const pg = await ctx.newPage();
await pg.route('**/*', r => /google-analytics|googletagmanager|stats\.wp\.com|pixel\.wp\.com|facebook/.test(r.request().url()) ? r.abort() : r.continue());
await pg.goto('https://beautyandcruor.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForLoadState('load', { timeout: 45000 }).catch(()=>{});
for (const t of [3000, 3000, 3000]) {
  await pg.waitForTimeout(t);
  const h = await pg.evaluate(() => document.body.scrollHeight);
  console.log('  scrollHeight:', h);
}
await pg.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,200)); }
  window.scrollTo(0, document.body.scrollHeight); await new Promise(r=>setTimeout(r,1500));
  window.scrollTo(0,0); await new Promise(r=>setTimeout(r,800));
});
const h = await pg.evaluate(() => document.body.scrollHeight);
await pg.screenshot({ path: 'capture/screens/1920/home.png', fullPage: true });
console.log('final 1920 home height:', h);
await b.close();
