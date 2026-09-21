// Deliverable 1: full-height screenshots at 1920 / 768 / 390
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://beautyandcruor.com';
const PAGES = [
  ['home', '/'],
  ['about-me', '/about-me/'],
  ['sfx-prosthetics', '/sfx-prosthetics/'],
  ['film-television', '/film-television/'],
  ['casting-sculpting', '/casting-sculpting/'],
  ['editorial-fashion', '/editorial-fashion/'],
  ['blogs', '/blogs/'],
  ['contact-us', '/contact-us/'],
  ['main-home', '/main-home/'],
  ['post-bridging-the-gap', '/bridging-the-gap-sfx-and-makeup-prosthetics-in-the-indian-film-industry/'],
  ['post-3d-printing', '/3d-printing-the-revolutionary-technology-shaping-art-film-and-medicine/'],
];
// mobile-first: 390 captured first, it is the primary design reference
const VIEWPORTS = [['390', 390, 844], ['768', 768, 1024], ['1920', 1920, 1080]];

// Scroll reveals (waypoints + jquery.appear) leave elements at opacity:0 until scrolled past.
// Walk the full page, let reveals fire and lazy images load, then return to top.
async function primeReveals(page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.7);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 220));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 700));
  });
  // Give stragglers a chance, but never block on an image that will never load.
  await page.evaluate(() => Promise.all(
    Array.from(document.images)
      .filter(i => !i.complete)
      .map(i => Promise.race([
        new Promise(r => { i.onload = i.onerror = r; }),
        new Promise(r => setTimeout(r, 5000)),
      ]))
  ));
}

// Tracking/analytics keep sockets open, so `networkidle` never settles on this
// site. Block them: none of them affect layout.
const BLOCK = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'stats.wp.com', 'pixel.wp.com', 'facebook.net', 'facebook.com',
  'hotjar', 'clarity.ms', 'fullstory',
];

const withTimeout = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} exceeded ${ms}ms`)), ms)),
]);

const browser = await chromium.launch();
const report = [];

for (const [vpName, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: width < 500,
    hasTouch: width < 500,
    userAgent: width < 500
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  mkdirSync(`capture/screens/${vpName}`, { recursive: true });

  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    try {
      await page.route('**/*', (route) => {
        const u = route.request().url();
        return BLOCK.some(b => u.includes(b)) ? route.abort() : route.continue();
      });
      await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Bounded settle rather than networkidle, which never fires here.
      await page.waitForLoadState('load', { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(3000);          // let Slider Revolution lay out
      await withTimeout(primeReveals(page), 90000, 'primeReveals').catch(e =>
        console.warn(`    (${name}: ${e.message}, shooting anyway)`));
      const file = `capture/screens/${vpName}/${name}.png`;
      await page.screenshot({ path: file, fullPage: true, timeout: 60000 });
      const dims = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.body.scrollHeight }));
      report.push({ viewport: vpName, name, path, file, ...dims });
      console.log(`  ${vpName.padEnd(5)} ${name.padEnd(26)} ${dims.w}x${dims.h}`);
    } catch (e) {
      console.error(`  ${vpName} ${name} FAILED: ${e.message}`);
      report.push({ viewport: vpName, name, path, error: e.message });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync('capture/screens/report.json', JSON.stringify(report, null, 2));
console.log(`\n${report.filter(r => !r.error).length}/${report.length} screenshots captured`);
