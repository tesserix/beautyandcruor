import { chromium } from 'playwright';
const P = 'file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/fable-wrapped.html';
const b = await chromium.launch();
const errs = [];
// mobile 390
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p1 = await m.newPage();
p1.on('pageerror', e => errs.push('JS: ' + e.message));
p1.on('console', c => { if (c.type() === 'error') errs.push('console: ' + c.text()); });
await p1.goto(P, { waitUntil: 'load' }); await p1.waitForTimeout(2500);
await p1.screenshot({ path: '/tmp/f-390-home.png' });
await p1.evaluate(() => { location.hash = '#/about-me/'; }); await p1.waitForTimeout(1500);
await p1.screenshot({ path: '/tmp/f-390-about.png', fullPage: false });
await p1.evaluate(() => { const c = document.getElementById('credits'); if (c) c.scrollIntoView(); }); await p1.waitForTimeout(900);
await p1.screenshot({ path: '/tmp/f-390-credits.png' });
await p1.evaluate(() => { location.hash = '#/sfx-prosthetics/'; }); await p1.waitForTimeout(1500);
await p1.screenshot({ path: '/tmp/f-390-sfx.png' });
// desktop
const d = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p2 = await d.newPage();
p2.on('pageerror', e => errs.push('JS(desk): ' + e.message));
await p2.goto(P, { waitUntil: 'load' }); await p2.waitForTimeout(2500);
await p2.screenshot({ path: '/tmp/f-desk-home.png' });
await p2.evaluate(() => { location.hash = '#/about-me/'; }); await p2.waitForTimeout(1500);
await p2.screenshot({ path: '/tmp/f-desk-about.png' });
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
