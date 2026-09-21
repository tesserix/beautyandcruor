/** The desktop home is a JS-driven split slider; step it and capture each state. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await pg.route('**/*', r => /google-analytics|googletagmanager|stats\.wp\.com|pixel\.wp\.com|facebook/.test(r.request().url()) ? r.abort() : r.continue());
await pg.goto('https://beautyandcruor.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.waitForLoadState('load').catch(()=>{});
await pg.waitForTimeout(4500);
mkdirSync('capture/screens/1920-home-split', { recursive: true });

const STATES = 7;
for (let i = 0; i < STATES; i++) {
  if (i > 0) {
    await pg.mouse.move(960, 540);
    await pg.mouse.wheel(0, 1100);
    await pg.waitForTimeout(1600);
  }
  await pg.screenshot({ path: `capture/screens/1920-home-split/state-${i}.png` });
  const at = await pg.evaluate(() => {
    const el = document.querySelector('.mkdf-vss-ms-left');
    return el ? getComputedStyle(el).transform : 'n/a';
  });
  console.log(`state ${i}  left-pane transform: ${at}`);
}
await b.close();
